"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const WebSocket = require("ws");
const Schema = require("../server/event-hub-schema");
const { createUnifiedServer } = require("../server/server");

function counter(id, count = 0) { return { id, label: id, count, unit: "回", goalCount: 10, showGoal: true, bgColor: "#000", borderColor: "#fff", textColor: "#fff", labelSize: "20px", countSize: "36px", isBold: true, isShadow: false, fontFamily: "sans-serif" }; }
function bridge(id, text) { return { schema: "msbridge.event.v1", eventType: "comment", source: { app: "onecomme" }, payload: { normalized: { id, message: { text }, user: { traits: { firstTime: false } } } } }; }
function document(rules) { return { schema: Schema.SCHEMA, schemaVersion: Schema.SCHEMA_VERSION, revision: 0, updatedAt: null, rules }; }
function rule(id, action) { return { id, label: id, enabled: true, event: { type: "comment", field: "comment.text" }, condition: { operator: "contains", value: "同時" }, action }; }

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

test("Bridge, Chrome, OBS, Remote and Automation can operate concurrently through shared services", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vct-event-hub-concurrency-"));
  const remotePort = await freePort(); const automationToken = "concurrency-automation-token"; const bridgeToken = "concurrency-bridge-token";
  const instance = createUnifiedServer({ host: "127.0.0.1", port: 0, publicDir: path.join(__dirname, "..", "public"), userAssetsDir: path.join(directory, "assets"), dataFile: null, eventHubDataFile: null, remoteSessionFile: null, remoteEffectCatalogFile: null, automationToken, bridgeToken, remote: { enabled: true, host: "127.0.0.1", port: remotePort }, logger: { info() {}, error() {} } });
  let socket;
  t.after(async () => { socket?.close(); await instance.stop(); fs.rmSync(directory, { recursive: true, force: true }); });
  const address = await instance.start(); const base = `http://127.0.0.1:${address.port}`; const remoteBase = `http://127.0.0.1:${remotePort}`;
  instance.services.gpCounterV2.commit([counter("shared")], { cause: "concurrency-test" });
  instance.services.remoteEffectCatalog.replace({ schema: "vct.remote-effects", schemaVersion: 1, revision: 0, updatedAt: null, buttons: [{ buttonId: "spark", label: "Spark", effectId: "spark_effect", order: 0, params: {} }] });
  instance.services.eventHub.replaceRules(document([
    rule("event_hub_counter", { type: "counter.command", counterId: "shared", operation: "increment", delta: 1 }),
    rule("event_hub_effect", { type: "effect.button.trigger", buttonId: "spark" }),
  ]));

  const messages = [];
  socket = new WebSocket(`ws://127.0.0.1:${address.port}/events`);
  socket.on("message", data => { try { messages.push(JSON.parse(String(data))); } catch {} });
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });

  const pairing = instance.remote.pairingInfo();
  const pairResponse = await fetch(`${remoteBase}/remote/api/pair`, { method: "POST", headers: { origin: remoteBase, "content-type": "application/json" }, body: JSON.stringify({ code: pairing.code, deviceName: "Concurrent Remote" }) });
  assert.equal(pairResponse.status, 200);
  const cookie = pairResponse.headers.get("set-cookie").split(";", 1)[0];
  const automationHeaders = { authorization: `Bearer ${automationToken}`, "content-type": "application/json" };
  const remoteHeaders = { cookie, origin: remoteBase, "content-type": "application/json" };

  const [bridgeResponse, chromeStatus, chromeRules, automationCounter, automationEffect, remoteCounter, remoteEffect] = await Promise.all([
    fetch(`${base}/bridge`, { method: "POST", headers: { "x-bridge-token": bridgeToken, "content-type": "application/json" }, body: JSON.stringify(bridge("concurrent-comment", "同時テスト")) }),
    fetch(`${base}/api/event-hub/v1/status`),
    fetch(`${base}/api/event-hub/v1/rules`, { headers: { origin: base } }),
    fetch(`${base}/api/automation/v1/counters/shared/command`, { method: "POST", headers: automationHeaders, body: JSON.stringify({ operation: "increment", delta: 2 }) }),
    fetch(`${base}/api/automation/v1/effects/spark/trigger`, { method: "POST", headers: automationHeaders }),
    fetch(`${remoteBase}/remote/api/action`, { method: "POST", headers: remoteHeaders, body: JSON.stringify({ requestId: "remote-counter-1", type: "counter.command", payload: { counterId: "shared", operation: "increment", delta: 1 } }) }),
    fetch(`${remoteBase}/remote/api/action`, { method: "POST", headers: remoteHeaders, body: JSON.stringify({ requestId: "remote-effect-1", type: "effect.trigger", payload: { buttonId: "spark" } }) }),
  ]);
  for (const response of [bridgeResponse, chromeStatus, chromeRules, automationCounter, automationEffect, remoteCounter, remoteEffect]) assert.equal(response.status, 200);
  await instance.services.eventHub.idle();
  await new Promise(resolve => setTimeout(resolve, 25));

  assert.equal(instance.services.gpCounterV2.getState().counters[0].count, 4);
  assert.equal(instance.services.eventHub.status().runtime.executedActions, 2);
  assert.equal(instance.services.eventHub.getRules().revision, 1);
  assert.ok(messages.some(message => message.schema === "msbridge.event.v1" && message.eventType === "comment"));
  assert.ok(messages.filter(message => message.protocol === "vct.obs-screen-effect" && message.type === "effect.trigger").length >= 3);
});
