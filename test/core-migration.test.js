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
