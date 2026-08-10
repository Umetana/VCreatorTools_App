(function (global) {
  'use strict';

  const SCHEMA = 'maro-panel.state.v2';
  const MAX_PANELS = 100;

  const defaultDesign = () => ({
    panelDefault: '#ffffff', textDefault: '#333333', panelActive: '#ff85a2',
    textActive: '#ffffff', accent: '#ff4d79', modalBg: '#fffcf9',
    panelTitleSize: '1.1rem', phraseSize: '1.1rem', modalTextSize: '1.6rem'
  });

  function createPanel(index = 0) {
    return { id: `panel${index + 1}`, title: `パネル ${index + 1}`, phrase: '準備中...', content: 'まだありません！', style: null };
  }

  function createState() {
    return {
      schema: SCHEMA, revision: 0, updatedAt: null,
      project: { id: 'default', title: 'マロ読み企画', grid: { cols: 4, rows: 4 }, design: defaultDesign(), panels: Array.from({ length: 16 }, (_, i) => createPanel(i)) },
      runtime: { openedPanelIds: [], activePanelId: null, visible: true, history: [] }
    };
  }

  function fromLegacy(config, data) {
    const state = createState();
    const cols = integer(config?.grid?.cols, 1, 10, 4);
    const rows = integer(config?.grid?.rows, 1, 10, 4);
    state.project.grid = { cols, rows };
    state.project.design = {
      ...state.project.design,
      panelDefault: text(config?.colors?.panelDefault, 100, state.project.design.panelDefault),
      textDefault: text(config?.colors?.textDefault, 100, state.project.design.textDefault),
      panelActive: text(config?.colors?.panelActive, 100, state.project.design.panelActive),
      textActive: text(config?.colors?.textActive, 100, state.project.design.textActive),
      accent: text(config?.colors?.accent, 100, state.project.design.accent),
      modalBg: text(config?.colors?.modalBg, 100, state.project.design.modalBg),
      panelTitleSize: text(config?.fonts?.panelTitleSize, 100, state.project.design.panelTitleSize),
      phraseSize: text(config?.fonts?.phraseSize, 100, state.project.design.phraseSize),
      modalTextSize: text(config?.fonts?.modalTextSize, 100, state.project.design.modalTextSize)
    };
    const source = Array.isArray(data) ? data : [];
    state.project.panels = Array.from({ length: cols * rows }, (_, index) => {
      const raw = source[index] || createPanel(index);
      return {
        id: `panel${index + 1}`, title: text(raw.title, 120, `パネル ${index + 1}`),
        phrase: text(raw.phrase, 300), content: text(raw.content, 10000),
        style: raw.customStyle ? {
          closedBg: text(raw.customStyle.closed?.bg, 64), closedText: text(raw.customStyle.closed?.text, 64),
          openBg: text(raw.customStyle.phrase?.bg, 64), openText: text(raw.customStyle.phrase?.text, 64)
        } : null
      };
    });
    return normalizeState(state);
  }

  const text = (value, max, fallback = '') => typeof value === 'string' ? value.slice(0, max) : fallback;
  const integer = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Math.trunc(Number(value)))) : fallback;
  const id = (value, fallback) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value || '') ? value : fallback;

  function normalizeState(input) {
    const base = createState();
    const source = input && typeof input === 'object' ? input : {};
    const project = source.project && typeof source.project === 'object' ? source.project : {};
    const grid = project.grid && typeof project.grid === 'object' ? project.grid : {};
    const cols = integer(grid.cols, 1, 10, base.project.grid.cols);
    const rows = integer(grid.rows, 1, 10, base.project.grid.rows);
    const count = Math.min(MAX_PANELS, cols * rows);
    const seen = new Set();
    const supplied = Array.isArray(project.panels) ? project.panels : [];
    const panels = Array.from({ length: count }, (_, index) => {
      const raw = supplied[index] && typeof supplied[index] === 'object' ? supplied[index] : createPanel(index);
      let panelId = id(raw.id, `panel${index + 1}`);
      if (seen.has(panelId)) panelId = `panel${index + 1}`;
      seen.add(panelId);
      const style = raw.style && typeof raw.style === 'object' ? {
        closedBg: text(raw.style.closedBg, 64), closedText: text(raw.style.closedText, 64),
        openBg: text(raw.style.openBg, 64), openText: text(raw.style.openText, 64)
      } : null;
      return { id: panelId, title: text(raw.title, 120, `パネル ${index + 1}`), phrase: text(raw.phrase, 300), content: text(raw.content, 10000), style };
    });
    const panelIds = new Set(panels.map(panel => panel.id));
    const runtime = source.runtime && typeof source.runtime === 'object' ? source.runtime : {};
    const openedPanelIds = [...new Set(Array.isArray(runtime.openedPanelIds) ? runtime.openedPanelIds.filter(panelId => panelIds.has(panelId)) : [])];
    const activePanelId = panelIds.has(runtime.activePanelId) ? runtime.activePanelId : null;
    const design = { ...defaultDesign() };
    if (project.design && typeof project.design === 'object') {
      for (const key of Object.keys(design)) design[key] = text(project.design[key], 100, design[key]);
    }
    return {
      schema: SCHEMA,
      revision: integer(source.revision, 0, Number.MAX_SAFE_INTEGER, 0),
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null,
      project: { id: id(project.id, 'default'), title: text(project.title, 120, 'マロ読み企画'), grid: { cols, rows }, design, panels },
      runtime: {
        openedPanelIds,
        activePanelId,
        visible: runtime.visible !== false,
        history: Array.isArray(runtime.history) ? runtime.history.filter(panelId => panelIds.has(panelId)).slice(-100) : []
      }
    };
  }

  function validateState(value) {
    const normalized = normalizeState(value);
    if (!value || value.schema !== SCHEMA) throw new TypeError('Unsupported Maro state schema');
    if (JSON.stringify(value) !== JSON.stringify(normalized)) throw new TypeError('Maro state is not normalized');
    return value;
  }

  const api = Object.freeze({ SCHEMA, MAX_PANELS, createPanel, createState, fromLegacy, normalizeState, validateState });
  global.MaroSchema = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
