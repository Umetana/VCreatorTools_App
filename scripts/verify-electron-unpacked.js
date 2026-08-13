"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const asar = require("@electron/asar");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist", "electron", "win-unpacked");
const archive = path.join(output, "resources", "app.asar");
const unpacked = path.join(output, "resources", "app.asar.unpacked");

assert.ok(fs.existsSync(path.join(output, "VCreatorTools.exe")), "VCreatorTools.exe is missing");
assert.ok(fs.existsSync(archive), "app.asar is missing");

const files = asar.listPackage(archive).map(file => file.replace(/\\/g, "/"));
for (const required of [
  "/README.md",
  "/USER_GUIDE.md",
  "/THIRD_PARTY_NOTICES.md",
  "/THIRD_PARTY_LICENSES.txt",
  "/server/server.js",
  "/templates/user-gadget-basic/manifest.json",
]) assert.ok(files.includes(required), `ASAR file is missing: ${required}`);

for (const required of [
  "server/server.js",
  "public/index.html",
  "public/V_CreatorTools/_vct_core/runtime/v1/vct-runtime.js",
  "templates/user-gadget-basic/manifest.json",
]) assert.ok(fs.existsSync(path.join(unpacked, ...required.split("/"))), `unpacked file is missing: ${required}`);

for (const forbidden of [
  "FUTURE_EFFECT_CANDIDATES.md",
  "FUTURE_MULTI_HOST_PLUGIN_IDEA.md",
  "FEEDBACK_REQUEST.txt",
]) assert.equal(files.some(file => file.endsWith(`/${forbidden}`)), false, `development file was packaged: ${forbidden}`);

console.log("Electron unpacked package contents are valid");
