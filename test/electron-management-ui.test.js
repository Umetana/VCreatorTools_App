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
});

test("management renderer contains Remote and manifest-driven gadget controls", () => {
  const html = read("renderer/index.html");
  const app = read("renderer/app.js");
  for (const id of ["remote-content", "pairing-regenerate", "sessions-revoke", "gadgets", "gadgets-refresh", "install-user-sample", "user-sample-result"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(app, /window\.vct\.listGadgets\(\)/);
  assert.match(app, /page\.urls\[mode\]/);
  assert.match(app, /window\.vct\.remoteQr\(index\)/);
  assert.match(app, /gadget\.root === "user_gadgets" \? "User"/);
  assert.match(app, /confirm\("すべてのRemote端末をログアウトしますか？"\)/);
  assert.match(app, /if \(!await refresh\(\)\)/);
  assert.match(app, /if \(forceGadgets \|\| !gadgetsLoaded\) await refreshGadgets\(\)/);
  assert.doesNotMatch(app, /^refreshRemote\(\);$/m);
  assert.doesNotMatch(app, /^refreshGadgets\(\);$/m);
  assert.match(app, /window\.vct\.installUserGadgetSample\(\)/);
});
