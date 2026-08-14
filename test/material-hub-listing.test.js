"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createUnifiedServer } = require("../server/server");

function materialServer(t) {
  const userAssetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-material-assets-"));
  t.after(() => fs.rmSync(userAssetsDir, { recursive: true, force: true }));
  return createUnifiedServer({
    host: "127.0.0.1",
    port: 0,
    publicDir: path.join(__dirname, "..", "public"),
    userAssetsDir,
    dataFile: null,
    remoteSessionFile: null,
    remoteEffectCatalogFile: null,
    eventHubDataFile: null,
    remote: { enabled: false },
    logger: { info() {}, error() {} }
  });
}

test("Material Hub is listed as browser-local Web App with Sync and Server viewers", async (t) => {
  const instance = materialServer(t);
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
    assert.deepEqual(material.pages.find((page) => page.name === "Material Editor").modes, ["standalone", "server"]);
    assert.match(material.pages.find((page) => page.name === "Material Editor").urls.server, /material_editor\.html\?vctMode=server/);
    assert.deepEqual(material.pages.find((page) => page.name === "Material Viewer").modes, ["sync", "server"]);
    assert.match(material.pages.find((page) => page.name === "Material Viewer").urls.server, /mode=view&vctMode=server/);
  } finally {
    await instance.stop();
  }
});

test("Material Editor replaces its catalog without conflicting with Viewer-only updates", async (t) => {
  const instance = materialServer(t);
  try {
    const address = await instance.start();
    const base = `http://127.0.0.1:${address.port}`;
    const initial = {
      schema: "material-view.state.v1", revision: 0,
      articles: [{ id: "article", title: "Article", fact: "Article fact" }],
      extraCatalog: [{ id: "extra:old", title: "Old", fact: "Old fact", dataSource: "extra" }],
      displayOrder: ["article", "extra:old"], selectedIds: ["article", "extra:old"], currentId: "extra:old",
      sharedSettings: {}, importedBatches: [],
    };
    const seeded = await fetch(`${base}/api/material-view/state`, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(initial),
    });
    assert.equal(seeded.status, 200);
    const seededState = (await seeded.json()).state;
    assert.equal(seededState.extraCatalogRevision, 1);

    const update = await fetch(`${base}/api/material-view/extra-catalog`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: "1.0", source: "material-editor", deliveryMode: "replace", catalogRevision: 1,
        items: [{ id: "old", title: "Edited", fact: "Edited fact" }, { id: "new", title: "New", fact: "New fact" }],
      }),
    });
    assert.equal(update.status, 200);
    const updated = (await update.json()).state;
    assert.deepEqual(updated.extraCatalog.map(item => item.id), ["extra:old", "extra:new"]);
    assert.deepEqual(updated.displayOrder, ["article", "extra:old", "extra:new"]);
    assert.deepEqual(updated.selectedIds, ["article", "extra:old", "extra:new"]);

    const catalog = await fetch(`${base}/api/material-view/extra-catalog`).then(response => response.json());
    assert.equal(catalog.catalogRevision, 2);
    assert.deepEqual(catalog.items.map(item => item.id), ["old", "new"]);

    const viewerUpdate = await fetch(`${base}/api/material-view/state`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...updated, sharedSettings: { panelHeading: "Viewer change" } }),
    });
    assert.equal(viewerUpdate.status, 200);
    assert.equal((await viewerUpdate.json()).state.extraCatalogRevision, 2);

    const stale = await fetch(`${base}/api/material-view/extra-catalog`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...catalog, catalogRevision: 1 }),
    });
    assert.equal(stale.status, 409);
  } finally {
    await instance.stop();
  }
});

test("Material Editor catalog endpoint rejects malformed articles", async (t) => {
  const instance = materialServer(t);
  try {
    const address = await instance.start();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/material-view/extra-catalog`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: "1.0", source: "material-editor", deliveryMode: "replace", catalogRevision: 0, items: [{ id: "bad", title: "Bad" }] }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "item_fact_must_be_nonempty_string");
  } finally {
    await instance.stop();
  }
});
