"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Schema = require("../server/event-hub-schema");
const { createEventHubRepository } = require("../server/event-hub-repository");
const { createEventHubService } = require("../server/event-hub-service");
const { createUnifiedServer } = require("../server/server");

function document(rules, revision = 0) { return { schema: Schema.SCHEMA, schemaVersion: Schema.SCHEMA_VERSION, revision, updatedAt: null, rules }; }
function counterAction(counterId = "greeting") { return { type: "counter.command", counterId, operation: "increment", delta: 1 }; }
function rule(overrides = {}) { return { id: "rule_greeting", label: "挨拶", enabled: true, event: { type: "comment", field: "comment.text" }, condition: { operator: "contains", value: "おは" }, action: counterAction(), ...overrides }; }
function bridge(eventType, payload, extra = {}) { return { schema: "msbridge.event.v1", eventType, source: { app: "onecomme" }, payload, ...extra }; }
function counter(id, count = 0) { return { id, label: id, count, unit: "回", goalCount: 10, showGoal: true, bgColor: "#000", borderColor: "#fff", textColor: "#fff", labelSize: "20px", countSize: "36px", isBold: true, isShadow: false, fontFamily: "sans-serif" }; }

test("Event Hub schema only accepts fixed fields, operators and one action", () => {
  assert.equal(Schema.validateDocument(document([rule()])).rules[0].action.delta, 1);
  assert.throws(() => Schema.validateDocument(document([rule({ event: { type: "comment", field: "payload.__proto__" } })])), /unsupported_event_field/);
  assert.throws(() => Schema.validateDocument(document([rule({ condition: { operator: "regex", value: ".*" } })])), /unsupported_operator/);
  assert.throws(() => Schema.validateDocument(document([rule({ action: [{ type: "counter.command" }] })])), /invalid_action/);
});

test("containsAny normalizes multiple words and matches one action once", async () => {
  const calls = [];
  const anyRule = rule({ condition: { operator: "containsAny", value: [" 初見 ", "はじめまして", "おはつ", "初見"] }, action: counterAction("counter2") });
  const validated = Schema.validateDocument(document([anyRule]));
  assert.deepEqual(validated.rules[0].condition.value, ["初見", "はじめまして", "おはつ"]);
  assert.equal(Schema.matches("containsAny", "初見です、はじめまして", validated.rules[0].condition.value), true);
  const service = createEventHubService({ dataFile: null, actions: { execute(action) { calls.push(action); return { changed: true }; } }, services: { gpCounterV2: { getState: () => ({ counters: [] }) }, remoteEffectCatalog: { getState: () => ({ buttons: [] }) } }, logger: { info() {}, error() {} } });
  service.replaceRules(document([anyRule]));
  service.accept(bridge("comment", { raw: { data: { id: "comment-any", comment: "初見です、はじめまして" } } }));
  await service.idle();
  assert.equal(calls.length, 1);
  assert.throws(() => Schema.validateDocument(document([rule({ condition: { operator: "containsAny", value: [] } })])), /invalid_string_values/);
});

test("Event Hub repository persists revisions and rejects stale replacement", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vct-event-hub-repository-"));
  try {
    const dataFile = path.join(directory, "event-hub-v1.json");
    const repository = createEventHubRepository({ dataFile, now: () => 1234, logger: { error() {} } });
    const saved = repository.replace(document([rule()]));
    assert.equal(saved.state.revision, 1);
    assert.equal(JSON.parse(fs.readFileSync(dataFile, "utf8")).schema, Schema.SCHEMA);
    assert.equal(repository.replace(document([], 0)).conflict, true);
    assert.equal(createEventHubRepository({ dataFile }).getState().rules.length, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("Comment rules execute once per stable event id and do not retain comment text", async () => {
  const calls = [];
  const service = createEventHubService({ dataFile: null, actions: { execute(action, context) { calls.push({ action, context }); return { changed: true }; } }, services: { gpCounterV2: { getState: () => ({ counters: [] }) }, remoteEffectCatalog: { getState: () => ({ buttons: [] }) } }, logger: { info() {}, error() {} } });
  service.replaceRules(document([rule()]));
  const event = bridge("comment", { raw: { id: "bridge-source", data: { id: "comment-1" } }, normalized: { text: "おはようございます", user: "private-name" } });
  service.accept(event); service.accept(event); await service.idle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].context.ruleId, "rule_greeting");
  const serializedStatus = JSON.stringify(service.status());
  assert.doesNotMatch(serializedStatus, /おはよう|private-name/);
  assert.equal(service.status().runtime.duplicateComments, 1);
});

test("Bridge source raw.id shared by different comments is not treated as a comment id", async () => {
  const calls = [];
  const service = createEventHubService({ dataFile: null, actions: { execute(action) { calls.push(action); return { changed: true }; } }, services: { gpCounterV2: { getState: () => ({ counters: [] }) }, remoteEffectCatalog: { getState: () => ({ buttons: [] }) } }, logger: { info() {}, error() {} } });
  service.replaceRules(document([rule()]));
  service.accept(bridge("comment", { raw: { id: "shared-source", data: { id: "comment-a", comment: "おはA" } } }));
  service.accept(bridge("comment", { raw: { id: "shared-source", data: { id: "comment-b", comment: "おはB" } } }));
  await service.idle();
  assert.equal(calls.length, 2);
  assert.equal(service.status().runtime.duplicateComments, 0);
});

test("Comment matching prefers displayed comment over pronunciation speechText", async () => {
  const calls = [];
  const firstVisitRule = rule({ id: "rule_first_visit", label: "初見", condition: { operator: "contains", value: "初見" }, action: counterAction("counter2") });
  const service = createEventHubService({ dataFile: null, actions: { execute(action) { calls.push(action); return { changed: true }; } }, services: { gpCounterV2: { getState: () => ({ counters: [] }) }, remoteEffectCatalog: { getState: () => ({ buttons: [] }) } }, logger: { info() {}, error() {} } });
  service.replaceRules(document([firstVisitRule]));
  service.accept(bridge("comment", { raw: { data: { id: "comment-first", comment: "初見です", speechText: "しょけんです" } } }));
  await service.idle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].counterId, "counter2");
});

