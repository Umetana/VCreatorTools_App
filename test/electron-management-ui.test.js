"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Electron exposes only fixed-host settings and scoped management actions", () => {
  const main = read("electron/main.js");
  const preload = read("electron/preload.js");
  assert.match(main, /mainHost: "127\.0\.0\.1"/);
  assert.match(main, /remoteHost: "0\.0\.0\.0"/);
  assert.match(main, /url\.origin !== mainBaseUrl\(\)/);
  assert.match(main, /"X-VCT-Admin-Token": adminToken/);
  assert.match(main, /VCT_USER_GADGETS_DIR: current\.userGadgetsDir/);
  for (const channel of ["gadgets:list", "gadget:copy", "gadget:open", "remote:status", "remote:pairing-regenerate", "remote:sessions-revoke-all", "remote:qr"]) {
    assert.match(main, new RegExp(`ipcMain\\.handle\\("${channel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.doesNotMatch(preload, /openExternal/);
  assert.match(preload, /copyGadgetUrl/);
  assert.match(preload, /regeneratePairing/);
  assert.match(main, /ipcMain\.handle\("user-gadget:install-sample"/);
  assert.match(main, /if \(fs\.existsSync\(destination\)\) throw/);
  assert.match(main, /force: false, errorOnExist: true/);
  assert.match(preload, /installUserGadgetSample/);
  assert.match(main, /managedCoreSourceDir/);
  assert.match(main, /resolveDataLocation/);
  assert.match(main, /dataMode: dataLocation\.mode/);
  assert.match(main, /path\.join\(current\.userGadgetsDir, "_vct_core"\)/);
  assert.match(main, /fs\.realpathSync\(managedCoreDestination\)/);
  assert.match(main, /ipcMain\.handle\("user-gadget:install-gp-counter-display"/);
  assert.match(preload, /installGpCounterDisplay/);
  assert.match(main, /app\.requestSingleInstanceLock\(\)/);
  assert.match(main, /app\.on\("second-instance"/);
  assert.match(main, /checkPortAvailable/);
  assert.match(main, /netstat\.exe/);
  assert.match(main, /waitForServerReady/);
  assert.match(main, /automationTokenFile/);
  assert.match(main, /VCT_AUTOMATION_TOKEN: automationToken\(\)/);
  for (const channel of ["automation:status", "automation:copy-token", "automation:regenerate-token"]) assert.match(main, new RegExp(`ipcMain\\.handle\\("${channel}`));
  assert.match(preload, /copyAutomationToken/);
});

test("management renderer contains Remote and manifest-driven gadget controls", () => {
  const html = read("renderer/index.html");
  const app = read("renderer/app.js");
  for (const id of ["remote-content", "pairing-regenerate", "sessions-revoke", "automation-state", "automation-copy", "automation-regenerate", "gadgets", "user-gadgets", "gadgets-refresh", "install-user-sample", "install-gp-display", "user-sample-result"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(app, /window\.vct\.listGadgets\(\)/);
  assert.match(app, /page\.urls\[mode\]/);
  assert.match(app, /page\.urlParameter === "counterId"/);
  assert.match(app, /result\.searchParams\.set\("id", counterId\)/);
  assert.match(app, /任意の番号/);
  assert.doesNotMatch(app, /element\("datalist"\)/);
  assert.match(app, /window\.vct\.remoteQr\(index\)/);
  assert.match(app, /gadgets\.filter\(\(gadget\) => gadget\.root === "user_gadgets"\)/);
  assert.match(app, /gadgets\.filter\(\(gadget\) => gadget\.root !== "user_gadgets"\)/);
  assert.match(app, /renderGadgets\(userContainer, userGadgets/);
  assert.match(app, /confirm\("すべてのRemote端末をログアウトしますか？"\)/);
  assert.match(app, /if \(!await refresh\(\)\)/);
  assert.match(app, /if \(forceGadgets \|\| !gadgetsLoaded\) await refreshGadgets\(\)/);
  assert.doesNotMatch(app, /^refreshRemote\(\);$/m);
  assert.doesNotMatch(app, /^refreshGadgets\(\);$/m);
  assert.match(app, /window\.vct\.installUserGadgetSample\(\)/);
  assert.match(app, /window\.vct\.installGpCounterDisplay\(\)/);
  assert.match(app, /"データモード"/);
  assert.match(app, /"データ保存先"/);
  assert.match(app, /エラー: server\.error/);
  assert.match(app, /info\.server\.state === "running" && health\?\.ok === true/);
  assert.match(app, /window\.vct\.copyAutomationToken\(\)/);
  assert.match(app, /window\.vct\.regenerateAutomationToken\(\)/);
});
