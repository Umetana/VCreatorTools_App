"use strict";

const badge = document.getElementById("badge");
const status = document.getElementById("status");
const log = document.getElementById("log");

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
}

async function loadSettings() {
  const settings = await window.vct.getSettings();
  document.getElementById("main-port").value = settings.mainPort;
  document.getElementById("remote-enabled").checked = settings.remoteEnabled;
  document.getElementById("remote-port").value = settings.remotePort;
}

document.getElementById("start").onclick = async () => { await window.vct.startServer(); setTimeout(refresh, 500); };
document.getElementById("stop").onclick = async () => { await window.vct.stopServer(); refresh(); };
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
    setTimeout(refresh, 500);
  } catch (error) {
    result.className = "error";
    result.textContent = error.message;
  }
};
document.querySelectorAll("[data-path]").forEach((button) => { button.onclick = () => window.vct.openPath(button.dataset.path); });
window.vct.onStatus(() => refresh());
window.vct.onLog((line) => { log.textContent += line; log.scrollTop = log.scrollHeight; });
refresh();
loadSettings();
setInterval(refresh, 3000);
