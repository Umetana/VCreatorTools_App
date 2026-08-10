"use strict";

const fs = require("fs");
const path = require("path");

const SCHEMA = "vct.remote-effects";
const SCHEMA_VERSION = 1;

function createRemoteEffectCatalogService(options = {}) {
  const dataFile = options.dataFile === null ? null : path.resolve(options.dataFile || path.join(__dirname, "data", "remote-effects.json"));
  const logger = options.logger || console;
  const now = options.now || (() => Date.now());
  const listeners = new Set();
  let state = emptyState();

  if (dataFile && fs.existsSync(dataFile)) {
    try { state = validateDocument(JSON.parse(fs.readFileSync(dataFile, "utf8"))); }
    catch (error) { logger.error?.(`[remote-effects] failed to read catalog: ${error.message}`); }
  }

  function persist() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryFile, dataFile);
  }

  function replace(input) {
    const candidate = validateDocument(input);
    if (candidate.revision !== state.revision) return { ok: false, conflict: true, state: getState() };
    if (JSON.stringify(candidate.buttons) === JSON.stringify(state.buttons)) return { ok: true, changed: false, state: getState() };
    state = { ...candidate, revision: state.revision + 1, updatedAt: now() };
    persist();
    const result = { ok: true, changed: true, state: getState() };
    listeners.forEach(listener => listener(result));
    return result;
  }

  function resolve(buttonId) {
    if (typeof buttonId !== "string") return null;
    const button = state.buttons.find(item => item.buttonId === buttonId);
    return button ? clone(button) : null;
  }

  function remoteState() {
    return {
      revision: state.revision,
      updatedAt: state.updatedAt,
      buttons: state.buttons.map(({ buttonId, label, order }) => ({ buttonId, label, order })),
    };
  }

  function mount(app) {
    app.get("/api/remote/effects", (_req, res) => res.json({ ok: true, state: getState() }));
    app.put("/api/remote/effects", (req, res) => {
      try {
        const result = replace(req.body);
        if (result.conflict) return res.status(409).json({ ok: false, error: "revision_conflict", state: result.state });
        return res.json(result);
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || "invalid_catalog" });
      }
    });
  }

  function getState() { return clone(state); }

  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }

  return Object.freeze({ mount, replace, resolve, remoteState, getState, subscribe });
}

function emptyState() {
  return { schema: SCHEMA, schemaVersion: SCHEMA_VERSION, revision: 0, updatedAt: null, buttons: [] };
}

function validateDocument(input) {
  if (!isObject(input)) throw new TypeError("catalog_must_be_object");
  if (input.schema !== SCHEMA) throw new TypeError("unsupported_catalog_schema");
  if (input.schemaVersion !== SCHEMA_VERSION) throw new TypeError("unsupported_catalog_schema_version");
  if (!Number.isInteger(input.revision) || input.revision < 0) throw new TypeError("invalid_catalog_revision");
  if (!Array.isArray(input.buttons) || input.buttons.length > 400) throw new TypeError("invalid_catalog_buttons");
  const ids = new Set();
  const orders = new Set();
  const buttons = input.buttons.map((button, index) => {
    if (!isObject(button)) throw new TypeError(`buttons[${index}]_must_be_object`);
    const buttonId = validId(button.buttonId, 128, `buttons[${index}]_invalid_button_id`);
    const effectId = validId(button.effectId, 128, `buttons[${index}]_invalid_effect_id`);
    if (ids.has(buttonId)) throw new TypeError("duplicate_button_id");
    ids.add(buttonId);
    if (!Number.isInteger(button.order) || button.order < 0 || button.order > 399 || orders.has(button.order)) throw new TypeError("invalid_or_duplicate_button_order");
    orders.add(button.order);
    if (typeof button.label !== "string" || !button.label.trim() || button.label.length > 500) throw new TypeError(`buttons[${index}]_invalid_label`);
    if (!isObject(button.params) || JSON.stringify(button.params).length > 100000) throw new TypeError(`buttons[${index}]_invalid_params`);
    return { buttonId, label: button.label, effectId, order: button.order, params: clone(button.params) };
  }).sort((a, b) => a.order - b.order);
  const result = { schema: SCHEMA, schemaVersion: SCHEMA_VERSION, revision: input.revision, updatedAt: input.updatedAt ?? null, buttons };
  if (JSON.stringify(result).length > 1000000) throw new TypeError("catalog_too_large");
  return result;
}

function validId(value, maxLength, error) {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) throw new TypeError(error);
  return value;
}

function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

module.exports = { SCHEMA, SCHEMA_VERSION, createRemoteEffectCatalogService, validateDocument };
