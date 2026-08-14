"use strict";

const crypto = require("node:crypto");

function createEventHubActionService(options = {}) {
  const services = options.services || {};
  function execute(action, context = {}) {
    if (action.type === "counter.command") return services.gpCounterV2.command({ operation: action.operation, counterId: action.counterId, delta: action.delta, value: action.value, cause: `event-hub:${context.ruleId}` });
    if (action.type === "effect.button.trigger") {
      const button = services.remoteEffectCatalog.resolve(action.buttonId);
      if (!button) { const error = new Error("effect_button_not_found"); error.status = 404; throw error; }
      return services.effectTransport.trigger({ protocol: "vct.obs-screen-effect", protocolVersion: 1, messageId: crypto.randomUUID(), source: { role: "event-hub", instanceId: "server-event-hub" }, type: "effect.trigger", sentAt: Date.now(), payload: { effectId: button.effectId, params: button.params } });
    }
    const error = new Error("unsupported_action"); error.status = 400; throw error;
  }
  return Object.freeze({ execute });
}

module.exports = { createEventHubActionService };
