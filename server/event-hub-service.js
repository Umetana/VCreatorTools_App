"use strict";

const Schema = require("./event-hub-schema");
const { createEventHubRepository } = require("./event-hub-repository");
const { createEventHubActionService } = require("./event-hub-action-service");

function createEventHubService(options = {}) {
  const logger = options.logger || console;
  const now = options.now || (() => Date.now());
  const repository = options.repository || createEventHubRepository({ dataFile: options.dataFile, logger, now });
  const actions = options.actions || createEventHubActionService({ services: options.services });
  const dedupeTtlMs = options.dedupeTtlMs || 5 * 60 * 1000;
  const dedupeLimit = options.dedupeLimit || 5000;
  const seenComments = new Map();
  const metaMatches = new Map();
  let queue = Promise.resolve();
  let runtime = { acceptedEvents: 0, matchedRules: 0, executedActions: 0, failedActions: 0, duplicateComments: 0, lastEventAt: null, lastMatchAt: null, lastResult: null };

  function accept(event) {
    const normalized = Schema.normalizeBridgeEvent(event);
    if (!normalized) return false;
    queue = queue.then(() => processEvent(normalized)).catch(error => logger.error?.(`[event-hub] event processing failed: ${error.message}`));
    return true;
  }

  async function processEvent(event) {
    runtime.acceptedEvents += 1;
    runtime.lastEventAt = now();
    if (event.type === "comment" && isDuplicate(event.eventKey)) { runtime.duplicateComments += 1; return; }
    const rules = repository.getState().rules.filter(rule => rule.enabled && rule.event.type === event.type);
    for (const rule of rules) {
      const matched = Schema.matches(rule.condition.operator, event.values[rule.event.field], rule.condition.value);
      if (event.type === "meta") {
        if (!metaMatches.has(rule.id)) { metaMatches.set(rule.id, matched); continue; }
        const previous = metaMatches.get(rule.id);
        metaMatches.set(rule.id, matched);
        if (previous || !matched) continue;
      } else if (!matched) continue;
      runtime.matchedRules += 1;
      runtime.lastMatchAt = now();
      try {
        const result = await actions.execute(rule.action, { ruleId: rule.id });
        runtime.executedActions += 1;
        runtime.lastResult = { ok: true, ruleId: rule.id, at: now(), changed: result?.changed, delivered: result?.delivered };
        logger.info?.(`[event-hub] rule=${rule.id} action=${rule.action.type} ok=true`);
      } catch (error) {
        runtime.failedActions += 1;
        runtime.lastResult = { ok: false, ruleId: rule.id, at: now(), error: error.message || "action_failed" };
        logger.error?.(`[event-hub] rule=${rule.id} action=${rule.action.type} ok=false error=${error.message || "action_failed"}`);
      }
    }
  }

  function isDuplicate(key) {
    const currentTime = now();
    for (const [storedKey, expiresAt] of seenComments) if (expiresAt <= currentTime) seenComments.delete(storedKey);
    if (seenComments.has(key)) return true;
    // Stable Bridge IDs survive reconnects; hash fallbacks use a short window so
    // two legitimate identical comments are not suppressed for several minutes.
    seenComments.set(key, currentTime + (key.startsWith("id:") ? dedupeTtlMs : Math.min(dedupeTtlMs, 2000)));
    while (seenComments.size > dedupeLimit) seenComments.delete(seenComments.keys().next().value);
    return false;
  }

  function replaceRules(input) {
    const result = repository.replace(input);
    if (result.changed) metaMatches.clear();
    return result;
  }

  function status() {
    const state = repository.getState();
    return { ok: true, schema: "vct.event-hub.status.v1", running: true, revision: state.revision, ruleCount: state.rules.length, enabledRuleCount: state.rules.filter(rule => rule.enabled).length, runtime: Schema.clone(runtime) };
  }

  function catalog() {
    const counterState = options.services.gpCounterV2.getState();
    const effectState = options.services.remoteEffectCatalog.getState();
    return { ok: true, fields: Object.entries(Schema.FIELD_DEFINITIONS).map(([id, value]) => ({ id, ...value })), counters: counterState.counters.map(({ id, label }) => ({ id, label })), effects: effectState.buttons.map(({ buttonId, label }) => ({ buttonId, label })) };
  }

  function testRule(input) {
    const rule = Schema.validateRule(input?.rule, 0, new Set());
    const normalized = Schema.normalizeBridgeEvent(input?.event);
    if (!normalized) { const error = new Error("invalid_test_event"); error.status = 400; throw error; }
    return { ok: true, dryRun: true, matched: rule.enabled && rule.event.type === normalized.type && Schema.matches(rule.condition.operator, normalized.values[rule.event.field], rule.condition.value), normalized: { type: normalized.type, values: normalized.values } };
  }

  function mount(app, requireAdmin = (_req, _res, next) => next()) {
    app.get("/api/event-hub/v1/status", (_req, res) => res.json(status()));
    app.get("/api/event-hub/v1/rules", requireAdmin, (_req, res) => res.json({ ok: true, state: repository.getState() }));
    app.put("/api/event-hub/v1/rules", requireAdmin, (req, res) => { try { const result = replaceRules(req.body); if (result.conflict) return res.status(409).json({ ok: false, error: "revision_conflict", state: result.state }); return res.json(result); } catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message }); } });
    app.get("/api/event-hub/v1/catalog", requireAdmin, (_req, res) => res.json(catalog()));
    app.post("/api/event-hub/v1/test", requireAdmin, (req, res) => { try { return res.json(testRule(req.body)); } catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message }); } });
  }

  return Object.freeze({ accept, idle: () => queue, getRules: repository.getState, replaceRules, status, catalog, testRule, mount });
}

module.exports = { createEventHubService };
