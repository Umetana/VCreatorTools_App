"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { createUnifiedServer } = require("../server/server");

function counter(id, count = 0) {
  return { id, label: id, count, unit: "回", goalCount: 10, showGoal: true, bgColor: "#000", borderColor: "#fff", textColor: "#fff", labelSize: "20px", countSize: "36px", isBold: true, isShadow: false, fontFamily: "sans-serif" };
}

test("Local Automation API requires its dedicated token and exposes scoped actions", async () => {
  const token = "automation-test-token-1234567890";
  const instance = createUnifiedServer({ host: "127.0.0.1", port: 0, publicDir: path.join(__dirname, "..", "public"), dataFile: null, remoteSessionFile: null, remoteEffectCatalogFile: null, automationToken: token, remote: { enabled: false }, logger: { info() {}, error() {} } });
  try {
    await instance.start();
    const base = `http://127.0.0.1:${instance.server.address().port}`;
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    assert.equal((await fetch(`${base}/api/automation/v1/status`)).status, 401);
    assert.equal((await fetch(`${base}/api/automation/v1/status`, { headers: { authorization: "Bearer wrong" } })).status, 401);
    assert.equal((await fetch(`${base}/api/automation/v1/status`, { headers })).status, 200);

    instance.services.gpCounterV2.commit([counter("counter1", 2)], { cause: "test" });
    const counters = await fetch(`${base}/api/automation/v1/counters`, { headers }).then((response) => response.json());
    assert.equal(counters.counters[0].count, 2);
    const command = await fetch(`${base}/api/automation/v1/counters/counter1/command`, { method: "POST", headers, body: JSON.stringify({ operation: "increment", delta: 3 }) }).then((response) => response.json());
    assert.equal(command.state.counters[0].count, 5);
    assert.equal((await fetch(`${base}/api/automation/v1/counters/counter1/command`, { method: "POST", headers, body: JSON.stringify({ operation: "reset" }) })).status, 400);

    instance.services.remoteEffectCatalog.replace({ schema: "vct.remote-effects", schemaVersion: 1, revision: 0, updatedAt: null, buttons: [{ buttonId: "crown", label: "王冠", effectId: "crown_effect", order: 0, params: { volume: 0.5 } }] });
    const effects = await fetch(`${base}/api/automation/v1/effects`, { headers }).then((response) => response.json());
    assert.deepEqual(effects.buttons, [{ buttonId: "crown", label: "王冠", effectId: "crown_effect", order: 0 }]);
    assert.equal((await fetch(`${base}/api/automation/v1/effects/unknown/trigger`, { method: "POST", headers })).status, 404);
    const trigger = await fetch(`${base}/api/automation/v1/effects/crown/trigger`, { method: "POST", headers }).then((response) => response.json());
    assert.equal(trigger.effectId, "crown_effect");
    assert.equal(trigger.buttonId, "crown");
  } finally { await instance.stop(); }
});
