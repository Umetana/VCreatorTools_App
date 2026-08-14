"use strict";

const crypto = require("node:crypto");

const SCHEMA = "vct.event-hub.rules.v1";
const SCHEMA_VERSION = 1;
const MAX_RULES = 500;
const FIELD_DEFINITIONS = Object.freeze({
  "comment.text": { eventType: "comment", type: "string", operators: ["equals", "contains", "containsAny"] },
  "comment.firstComment": { eventType: "comment", type: "boolean", operators: ["equals"] },
  "meta.viewerCount": { eventType: "meta", type: "number", operators: ["eq", "gte", "lte", "gt", "lt"] },
  "meta.likeCount": { eventType: "meta", type: "number", operators: ["eq", "gte", "lte", "gt", "lt"] },
  "meta.subscriberCount": { eventType: "meta", type: "number", operators: ["eq", "gte", "lte", "gt", "lt"] },
  "meta.platform": { eventType: "meta", type: "string", operators: ["equals", "contains", "containsAny"] },
});

function emptyDocument() {
  return { schema: SCHEMA, schemaVersion: SCHEMA_VERSION, revision: 0, updatedAt: null, rules: [] };
}

function validateDocument(input) {
  if (!isObject(input)) throw validationError("rules_document_must_be_object");
  if (input.schema !== SCHEMA || input.schemaVersion !== SCHEMA_VERSION) throw validationError("unsupported_rules_schema");
  if (!Number.isInteger(input.revision) || input.revision < 0) throw validationError("invalid_rules_revision");
  if (!Array.isArray(input.rules) || input.rules.length > MAX_RULES) throw validationError("invalid_rules_array");
  const ids = new Set();
  const rules = input.rules.map((rule, index) => validateRule(rule, index, ids));
  return { schema: SCHEMA, schemaVersion: SCHEMA_VERSION, revision: input.revision, updatedAt: input.updatedAt ?? null, rules };
}

function validateRule(input, index = 0, ids = new Set()) {
  if (!isObject(input)) throw validationError(`rules[${index}]_must_be_object`);
  const id = validId(input.id, `rules[${index}]_invalid_id`);
  if (ids.has(id)) throw validationError("duplicate_rule_id");
  ids.add(id);
  if (typeof input.label !== "string" || !input.label.trim() || input.label.length > 200) throw validationError(`rules[${index}]_invalid_label`);
  if (typeof input.enabled !== "boolean") throw validationError(`rules[${index}]_invalid_enabled`);
  if (!isObject(input.event)) throw validationError(`rules[${index}]_invalid_event`);
  const definition = FIELD_DEFINITIONS[input.event.field];
  if (!definition || input.event.type !== definition.eventType) throw validationError(`rules[${index}]_unsupported_event_field`);
  if (!isObject(input.condition) || !definition.operators.includes(input.condition.operator)) throw validationError(`rules[${index}]_unsupported_operator`);
  const value = normalizeConditionValue(input.condition.value, definition.type, index, input.condition.operator);
  const action = validateAction(input.action, index);
  return { id, label: input.label.trim(), enabled: input.enabled, event: { type: definition.eventType, field: input.event.field }, condition: { operator: input.condition.operator, value }, action };
}

function validateAction(input, index) {
  if (!isObject(input)) throw validationError(`rules[${index}]_invalid_action`);
  if (input.type === "counter.command") {
    const counterId = validId(input.counterId, `rules[${index}]_invalid_counter_id`);
    if (!["increment", "decrement", "reset", "set"].includes(input.operation)) throw validationError(`rules[${index}]_unsupported_counter_operation`);
    const result = { type: input.type, counterId, operation: input.operation };
    if (["increment", "decrement"].includes(input.operation)) {
      const delta = input.delta === undefined ? 1 : input.delta;
      if (!Number.isSafeInteger(delta) || delta <= 0) throw validationError(`rules[${index}]_invalid_delta`);
      result.delta = delta;
    }
    if (input.operation === "set") {
      if (!Number.isSafeInteger(input.value) || input.value < 0) throw validationError(`rules[${index}]_invalid_set_value`);
      result.value = input.value;
    }
    return result;
  }
  if (input.type === "effect.button.trigger") return { type: input.type, buttonId: validId(input.buttonId, `rules[${index}]_invalid_button_id`) };
  throw validationError(`rules[${index}]_unsupported_action`);
}

