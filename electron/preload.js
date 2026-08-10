"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vct", {
  info: () => ipcRenderer.invoke("app:info"),
  startServer: () => ipcRenderer.invoke("server:start"),
  stopServer: () => ipcRenderer.invoke("server:stop"),
  health: () => ipcRenderer.invoke("server:health"),
  openExternal: (url) => ipcRenderer.invoke("open:external", url),
  openPath: (name) => ipcRenderer.invoke("open:path", name),
  onStatus: (callback) => ipcRenderer.on("server:status", (_event, value) => callback(value)),
  onLog: (callback) => ipcRenderer.on("server:log", (_event, value) => callback(value))
});
