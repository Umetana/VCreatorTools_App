"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createUnifiedServer, publicGpCounterState } = require("../server/server");

test("user gadget static mount resolves real paths inside its root", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server", "server.js"), "utf8");
  assert.match(source, /fs\.realpathSync\(requested\)/);
  assert.match(source, /relative\.startsWith\("\.\."\) \|\| path\.isAbsolute\(relative\)/);
  assert.match(source, /user_gadget_path_forbidden/);
});

test("bundled user gadget sample is a standalone and Sync-only API-free template", () => {
  const template = path.join(__dirname, "..", "templates", "user-gadget-basic");
  const manifest = JSON.parse(fs.readFileSync(path.join(template, "manifest.json"), "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.modes, ["standalone", "sync"]);
  assert.deepEqual(manifest.pages.map((page) => page.role), ["control", "display"]);
  for (const page of manifest.pages) assert.equal(fs.existsSync(path.join(template, page.file)), true);
  const script = fs.readFileSync(path.join(template, "sample.js"), "utf8");
  assert.match(script, /new BroadcastChannel/);
  assert.doesNotMatch(script, /fetch\s*\(|\/api\//);
});

test("public GP Counter DTO includes display values but excludes styling settings", () => {
  const result = publicGpCounterState({
    revision: 7,
    updatedAt: 123456789,
    counters: [{ id: "counter1", label: "来場者", count: 42, unit: "人", goalCount: 100, showGoal: true, bgColor: "#000", borderColor: "#fff", textColor: "#fff", labelSize: "20px", countSize: "40px", isBold: true, isShadow: true, fontFamily: "secret-font" }],
  });
  assert.deepEqual(result.counters, [{ id: "counter1", label: "来場者", count: 42, unit: "人", goal: { enabled: true, value: 100 } }]);
  assert.equal(JSON.stringify(result).includes("bgColor"), false);
  assert.equal(JSON.stringify(result).includes("fontFamily"), false);
});

test("user gadgets require a manifest and Remote management stays admin-only", async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "vct-user-gadgets-"));
  const valid = path.join(temporary, "sample");
  const missingManifest = path.join(temporary, "not-listed");
  const managedCore = path.join(temporary, "_vct_core");
  fs.mkdirSync(valid);
  fs.mkdirSync(missingManifest);
  fs.mkdirSync(managedCore);
  fs.writeFileSync(path.join(valid, "index.html"), "<!doctype html><title>User sample</title>");
  fs.writeFileSync(path.join(valid, "manifest.json"), JSON.stringify({ schemaVersion: 1, version: "1.0.0", name: "User Sample", status: "release", modes: ["sync"], pages: [{ name: "Sample", file: "index.html", role: "display", obs: true, modes: ["sync"] }] }));
  fs.writeFileSync(path.join(missingManifest, "index.html"), "<!doctype html><title>Hidden</title>");
  const adminToken = "test-admin-token";
  const instance = createUnifiedServer({ host: "127.0.0.1", port: 0, publicDir: path.join(__dirname, "..", "public"), userGadgetsDir: temporary, adminToken, dataFile: null, remoteSessionFile: null, remoteEffectCatalogFile: null, remote: { enabled: false }, logger: { info() {}, error() {} } });
  try {
    const address = await instance.start();
    const base = `http://127.0.0.1:${address.port}`;
    const gadgets = await fetch(`${base}/api/get-gadgets`).then((response) => response.json());
    const user = gadgets.filter((item) => item.root === "user_gadgets");
    assert.equal(user.length, 1);
    assert.equal(user[0].rawName, "User Sample");
    assert.match(user[0].pages[0].urls.sync, /\/user_gadgets\/sample\/index\.html\?vctMode=sync/);
    assert.equal((await fetch(`${base}/user_gadgets/sample/index.html`)).status, 200);

    const publicCapabilities = await fetch(`${base}/api/public/v1/capabilities`).then((response) => response.json());
    assert.equal(publicCapabilities.schema, "vct.public-capabilities.v1");
    assert.equal(publicCapabilities.apiVersion, 1);
    assert.equal(publicCapabilities.capabilities.discovery.available, true);
    assert.equal(publicCapabilities.capabilities.discovery.access, "read");
    assert.equal(publicCapabilities.capabilities.stateRead.available, true);
    assert.equal(publicCapabilities.capabilities.stateRead.resources.gpCounterV2.endpoint, "/api/public/v1/gp-counter/state");
    assert.equal(publicCapabilities.capabilities.events.available, true);
    assert.equal(publicCapabilities.capabilities.events.transport, "sse");
    for (const capability of ["stateWrite", "actions", "administration"]) {
      assert.equal(publicCapabilities.capabilities[capability].available, false);
    }

    const publicCounterState = await fetch(`${base}/api/public/v1/gp-counter/state`).then((response) => response.json());
    assert.equal(publicCounterState.schema, "vct.public.gp-counter-state.v1");
    assert.equal(publicCounterState.apiVersion, 1);
    assert.deepEqual(publicCounterState.counters, []);

    const eventAbort = new AbortController();
    const eventResponse = await fetch(`${base}/api/public/v1/events`, { signal: eventAbort.signal });
    assert.match(eventResponse.headers.get("content-type"), /^text\/event-stream/);
    const firstEvent = new TextDecoder().decode((await eventResponse.body.getReader().read()).value);
    assert.match(firstEvent, /event: gp-counter\.state/);
    assert.match(firstEvent, /"schema":"vct\.public-event\.v1"/);
    eventAbort.abort();

    const restricted = await fetch(`${base}/api/remote/status`).then((response) => response.json());
    assert.equal(restricted.pairing.restricted, true);
    assert.equal(restricted.pairing.code, null);
    assert.deepEqual(restricted.pairing.sessions, []);
    assert.equal((await fetch(`${base}/api/remote/pairing/regenerate`, { method: "POST" })).status, 403);
    const authorized = await fetch(`${base}/api/remote/status`, { headers: { "X-VCT-Admin-Token": adminToken } }).then((response) => response.json());
    assert.notEqual(authorized.pairing.restricted, true);
  } finally {
    await instance.stop();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