function normalizeBridgeEvent(event) {
  if (!isObject(event) || !["comment", "meta"].includes(event.eventType) || !isObject(event.payload)) return null;
  const { raw, normalized } = normalizedPair(event.payload);
  const data = isObject(raw.data) ? raw.data : {};
  if (event.eventType === "comment") {
    const text = first(normalized.text, stripHtml(data.comment), data.speechText);
    const firstComment = first(normalized.firstComment, normalized.isFirstComment, data.firstComment, data.isFirstComment);
    return { type: "comment", values: { "comment.text": asString(text), "comment.firstComment": asBoolean(firstComment) }, eventKey: commentEventKey(event, raw, normalized) };
  }
  return { type: "meta", values: {
    "meta.viewerCount": asNumber(first(normalized.viewerCount, normalized.viewer, normalized.viewers, data.viewerCount, data.viewer, data.viewers)),
    "meta.likeCount": asNumber(first(normalized.likeCount, normalized.upVote, normalized.goodCount, normalized.likes, data.likeCount, data.upVote, data.goodCount, data.likes)),
    "meta.subscriberCount": asNumber(first(normalized.subscriberCount, normalized.subscribers, data.subscriberCount, data.subscribers)),
    "meta.platform": asString(first(normalized.platform, raw.type, raw.service?.name, event.source?.app)),
  }, eventKey: null };
}

function matches(operator, actual, expected) {
  if (actual === null || actual === undefined) return false;
  if (operator === "equals") return typeof actual === "string" ? actual === expected : actual === expected;
  if (operator === "contains") return typeof actual === "string" && actual.includes(expected);
  if (operator === "containsAny") return typeof actual === "string" && Array.isArray(expected) && expected.some(value => actual.includes(value));
  if (operator === "eq") return actual === expected;
  if (operator === "gte") return actual >= expected;
  if (operator === "lte") return actual <= expected;
  if (operator === "gt") return actual > expected;
  if (operator === "lt") return actual < expected;
  return false;
}

function commentEventKey(event, raw, normalized) {
  const data = isObject(raw.data) ? raw.data : {};
  // raw.id identifies the Bridge/source in some Ms.Bridge payloads and is not
  // necessarily unique per comment. Only use identifiers owned by the comment
  // body or explicitly named as comment/message/event identifiers.
  const stable = first(data.id, data.commentId, data.messageId, data.chatId, raw.commentId, raw.messageId, normalized.commentId, normalized.messageId, event.eventId);
  if (stable !== undefined && stable !== null && String(stable)) return `id:${String(stable).slice(0, 500)}`;
  const material = JSON.stringify([event.source?.app ?? null, event.sequence ?? null, event.sentAt ?? null, normalized.text ?? raw.data?.comment ?? raw.data?.speechText ?? null, normalized.user ?? raw.data?.displayName ?? null]);
  return `hash:${crypto.createHash("sha256").update(material).digest("hex")}`;
}

function normalizedPair(payload) { return payload.raw || payload.normalized ? { raw: isObject(payload.raw) ? payload.raw : {}, normalized: isObject(payload.normalized) ? payload.normalized : {} } : { raw: payload, normalized: {} }; }
function first(...values) { return values.find(value => value !== undefined && value !== null && value !== ""); }
function stripHtml(value) { return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : value; }
function asString(value) { return value === undefined || value === null ? null : String(value); }
function asNumber(value) { if (value === undefined || value === null || value === "") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function asBoolean(value) { if (value === true || value === false) return value; if (value === "true" || value === 1 || value === "1") return true; if (value === "false" || value === 0 || value === "0") return false; return null; }
function normalizeConditionValue(value, type, index, operator) {
  if (type === "string" && operator === "containsAny") {
    if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw validationError(`rules[${index}]_invalid_string_values`);
    const values = [...new Set(value.map(item => typeof item === "string" ? item.trim() : ""))];
    if (values.some(item => !item || item.length > 500)) throw validationError(`rules[${index}]_invalid_string_values`);
    return values;
  }
  if (type === "string") { if (typeof value !== "string" || !value || value.length > 500) throw validationError(`rules[${index}]_invalid_string_value`); return value; }
  if (type === "boolean") { if (typeof value !== "boolean") throw validationError(`rules[${index}]_invalid_boolean_value`); return value; }
  if (typeof value !== "number" || !Number.isFinite(value)) throw validationError(`rules[${index}]_invalid_number_value`);
  return value;
}
function validId(value, error) { if (typeof value !== "string" || value.length < 1 || value.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) throw validationError(error); return value; }
function validationError(message) { const error = new TypeError(message); error.status = 400; return error; }
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

module.exports = { SCHEMA, SCHEMA_VERSION, FIELD_DEFINITIONS, emptyDocument, validateDocument, validateRule, normalizeBridgeEvent, matches, clone };