test("Meta rules baseline first value and only trigger on false to true edges", async () => {
  const calls = [];
  const metaRule = rule({ id: "rule_viewers", event: { type: "meta", field: "meta.viewerCount" }, condition: { operator: "gte", value: 100 }, action: { type: "effect.button.trigger", buttonId: "celebration" } });
  const service = createEventHubService({ dataFile: null, actions: { execute(action) { calls.push(action); return { delivered: 1 }; } }, services: { gpCounterV2: { getState: () => ({ counters: [] }) }, remoteEffectCatalog: { getState: () => ({ buttons: [] }) } }, logger: { info() {}, error() {} } });
  service.replaceRules(document([metaRule]));
  for (const viewers of [120, 130, 80, 100, 110, 70, 101]) service.accept(bridge("meta", { normalized: { viewerCount: viewers } }));
  await service.idle();
  assert.equal(calls.length, 2);
});

test("Unified Server exposes protected Event Hub management and executes Bridge rules through existing Counter service", async (t) => {
  const adminToken = "event-hub-admin-token";
  const userAssetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-event-hub-assets-"));
  t.after(() => fs.rmSync(userAssetsDir, { recursive: true, force: true }));
  const instance = createUnifiedServer({ host: "127.0.0.1", port: 0, publicDir: path.join(__dirname, "..", "public"), userAssetsDir, dataFile: null, eventHubDataFile: null, remoteSessionFile: null, remoteEffectCatalogFile: null, adminToken, remote: { enabled: false }, logger: { info() {}, error() {} } });
  try {
    await instance.start();
    const base = `http://127.0.0.1:${instance.server.address().port}`;
    assert.equal((await fetch(`${base}/api/event-hub/v1/status`)).status, 200);
    assert.equal((await fetch(`${base}/api/event-hub/v1/rules`)).status, 403);
    assert.equal((await fetch(`${base}/api/event-hub/v1/rules`, { headers: { origin: base } })).status, 200);
    const headers = { "x-vct-admin-token": adminToken, "content-type": "application/json" };
    instance.services.gpCounterV2.commit([counter("greeting")], { cause: "test" });
    const saved = await fetch(`${base}/api/event-hub/v1/rules`, { method: "PUT", headers, body: JSON.stringify(document([rule()])) });
    assert.equal(saved.status, 200);
    const bridgeResponse = await fetch(`${base}/bridge`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bridge("comment", { raw: { id: "integration-comment" }, normalized: { text: "おは！" } })) });
    assert.equal(bridgeResponse.status, 200);
    await instance.services.eventHub.idle();
    assert.equal(instance.services.gpCounterV2.getState().counters[0].count, 1);
    assert.equal(instance.services.eventHub.status().runtime.executedActions, 1);
  } finally { await instance.stop(); }
});

test("Event Hub has an independent management UI while TOC only links and reports status", () => {
  const root = path.join(__dirname, "..", "public", "V_CreatorTools");
  const page = fs.readFileSync(path.join(root, "Event_Hub", "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "Event_Hub", "event-hub.js"), "utf8");
  const tocPage = fs.readFileSync(path.join(root, "Total_Operations_Console_v2", "index.html"), "utf8");
  const tocScript = fs.readFileSync(path.join(root, "Total_Operations_Console_v2", "toc.js"), "utf8");
  assert.match(page, /1 Event \/ 1 Condition \/ 1 Action/);
  assert.match(script, /\/api\/event-hub\/v1\/rules/);
  assert.match(script, /containsAny/);
  assert.match(script, /split\(\/\[\\r\\n,，、\]\+\//);
  assert.match(tocPage, /Event_Hub\/index\.html/);
  assert.match(tocScript, /\/api\/event-hub\/v1\/status/);
  assert.doesNotMatch(tocScript, /\/api\/event-hub\/v1\/rules/);
});
