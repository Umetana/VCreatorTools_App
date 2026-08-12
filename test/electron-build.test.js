"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("Electron build includes Server, public tools and user gadget templates", () => {
  const packageDocument = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(packageDocument.build.appId, "jp.vcreatortools.app");
  assert.equal(packageDocument.author, "Umetana / VCreatorTools");
  assert.equal(packageDocument.build.asar, true);
  assert.ok(packageDocument.build.files.includes("build/**/*"));
  assert.ok(packageDocument.build.files.includes("AUTOMATION_API.md"));
  for (const required of ["server/**/*", "public/**/*", "templates/**/*"]) {
    assert.ok(packageDocument.build.files.includes(required));
    assert.ok(packageDocument.build.asarUnpack.includes(required));
  }
  assert.equal(packageDocument.build.nsis.oneClick, false);
  assert.equal(packageDocument.build.nsis.allowToChangeInstallationDirectory, true);
});

test("Windows distribution uses the VCreatorTools application icon", () => {
  const packageDocument = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
  assert.equal(packageDocument.build.win.icon, "build/icon.ico");
  assert.match(main, /icon: path\.join\(app\.getAppPath\(\), "build", "icon\.ico"\)/);
  assert.ok(fs.statSync(path.join(root, "build", "icon.ico")).size > 0);
});

test("packaged runtime separates the ASAR Server entry from unpacked static resources", () => {
  const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
  assert.match(main, /const unpackedResources = app\.isPackaged \? `\$\{appRoot\}\.unpacked` : appRoot/);
  assert.match(main, /serverEntry: path\.join\(appRoot, "server", "server\.js"\)/);
  assert.match(main, /publicDir: path\.join\(unpackedResources, "public"\)/);
  assert.match(main, /managedCoreSourceDir: path\.join\(unpackedResources/);
});

test("packaged smoke test can use an isolated port", () => {
  const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
  assert.match(main, /process\.env\.VCT_SMOKE_PORT/);
  assert.match(main, /PORT: process\.argv\.includes\("--smoke-test"\)/);
});

test("portable packaging adds a marker without changing win-unpacked", () => {
  const packageDocument = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const script = fs.readFileSync(path.join(root, "scripts", "package-electron-portable.ps1"), "utf8");
  assert.match(packageDocument.scripts["dist:portable"], /package-electron-portable\.ps1/);
  assert.match(script, /Copy-Item -LiteralPath \$source -Destination \$stage -Recurse/);
  assert.match(script, /portable\.json\.example/);
  assert.doesNotMatch(script, /Destination \(Join-Path \$source "portable\.json"\)/);
});
