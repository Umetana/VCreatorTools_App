"use strict";

const { app, BrowserWindow, clipboard, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const APP_VERSION = "0.1.0-dev";
let mainWindow = null;
let serverProcess = null;
let serverStatus = { state: "stopped", pid: null, error: null };

function paths() {
  const appRoot = app.getAppPath();
  const resources = app.isPackaged ? process.resourcesPath : appRoot;
  const userData = app.getPath("userData");
  return {
    appRoot,
    userData,
    serverEntry: path.join(resources, "server", "server.js"),
    publicDir: path.join(resources, "public"),
    configFile: path.join(userData, "server.config.json"),
    dataDir: path.join(userData, "data"),
    logsDir: path.join(userData, "logs"),
    userGadgetsDir: path.join(userData, "user_gadgets")
  };
}

function ensureRuntime() {
  const current = paths();
  for (const directory of [current.userData, current.dataDir, current.logsDir, current.userGadgetsDir]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  if (!fs.existsSync(current.configFile)) {
    const config = {
      host: "127.0.0.1",
      port: 3000,
      bodyLimit: "256kb",
      publicDir: current.publicDir,
      materialDataFile: path.join(current.dataDir, "material-view.json"),
      gpCounterDataFile: path.join(current.dataDir, "gp-counter.json"),
      gpCounterV2DataFile: path.join(current.dataDir, "gp-counter-v2.json"),
      maroV2DataFile: path.join(current.dataDir, "maro-v2.json"),
      remote: {
        enabled: false,
        host: "0.0.0.0",
        port: 3010,
        pairingRequired: true,
        sessionDays: 30,
        sessionFile: path.join(current.dataDir, "remote-sessions.json"),
        effectCatalogFile: path.join(current.dataDir, "remote-effects.json")
      },
      logging: { directory: current.logsDir, maxBytes: 1048576, keepFiles: 14 }
    };
    fs.writeFileSync(current.configFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }
  return current;
}

function readConfig() {
  const current = ensureRuntime();
  return JSON.parse(fs.readFileSync(current.configFile, "utf8"));
}

function publicSettings(config = readConfig()) {
  return { mainHost: "127.0.0.1", mainPort: Number(config.port || 3000), remoteEnabled: config.remote?.enabled === true, remoteHost: "0.0.0.0", remotePort: Number(config.remote?.port || 3010) };
}

function normalizePort(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`${name}は1024〜65535で指定してください`);
  return port;
}

async function saveSettings(value) {
  const mainPort = normalizePort(value?.mainPort, "Main Port");
  const remotePort = normalizePort(value?.remotePort, "Remote Port");
  const remoteEnabled = value?.remoteEnabled === true;
  if (remoteEnabled && mainPort === remotePort) throw new Error("Main PortとRemote Portは別の番号にしてください");
  const current = paths();
  const config = readConfig();
  config.host = "127.0.0.1";
  config.port = mainPort;
  config.publicDir = current.publicDir;
  config.remote = { ...(config.remote || {}), enabled: remoteEnabled, host: "0.0.0.0", port: remotePort };
  await stopServer();
  fs.writeFileSync(current.configFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  startServer();
  return publicSettings(config);
}

function mainBaseUrl() {
  return `http://127.0.0.1:${publicSettings().mainPort}`;
}

async function serverJson(pathname, options = {}) {
  const response = await fetch(`${mainBaseUrl()}${pathname}`, { ...options, signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`Server API error: ${response.status}`);
  return response.json();
}

function validatedServerUrl(value) {
  const url = new URL(String(value));
  if (url.origin !== mainBaseUrl()) throw new Error("Server外のURLは操作できません");
  return url.toString();
}

function publishStatus() {
  mainWindow?.webContents.send("server:status", serverStatus);
}

function appendAppLog(value) {
  const line = String(value);
  fs.appendFileSync(path.join(paths().logsDir, "electron-app.log"), line, "utf8");
  mainWindow?.webContents.send("server:log", line);
}

function startServer() {
  if (serverProcess) return serverStatus;
  const current = ensureRuntime();
  serverStatus = { state: "starting", pid: null, error: null };
  publishStatus();
  serverProcess = spawn(process.execPath, [current.serverEntry], {
    cwd: current.userData,
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", VCT_CONFIG_FILE: current.configFile },
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverStatus = { state: "running", pid: serverProcess.pid, error: null };
  serverProcess.stdout.on("data", (chunk) => appendAppLog(chunk));
  serverProcess.stderr.on("data", (chunk) => appendAppLog(chunk));
  serverProcess.once("error", (error) => appendAppLog(`${new Date().toISOString()} spawn error: ${error.stack || error}\n`));
  serverProcess.once("exit", (code, signal) => {
    serverProcess = null;
    serverStatus = { state: "stopped", pid: null, error: code && !signal ? `exit ${code}` : null };
    publishStatus();
  });
  publishStatus();
  return serverStatus;
}

async function stopServer() {
  if (!serverProcess) return serverStatus;
  const child = serverProcess;
  serverStatus = { ...serverStatus, state: "stopping" };
  publishStatus();
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => { if (serverProcess === child) child.kill(); resolve(); }, 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
  return serverStatus;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 760,
    minHeight: 520,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
}

async function runSmokeTest() {
  startServer();
  const baseUrl = mainBaseUrl();
  let health = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    health = await fetch(`${baseUrl}/health`).then((response) => response.json()).catch(() => null);
    if (health?.ok) break;
  }
  if (!health?.ok) throw new Error("embedded server did not become healthy");
  const gadgets = await fetch(`${baseUrl}/api/get-gadgets`).then((response) => response.json());
  console.log(JSON.stringify({ ok: true, appVersion: APP_VERSION, serverVersion: health.version, gadgets: gadgets.length }));
  await stopServer();
}

ipcMain.handle("app:info", () => ({ version: APP_VERSION, ...paths(), server: serverStatus }));
ipcMain.handle("settings:get", () => publicSettings());
ipcMain.handle("settings:save", (_event, value) => saveSettings(value));
ipcMain.handle("gadgets:list", () => serverJson("/api/get-gadgets"));
ipcMain.handle("gadget:copy", (_event, url) => { clipboard.writeText(validatedServerUrl(url)); return true; });
ipcMain.handle("gadget:open", (_event, url) => shell.openExternal(validatedServerUrl(url)));
ipcMain.handle("remote:status", () => serverJson("/api/remote/status"));
ipcMain.handle("remote:pairing-regenerate", () => serverJson("/api/remote/pairing/regenerate", { method: "POST" }));
ipcMain.handle("remote:sessions-revoke-all", () => serverJson("/api/remote/sessions/revoke-all", { method: "POST" }));
ipcMain.handle("remote:qr", async (_event, index) => {
  if (!Number.isInteger(index) || index < 0 || index > 16) throw new Error("QR indexが不正です");
  const response = await fetch(`${mainBaseUrl()}/api/remote/qr?index=${index}`, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`QR取得エラー: ${response.status}`);
  return `data:image/svg+xml;base64,${Buffer.from(await response.text()).toString("base64")}`;
});
ipcMain.handle("server:start", () => startServer());
ipcMain.handle("server:stop", () => stopServer());
ipcMain.handle("server:health", async () => {
  try {
    const response = await fetch(`${mainBaseUrl()}/health`, { signal: AbortSignal.timeout(1500) });
    return await response.json();
  } catch { return null; }
});
ipcMain.handle("open:server-page", (_event, page) => shell.openExternal(`${mainBaseUrl()}${page === "admin" ? "/admin" : "/"}`));
ipcMain.handle("open:path", (_event, target) => shell.openPath(paths()[target]));

app.whenReady().then(async () => {
  ensureRuntime();
  if (process.argv.includes("--smoke-test")) {
    try { await runSmokeTest(); app.quit(); }
    catch (error) { console.error(error); process.exitCode = 1; app.quit(); }
    return;
  }
  createWindow();
  startServer();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
app.on("before-quit", (event) => {
  if (!serverProcess) return;
  event.preventDefault();
  stopServer().finally(() => app.quit());
});
