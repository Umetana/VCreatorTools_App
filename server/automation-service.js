"use strict";

const crypto = require("node:crypto");

function createAutomationService(options = {}) {
  const token = options.token || "";
  const logger = options.logger || console;
  const services = options.services || {};

  function authenticate(req, res, next) {
    if (!token) return res.status(503).json({ ok: false, error: "automation_not_configured" });
    const authorization = req.get("authorization") || "";
    const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : req.get("x-vct-automation-token") || "";
    const expectedBuffer = Buffer.from(token);
    const suppliedBuffer = Buffer.from(supplied);
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(401).json({ ok: false, error: "automation_authorization_required" });
    }
    return next();
  }

  function mount(app) {
    app.use("/api/automation/v1", authenticate);
    app.get("/api/automation/v1/status", (_req, res) => res.json({ ok: true, apiVersion: 1, capabilities: { counter: true, effects: true } }));
    app.get("/api/automation/v1/counters", (_req, res) => {
      const state = services.gpCounterV2.getState();
      res.json({ ok: true, revision: state.revision, updatedAt: state.updatedAt, counters: state.counters.map(({ id, label, count, unit, goalCount, showGoal }) => ({ id, label, count, unit, goal: { enabled: showGoal, value: goalCount } })) });
    });
    app.post("/api/automation/v1/counters/:counterId/command", (req, res) => {
      const operation = req.body?.operation;
      if (!new Set(["increment", "decrement", "reset", "set"]).has(operation)) return res.status(400).json({ ok: false, error: "unsupported_operation" });
      if (operation === "reset" && req.body?.confirm !== true) return res.status(400).json({ ok: false, error: "reset_confirmation_required" });
      try {
        const result = services.gpCounterV2.command({ operation, counterId: req.params.counterId, delta: req.body?.delta, value: req.body?.value, cause: "automation" });
        return res.json({ ok: true, changed: result.changed, delivered: result.delivered, state: result.state });
      } catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message || "invalid_command" }); }
    });
    app.get("/api/automation/v1/effects", (_req, res) => {
      const state = services.remoteEffectCatalog.getState();
      res.json({ ok: true, revision: state.revision, updatedAt: state.updatedAt, buttons: state.buttons.map(({ buttonId, label, effectId, order }) => ({ buttonId, label, effectId, order })) });
    });
    app.post("/api/automation/v1/effects/:buttonId/trigger", (req, res) => {
      const button = services.remoteEffectCatalog.resolve(req.params.buttonId);
      if (!button) return res.status(404).json({ ok: false, error: "effect_button_not_found" });
      try {
        const result = services.effectTransport.trigger({ protocol: "vct.obs-screen-effect", protocolVersion: 1, messageId: crypto.randomUUID(), source: { role: "automation", instanceId: "local-automation" }, type: "effect.trigger", sentAt: Date.now(), payload: { effectId: button.effectId, params: button.params } });
        logger.info?.(`[automation] effect ${button.buttonId} clients=${result.delivered}`);
        return res.json({ ok: true, buttonId: button.buttonId, effectId: button.effectId, delivered: result.delivered, messageId: result.messageId });
      } catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message || "effect_trigger_failed" }); }
    });
  }

  return Object.freeze({ mount });
}

module.exports = { createAutomationService };
