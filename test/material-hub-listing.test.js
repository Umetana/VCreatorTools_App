"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createUnifiedServer } = require("../server/server");

test("Material Hub is listed as browser-local Web App with Sync and Server viewers", async (t) => {
  const userAssetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-material-assets-"));
  t.after(() => fs.rmSync(userAssetsDir, { recursive: true, force: true }));
  const instance = createUnifiedServer({
    host: "127.0.0.1",
    port: 0,
    publicDir: path.join(__dirname, "..", "public"),
    userAssetsDir,
    dataFile: null,
    remoteSessionFile: null,
    remoteEffectCatalogFile: null,
    remote: { enabled: false },
    logger: { info() {}, error() {} }
  });
  try {
    const address = await instance.start();
    const gadgets = await fetch(`http://127.0.0.1:${address.port}/api/get-gadgets`).then((response) => response.json());
    const material = gadgets.find((item) => item.root === "vct_web_app" && item.rawName === "Material Hub");
    const eventHub = gadgets.find((item) => item.root === "V_CreatorTools" && item.rawName === "VCT Event Hub");
    assert.ok(material);
    assert.ok(eventHub);
    assert.equal(gadgets.length, 10);
    assert.deepEqual(eventHub.pages[0].modes, ["server"]);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Hub").modes, ["standalone"]);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Editor").modes, ["standalone"]);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Viewer").modes, ["sync", "server"]);
    assert.match(material.pages.find((page) => page.name === "Material Viewer").urls.server, /mode=view&vctMode=server/);
  } finally {
    await instance.stop();
  }
});
