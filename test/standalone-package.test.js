"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { buildStandalone } = require("../scripts/build-standalone");

test("GP Multi Counter standalone package contains only its gadget and required shared folders", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "vct-standalone-"));
  try {
    const result = buildStandalone("gp-multi-counter", { outputRoot: temporary });
    assert.ok(result.htmlFiles > 0);
    assert.deepEqual(fs.readdirSync(result.destination).sort(), ["GP_multi_counter_v2", "_vct_core", "_vct_lib"].sort());
    assert.equal(fs.existsSync(path.join(result.destination, "_vct_core", "runtime", "v1", "vct-runtime.js")), true);
    assert.equal(fs.existsSync(path.join(result.destination, "_vct_core", "gp-counter", "v2", "counter-client.js")), true);
    assert.equal(fs.existsSync(path.join(result.destination, "GP_multi_counter_v2", "display.html")), true);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
