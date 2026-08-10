"use strict";

const badge = document.getElementById("badge");
const status = document.getElementById("status");
const log = document.getElementById("log");
const qrCache = new Map();
let serverConnected = false;
let gadgetsLoaded = false;
let refreshCycleRunning = false;

function showStatus(server, health) {
  const state = health?.ok ? "running" : server.state;
  badge.textContent = state === "running" ? "● 稼働中" : state === "starting" ? "起動中" : "停止中";
  badge.className = state;
  const rows = { App: "0.1.0-dev", Server: health?.version || "-", 待受: health ? `${health.host}:${health.port}` : "-", PID: server.pid || "-", WebSocket: health?.websocketClients ?? "-", Remote: health?.features?.remote?.state || "-" };
  status.innerHTML = Object.entries(rows).map(([key,value]) => `<dt>${key}</dt><dd>${value}</dd>`).join("");
}

async function refresh() {
  const [info, health] = await Promise.all([window.vct.info(), window.vct.health()]);
  document.getElementById("version").textContent = info.version;
  showStatus(info.server, health);
  serverConnected = health?.ok === true;
  return serverConnected;
}

async function loadSettings() {
  const settings = await window.vct.getSettings();
  document.getElementById("main-port").value = settings.mainPort;
  document.getElementById("remote-enabled").checked = settings.remoteEnabled;
  document.getElementById("remote-port").value = settings.remotePort;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function refreshRemote() {
  const state = document.getElementById("remote-state");
  const content = document.getElementById("remote-content");
  try {
    const result = await window.vct.remoteStatus();
    const remote = result.remote;
    const pairing = result.pairing;
    state.textContent = remote.enabled ? (remote.state === "listening" ? "● LAN待受中" : remote.state) : "無効";
    state.className = remote.state === "listening" ? "success" : "note";
    content.replaceChildren();
    document.getElementById("pairing-regenerate").disabled = !remote.enabled;
    document.getElementById("sessions-revoke").disabled = !remote.enabled || pairing.sessions.length === 0;
    const info = element("p", "note", `Session: ${pairing.sessions.length}台 / Pairing code: `);
    info.append(element("strong", pairing.active ? "pairing" : "", pairing.active ? pairing.code : "未発行"));
    content.append(info);
    if (!remote.enabled) content.append(element("p", "note", "接続設定でRemoteを有効にするとURLとQRを表示します。"));
    const grid = element("div", "remote-grid");
    for (const [index, url] of remote.urls.entries()) {
      const card = element("div", "remote-qr");
      const image = element("img");
      image.alt = "Remote URL QR";
      if (!qrCache.has(url)) qrCache.set(url, await window.vct.remoteQr(index));
      image.src = qrCache.get(url);
      card.append(image, element("small", "", url));
      grid.append(card);
    }
    content.append(grid);
  } catch {
    state.textContent = "Server未接続";
    state.className = "error";
    content.replaceChildren(element("p", "note", "Server起動後にRemote情報を表示します。"));
  }
}

function renderGadgets(container, gadgets, emptyMessage) {
  container.replaceChildren();
  if (!gadgets.length) {
    container.append(element("p", "note", emptyMessage));
    return;
  }
  for (const gadget of gadgets) {
    const details = element("details", "gadget");
    const summary = element("summary");
    const category = gadget.root === "vct_web_app" ? "Web App" : gadget.root === "V_CreatorTools" ? "Gadget" : "User";
    summary.append(element("span", "role", category), element("strong", "", gadget.rawName), element("span", "gadget-meta", `  v${gadget.version || "-"} / ${gadget.status || "-"}`));
    details.append(summary);
    for (const page of gadget.pages) {
      const pageElement = element("div", "page");
      const title = element("div", "page-title");
      title.append(element("strong", "", page.name), element("span", "role", page.role));
      if (page.obs) title.append(element("span", "mode", "OBS"));
      pageElement.append(title);
      for (const mode of page.modes) {
        const url = page.urls[mode];
        const row = element("div", "url-row");
        row.append(element("span", "mode", mode), element("code", "", url));
        const copy = element("button", "", "URLコピー");
        copy.onclick = async () => { await window.vct.copyGadgetUrl(url); copy.textContent = "コピー済み"; setTimeout(() => { copy.textContent = "URLコピー"; }, 1200); };
        const open = element("button", "", "開く");
        open.onclick = () => window.vct.openGadgetUrl(url);
        row.append(copy, open);
        pageElement.append(row);
      }
      details.append(pageElement);
    }
    container.append(details);
  }
}

async function refreshGadgets() {
  const officialContainer = document.getElementById("gadgets");
  const userContainer = document.getElementById("user-gadgets");
  officialContainer.replaceChildren(element("p", "note", "取得中…"));
  userContainer.replaceChildren(element("p", "note", "取得中…"));
  try {
    const gadgets = await window.vct.listGadgets();
    const userGadgets = gadgets.filter((gadget) => gadget.root === "user_gadgets");
    const officialGadgets = gadgets.filter((gadget) => gadget.root !== "user_gadgets");
    renderGadgets(officialContainer, officialGadgets, "公式ツールはありません。");
    renderGadgets(userContainer, userGadgets, "ユーザーガジェットはまだ追加されていません。");
    gadgetsLoaded = true;
  } catch {
    gadgetsLoaded = false;
    const message = element("p", "error", "ガジェット一覧を取得できません。Serverを起動してください。");
    officialContainer.replaceChildren(message);
    userContainer.replaceChildren(message.cloneNode(true));
  }
}

function showDisconnectedManagement() {
  const state = document.getElementById("remote-state");
  state.textContent = "Server未接続";
  state.className = "note";
  document.getElementById("remote-content").replaceChildren(element("p", "note", "Server起動後にRemote情報を自動表示します。"));
  document.getElementById("pairing-regenerate").disabled = true;
  document.getElementById("sessions-revoke").disabled = true;
  if (!gadgetsLoaded) {
    const message = element("p", "note", "Server起動後に一覧を自動取得します。");
    document.getElementById("gadgets").replaceChildren(message);
    document.getElementById("user-gadgets").replaceChildren(message.cloneNode(true));
  }
}

async function refreshCycle(forceGadgets = false) {
  if (refreshCycleRunning) return;
  refreshCycleRunning = true;
  try {
    if (!await refresh()) {
      showDisconnectedManagement();
      return;
    }
    await refreshRemote();
    if (forceGadgets || !gadgetsLoaded) await refreshGadgets();
  } finally {
    refreshCycleRunning = false;
  }
}

document.getElementById("start").onclick = async () => { await window.vct.startServer(); setTimeout(() => refreshCycle(true), 500); };
document.getElementById("stop").onclick = async () => { await window.vct.stopServer(); gadgetsLoaded = false; refreshCycle(); };
document.getElementById("home").onclick = () => window.vct.openServerPage("home");
document.getElementById("admin").onclick = () => window.vct.openServerPage("admin");
document.getElementById("settings").onsubmit = async (event) => {
  event.preventDefault();
  const result = document.getElementById("settings-result");
  result.className = "";
  result.textContent = "保存中…";
  try {
    await window.vct.saveSettings({ mainPort: Number(document.getElementById("main-port").value), remoteEnabled: document.getElementById("remote-enabled").checked, remotePort: Number(document.getElementById("remote-port").value) });
    result.className = "success";
    result.textContent = "保存して再起動しました";
    serverConnected = false;
    gadgetsLoaded = false;
    setTimeout(() => refreshCycle(true), 700);
  } catch (error) {
    result.className = "error";
    result.textContent = error.message;
  }
};
document.getElementById("gadgets-refresh").onclick = () => refreshCycle(true);
document.getElementById("pairing-regenerate").onclick = async () => {
  const result = document.getElementById("remote-result");
  try { await window.vct.regeneratePairing(); result.className = "success"; result.textContent = "Pairing codeを再生成しました"; await refreshRemote(); }
  catch (error) { result.className = "error"; result.textContent = error.message; }
};
document.getElementById("sessions-revoke").onclick = async () => {
  if (!confirm("すべてのRemote端末をログアウトしますか？")) return;
  const result = document.getElementById("remote-result");
  try { await window.vct.revokeRemoteSessions(); result.className = "success"; result.textContent = "全Sessionを破棄しました"; await refreshRemote(); }
  catch (error) { result.className = "error"; result.textContent = error.message; }
};
document.querySelectorAll("[data-path]").forEach((button) => { button.onclick = () => window.vct.openPath(button.dataset.path); });
document.getElementById("install-user-sample").onclick = async () => {
  const result = document.getElementById("user-sample-result");
  result.className = "";
  result.textContent = "追加中…";
  try {
    await window.vct.installUserGadgetSample();
    result.className = "success";
    result.textContent = "追加しました";
    gadgetsLoaded = false;
    await refreshCycle(true);
  } catch (error) {
    result.className = "error";
    result.textContent = error.message;
  }
};
window.vct.onStatus(() => refreshCycle());
window.vct.onLog((line) => { log.textContent += line; log.scrollTop = log.scrollHeight; });
loadSettings();
refreshCycle();
setInterval(refreshCycle, 3000);
