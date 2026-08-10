'use strict';

const fs = require('fs');
const path = require('path');
const MaroSchema = require('../public/V_CreatorTools/maro_panel_gadget_v2/maro-schema.js');
const defaultConfig = require('../public/V_CreatorTools/maro_panel_gadget_v2/settings.js');
const defaultData = require('../public/V_CreatorTools/maro_panel_gadget_v2/data.js');

const EVENT_SCHEMA = 'maro-panel.event.v2';
const COMMANDS = new Set(['open', 'close', 'show-detail', 'hide-detail', 'undo', 'reset', 'show', 'hide']);

function createMaroV2Service(options = {}) {
  const dataFile = options.dataFile === null ? null : path.resolve(options.dataFile || path.join(__dirname, 'data', 'maro-v2.json'));
  const broadcast = options.broadcast || (() => 0);
  const logger = options.logger || console;
  let state = MaroSchema.fromLegacy(defaultConfig, defaultData);

  if (dataFile && fs.existsSync(dataFile)) {
    try { state = MaroSchema.normalizeState(JSON.parse(fs.readFileSync(dataFile, 'utf8'))); }
    catch (error) { logger.error?.(`[maro-v2] failed to read ${dataFile}: ${error.message}`); }
  }

  function persist() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporary = `${dataFile}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, dataFile);
  }

  function publish() { return broadcast({ schema: EVENT_SCHEMA, eventType: 'state', sentAt: state.updatedAt, payload: state }); }
  function commit(next) {
    state = MaroSchema.normalizeState({ ...next, revision: state.revision + 1, updatedAt: new Date().toISOString() });
    persist(); publish(); return state;
  }

  function applyCommand(command, panelId) {
    if (!COMMANDS.has(command)) throw Object.assign(new Error('unsupported_command'), { status: 400 });
    const next = MaroSchema.normalizeState(state);
    const panelIds = new Set(next.project.panels.map(panel => panel.id));
    if (['open', 'close', 'show-detail'].includes(command) && !panelIds.has(panelId)) throw Object.assign(new Error('panel_not_found'), { status: 404 });
    const runtime = next.runtime;
    const opened = new Set(runtime.openedPanelIds);
    if (command === 'open') { if (!opened.has(panelId)) runtime.history.push(panelId); opened.add(panelId); }
    else if (command === 'close') opened.delete(panelId);
    else if (command === 'show-detail') runtime.activePanelId = panelId;
    else if (command === 'hide-detail') runtime.activePanelId = null;
    else if (command === 'undo') { const previous = runtime.history.pop(); if (previous) opened.delete(previous); runtime.activePanelId = null; }
    else if (command === 'reset') { opened.clear(); runtime.activePanelId = null; runtime.history = []; }
    else if (command === 'show') runtime.visible = true;
    else if (command === 'hide') runtime.visible = false;
    runtime.openedPanelIds = [...opened];
    return commit(next);
  }

  function mount(app) {
    app.get('/api/maro/v2/state', (_req, res) => res.json(state));
    app.put('/api/maro/v2/state', (req, res) => {
      let incoming;
      try { incoming = MaroSchema.normalizeState(req.body); MaroSchema.validateState(incoming); }
      catch (error) { return res.status(400).json({ ok: false, error: error.message }); }
      if (incoming.revision !== state.revision) return res.status(409).json({ ok: false, error: 'revision_conflict', state });
      return res.json({ ok: true, state: commit(incoming) });
    });
    app.post('/api/maro/v2/command', (req, res) => {
      try { return res.json({ ok: true, state: applyCommand(req.body?.command, req.body?.panelId ?? null) }); }
      catch (error) { return res.status(error.status || 400).json({ ok: false, error: error.message }); }
    });
  }

  return { mount, getState: () => state, applyCommand };
}

module.exports = { createMaroV2Service, EVENT_SCHEMA };
