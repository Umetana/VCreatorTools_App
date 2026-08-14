"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Schema = require("./event-hub-schema");

function createEventHubRepository(options = {}) {
  const dataFile = options.dataFile === null ? null : path.resolve(options.dataFile || path.join(__dirname, "data", "event-hub-v1.json"));
  const logger = options.logger || console;
  const now = options.now || (() => Date.now());
  let state = Schema.emptyDocument();
  if (dataFile && fs.existsSync(dataFile)) {
    try { state = Schema.validateDocument(JSON.parse(fs.readFileSync(dataFile, "utf8"))); }
    catch (error) { logger.error?.(`[event-hub] failed to read rules: ${error.message}`); }
  }

  function persist() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryFile, dataFile);
  }

  function replace(input) {
    const candidate = Schema.validateDocument(input);
    if (candidate.revision !== state.revision) return { ok: false, conflict: true, state: getState() };
    if (JSON.stringify(candidate.rules) === JSON.stringify(state.rules)) return { ok: true, changed: false, state: getState() };
    state = { ...candidate, revision: state.revision + 1, updatedAt: now() };
    persist();
    return { ok: true, changed: true, state: getState() };
  }

  function getState() { return Schema.clone(state); }
  return Object.freeze({ getState, replace });
}

module.exports = { createEventHubRepository };
