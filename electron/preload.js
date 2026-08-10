"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vct", {
  info: () => ipcRenderer.invoke("app:info"),
  startServer: () => ipcRenderer.invoke("server:start"),
  stopServer: () => ipcRenderer.invoke("server:stop"),
  health: () => ipcRenderer.invoke("server:health"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (value) => ipcRenderer.invoke("settings:save", value),
  openServerPage: (page) => ipcRenderer.invoke("open:server-page", page),
  listGadgets: () => ipcRenderer.invoke("gadgets:list"),
  copyGadgetUrl: (url) => ipcRenderer.invoke("gadget:copy", url),
  openGadgetUrl: (url) => ipcRenderer.invoke("gadget:open", url),
  remoteStatus: () => ipcRenderer.invoke("remote:status"),
  regeneratePairing: () => ipcRenderer.invoke("remote:pairing-regenerate"),
  revokeRemoteSessions: () => ipcRenderer.invoke("remote:sessions-revoke-all"),
  remoteQr: (index) => ipcRenderer.invoke("remote:qr", index),
  openPath: (name) => ipcRenderer.invoke("open:path", name),
  installUserGadgetSample: () => ipcRenderer.invoke("user-gadget:install-sample"),
  onStatus: (callback) => ipcRenderer.on("server:status", (_event, value) => callback(value)),
  onLog: (callback) => ipcRenderer.on("server:log", (_event, value) => callback(value))
});
