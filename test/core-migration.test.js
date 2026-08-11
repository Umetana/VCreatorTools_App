"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("GP Multi Counter pilot pages load the versioned Core", () => {
  for (const file of ["control_ops.html", "control_setting.html", "display.html", "display_layout.html"]) {
    const html = read("public", "V_CreatorTools", "GP_multi_counter_v2", file);
    assert.match(html, /\.\.\/_vct_core\/runtime\/v1\/vct-runtime\.js/);
    assert.match(html, /\.\.\/_vct_core\/gp-counter\/v2\/counter-client\.js/);
    assert.doesNotMatch(html, /__shared|src="counter-|src="gp-counter-server/);
  }
  const template = read("public", "V_CreatorTools", "GP_multi_counter_v2", "display_custom_template", "display_template.html");
  assert.match(template, /\.\.\/\.\.\/_vct_core\/gp-counter\/v2\/counter-client\.js/);
});

test("Counter consumers load Runtime and Counter SDK from the versioned Core", () => {
  for (const parts of [
    ["Total_Operations_Console_v2", "index.html"],
    ["OBS_gadget_v2", "index.html"],
    ["open_panel_counter_v2", "open_panel_counter.html"],
  ]) {
    const html = read("public", "V_CreatorTools", ...parts);
    assert.match(html, /\.\.\/_vct_core\/runtime\/v1\/vct-runtime\.js/);
    assert.match(html, /\.\.\/_vct_core\/gp-counter\/v2\/counter-client\.js/);
    assert.doesNotMatch(html, /__shared|\.\.\/GP_multi_counter_v2\/counter-/);
  }
});

test("migration compatibility copies still match the Core source", () => {
  assert.equal(
    read("public", "__shared", "js", "vct-runtime.js"),
    read("public", "V_CreatorTools", "_vct_core", "runtime", "v1", "vct-runtime.js")
  );
  for (const file of ["counter-core.js", "counter-schema.js", "counter-protocol.js", "counter-store.js", "counter-client.js", "gp-counter-server.js"]) {
    assert.equal(
      read("public", "V_CreatorTools", "GP_multi_counter_v2", file),
      read("public", "V_CreatorTools", "_vct_core", "gp-counter", "v2", file)
    );
  }
});

test("Server GP Counter service imports the Core schema and protocol", () => {
  const service = read("server", "gp-counter-v2-service.js");
  assert.match(service, /_vct_core\/gp-counter\/v2\/counter-schema\.js/);
  assert.match(service, /_vct_core\/gp-counter\/v2\/counter-protocol\.js/);
  assert.doesNotMatch(service, /GP_multi_counter_v2\/counter-(?:schema|protocol)\.js/);
});

test("portable GP Counter display starter uses the sibling managed Core", () => {
  const template = path.join(root, "templates", "gp-counter-display");
  const manifest = JSON.parse(fs.readFileSync(path.join(template, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.modes, ["standalone", "sync", "server"]);
  assert.equal(manifest.pages[0].obs, true);
  const html = fs.readFileSync(path.join(template, "display.html"), "utf8");
  assert.match(html, /\.\.\/_vct_core\/runtime\/v1\/vct-runtime\.js/);
  assert.match(html, /\.\.\/_vct_core\/gp-counter\/v2\/counter-client\.js/);
  assert.doesNotMatch(html, /\.\.\/\.\.\/_vct_core/);
});

test("official Screen Effect host and Maro pages use the versioned Runtime", () => {
  for (const parts of [
    ["OBS_screen_effect_v2", "index.html"],
    ["OBS_screen_effect_v2", "config.html"],
    ["OBS_screen_effect_v2", "controller.html"],
    ["maro_panel_gadget_v2", "index.html"],
    ["maro_panel_gadget_v2", "maro_view.html"],
  ]) {
    const html = read("public", "V_CreatorTools", ...parts);
    assert.match(html, /\.\.\/_vct_core\/runtime\/v1\/vct-runtime\.js/);
    assert.doesNotMatch(html, /__shared\/js\/vct-runtime\.js/);
  }
  const effectHost = read("public", "V_CreatorTools", "OBS_screen_effect_v2", "index.html");
  assert.match(effectHost, /\.\.\/_vct_core\/gp-counter\/v2\/counter-client\.js/);
  assert.doesNotMatch(effectHost, /\.\.\/GP_multi_counter_v2\/counter-/);
});

test("developer documentation identifies Core as canonical and legacy files as compatibility", () => {
  const guide = read("public", "V_CreatorTools", "GP_multi_counter_v2", "DEVELOPER_GUIDE.md");
  const runtime = read("public", "_docs", "VCreatorTools_RUNTIME_API_v0.1.md");
  assert.match(guide, /_vct_core\/gp-counter\/v2/);
  assert.match(guide, /互換用/);
  assert.match(runtime, /_vct_core\/runtime\/v1\/vct-runtime\.js/);
  assert.match(runtime, /互換用/);
});

test("release Screen Effect settings hide the unsupported third-party editor entry", () => {
  const config = read("public", "V_CreatorTools", "OBS_screen_effect_v2", "config.html");
  const documentation = read("public", "V_CreatorTools", "OBS_screen_effect_v2", "README.md");
  assert.match(config, /\.developer-tool \{ display: none !important; \}/);
  assert.match(config, /location\.href='effect_editor\.html'/);
  assert.match(documentation, /第三者製Effectの追加・配布・自動導入は現行リリースの対応範囲外/);
});
