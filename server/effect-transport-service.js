"use strict";

const PROTOCOL = "vct.obs-screen-effect";
const PROTOCOL_VERSION = 1;
const TYPE = "effect.trigger";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validString(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function validateEffectTriggerEnvelope(message) {
  if (!isObject(message)) return "invalid_envelope";
  if (message.protocol !== PROTOCOL) return "unsupported_protocol";
  if (message.protocolVersion !== PROTOCOL_VERSION) return "unsupported_protocol_version";
  if (message.type !== TYPE) return "unsupported_message_type";
  if (!validString(message.messageId, 200)) return "invalid_message_id";
  if (!Number.isFinite(message.sentAt)) return "invalid_sent_at";
  if (!isObject(message.source) || !validString(message.source.role, 64) || !validString(message.source.instanceId, 200)) {
    return "invalid_source";
  }
  if (!isObject(message.payload)) return "invalid_payload";
  if (!validString(message.payload.effectId, 128) || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(message.payload.effectId)) {
    return "invalid_effect_id";
  }
  if (!isObject(message.payload.params)) return "invalid_params";
  if (JSON.stringify(message).length > 1000000) return "message_too_large";
  return null;
}

function createEffectTransportService(options = {}) {
  const broadcast = options.broadcast || (() => 0);
  const logger = options.logger || console;
  const onAccepted = options.onAccepted || (() => {});

  function trigger(message) {
    const error = validateEffectTriggerEnvelope(message);
    if (error) {
      const invalid = new Error(error);
      invalid.status = 400;
      throw invalid;
    }
    const delivered = broadcast(message);
    onAccepted(message, delivered);
    logger.info?.(`[obs-screen-effect-v2] ${message.payload.effectId} clients=${delivered}`);
    return { ok: true, delivered, messageId: message.messageId };
  }

  function mount(app) {
    app.post("/api/obs-screen-effect/v2/trigger", (req, res) => {
      try { return res.json(trigger(req.body)); }
      catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message }); }
    });
  }

  return Object.freeze({ mount, trigger });
}

module.exports = { createEffectTransportService, validateEffectTriggerEnvelope };
