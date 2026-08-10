"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { createUnifiedServer } = require("../server/server");

test("Material Hub is listed as browser-local Web App with Sync and Server viewers", async () => {
  const instance = createUnifiedServer({
    host: "127.0.0.1",
    port: 0,
    publicDir: path.join(__dirname, "..", "public"),
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
    assert.ok(material);
    assert.equal(gadgets.length, 9);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Hub").modes, ["standalone"]);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Editor").modes, ["standalone"]);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Viewer").modes, ["sync", "server"]);
    assert.match(material.pages.find((page) => page.name === "Material Viewer").urls.server, /mode=view&vctMode=server/);
  } finally {
    await instance.stop();
  }
});
