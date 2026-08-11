"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { resolveDataLocation } = require("../electron/data-location");

test("installed mode uses Electron userData when no portable marker exists", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "vct-location-"));
  try {
    const result = resolveDataLocation({ isPackaged: true, executablePath: path.join(temporary, "app", "VCreatorTools.exe"), appPath: temporary, userDataPath: path.join(temporary, "roaming"), env: {} });
    assert.equal(result.mode, "installed");
    assert.equal(result.root, path.join(temporary, "roaming"));
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});

test("portable marker keeps application data beside the executable", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "vct-location-"));
  try {
    const application = path.join(temporary, "app");
    fs.mkdirSync(application);
    fs.writeFileSync(path.join(application, "portable.json"), "{}");
    const result = resolveDataLocation({ isPackaged: true, executablePath: path.join(application, "VCreatorTools.exe"), appPath: temporary, userDataPath: path.join(temporary, "roaming"), env: {} });
    assert.equal(result.mode, "portable");
    assert.equal(result.root, application);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});

test("explicit portable root supports development and packaged launcher environments", () => {
  const result = resolveDataLocation({ isPackaged: false, executablePath: "C:/Electron/electron.exe", appPath: "D:/project", userDataPath: "C:/profile", env: { VCT_PORTABLE_ROOT: "D:/portable-vct" } });
  assert.equal(result.mode, "portable");
  assert.equal(result.root, path.resolve("D:/portable-vct"));
});
