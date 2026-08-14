(() => {
  'use strict';

  const STORAGE_KEY = 'material_view_settings_v1';
  const QUEUE_STORAGE_KEY = 'material_view_article_queue_v1';
  const EXTRA_STORAGE_KEY = 'material_view_extra_catalog_v1';
  const ORDER_STORAGE_KEY = 'material_view_display_order_v1';
  const IMPORTED_BATCHES_STORAGE_KEY = 'material_view_imported_batches_v1';
  const SYNC_CHANNEL_NAME = 'material_view_sync_v1';
  const VALID_VIEW_MODES = new Set(['view', 'settings', 'all']);
  const SERVER_PERSISTED_UPDATE_TYPES = new Set(['settings-updated', 'queue-updated', 'extra-updated', 'order-updated']);
  const requestedMode = new URLSearchParams(window.location.search).get('mode') || 'view';
  const viewMode = VALID_VIEW_MODES.has(requestedMode) ? requestedMode : 'view';
  const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const DEFAULT_CONFIG = {
    configVersion: '1.0',
    layoutMode: 'switch',
    contentMode: 'active',
    controlLinkEnabled: false,
    appearance: {
      panelOpacity: 96
    },
    labels: {
      panelHeading: 'Topics'
    },
    typography: {
      detailTitleScale: 100,
      detailTextScale: 100
    },
    colors: {
      panelBackground: '#ffffff',
      panelHeadingText: '#0f172a',
      titleBackground: '#f8fafc',
      titleBorder: '#6366f1',
      titleText: '#0f172a',
      detailBackground: '#ffffff',
      detailText: '#1e293b'
    }
  };

  const data = window.MATERIAL_HUB_DATA;
  const extraData = window.MATERIAL_EXTRA_DATA;
  const fileConfig = mergeConfig(DEFAULT_CONFIG, window.MATERIAL_VIEW_CONFIG || {});
  let settings = loadSettings();
  let items = [];
  let extraItems = [];
  let itemOrder = [];
  let currentId = null;
  let renderedLayoutMode = settings.layoutMode;
  let settingsBeforeEdit = null;
  let importSummary = { added: 0, skipped: false };
  let newExtraIds = [];
  let extraCatalogChanged = false;
  let syncChannel = null;
  const serverMode = window.VCTRuntime?.mode === 'server';
  let serverReady = false;
  let serverRevision = 0;
  let serverSaveTimer = null;
  let serverSaving = false;
  let serverDirty = false;
  let serverSocket = null;
  let viewOutputVisible = true;
  let linkedViewVisible = true;
  let linkedViewConnected = false;

  const elements = {};

  window.addEventListener('DOMContentLoaded', initialize);

  async function initialize() {
    [
      'messageScreen', 'messageTitle', 'messageText', 'displayScreen', 'listPane', 'detailPane',
      'topicList', 'visibleCount', 'panelHeadingLabel', 'panelHeading', 'detailCategory', 'detailTitle', 'detailFact', 'detailReaction', 'detailTips', 'backButton',
      'settingsButton', 'viewVisibilityButton', 'settingsScreen', 'cancelSettingsButton', 'saveSettingsButton', 'dataStatus', 'articleChecks',
      'viewerOrderList',
      'backupViewerButton', 'copyViewerBackupButton', 'saveViewerBackupButton', 'viewerBackupText', 'restoreViewerButton', 'restoreViewerInput', 'reloadViewerDataButton', 'dataManagementStatus',
      'selectAllButton', 'clearAllButton', 'resetSettingsButton', 'titleBackground',
      'panelBackground', 'panelHeadingText', 'titleBorder', 'titleText', 'detailBackground', 'detailText', 'panelBackgroundText', 'panelHeadingTextText', 'titleBackgroundText',
      'titleBorderText', 'titleTextText', 'detailBackgroundText', 'detailTextText',
      'detailTitleScale', 'detailTitleScaleNumber', 'detailTextScale', 'detailTextScaleNumber',
      'panelOpacity', 'panelOpacityNumber', 'controlLinkEnabled'
    ].forEach(id => { elements[id] = document.getElementById(id); });

    document.body.dataset.mode = viewMode;
    bindEvents();
    items = loadArticleQueue();
    extraItems = loadExtraCatalog();
    const validation = validateData(data);
    const extraValidation = validateExtraData(extraData);
    if (extraValidation.ok) {
      const previousExtraIds = new Set(extraItems.map(item => item.id));
      const previousExtraJson = JSON.stringify(extraItems);
      extraItems = replaceExtraCatalog(extraData);
      extraCatalogChanged = previousExtraJson !== JSON.stringify(extraItems);
      newExtraIds = extraItems.filter(item => !previousExtraIds.has(item.id)).map(item => item.id);
    }
    if (!validation.ok && items.length === 0 && extraItems.length === 0 && viewMode !== 'settings') {
      showMessage('データを読み込めません', validation.message);
      return;
    }
    if (validation.ok) importSummary = importIncomingBatch(data);
    if (Array.isArray(settings.selectedIds) && importSummary.newIds?.length) {
      settings.selectedIds = [...new Set([...settings.selectedIds, ...importSummary.newIds])];
    }
    if (Array.isArray(settings.selectedIds) && newExtraIds.length) {
      settings.selectedIds = [...new Set([...settings.selectedIds, ...newExtraIds])];
    }
    if (items.length === 0 && extraItems.length === 0 && viewMode !== 'settings') {
      showMessage('記事がありません', 'Material HubまたはMaterial Editorから記事を書き出してください。');
      return;
    }
    itemOrder = loadViewerOrder();
    reconcileViewerOrder(true);
    reconcileSelectedIds();
    applySettings();
    renderSettings();
    setupSynchronization();
    if (viewMode === 'all') syncChannel?.publish('visibility-query');
    if (viewMode === 'view') syncChannel?.publish('visibility-status', { visible: viewOutputVisible });
    if (importSummary.added > 0) broadcastUpdate('queue-updated');
    if (extraCatalogChanged) broadcastUpdate('extra-updated');
    if (serverMode) await initializeServerMode();
    if (viewMode === 'settings') {
      settingsBeforeEdit = cloneSettings(settings);
      elements.messageScreen.classList.add('hidden');
      elements.displayScreen.classList.add('hidden');
      elements.settingsScreen.classList.remove('hidden');
    } else {
      renderDisplay();
    }
  }

  function setupSynchronization() {
    if (window.VCTRuntime) {
      syncChannel = window.VCTRuntime.createChannel(SYNC_CHANNEL_NAME, { senderId: instanceId });
      syncChannel.subscribe(message => handleSharedUpdate(message.type, message));
      window.VCTRuntime.observeStorage(
        [STORAGE_KEY, QUEUE_STORAGE_KEY, EXTRA_STORAGE_KEY, ORDER_STORAGE_KEY],
        key => {
          if (key === STORAGE_KEY) handleSharedUpdate('settings-updated');
          if (key === QUEUE_STORAGE_KEY) handleSharedUpdate('queue-updated');
          if (key === EXTRA_STORAGE_KEY) handleSharedUpdate('extra-updated');
          if (key === ORDER_STORAGE_KEY) handleSharedUpdate('order-updated');
        }
      );
      return;
    }
    if ('BroadcastChannel' in window) {
      const legacyChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      legacyChannel.addEventListener('message', event => {
        if (!event.data || event.data.senderId === instanceId) return;
        handleSharedUpdate(event.data.type, event.data);
      });
      syncChannel = { publish: (type, payload = {}) => legacyChannel.postMessage({ ...payload, type, senderId: instanceId, revision: Date.now() }) };
    }
  }

  function broadcastUpdate(type) {
    syncChannel?.publish(type);
  }

  function broadcastDisplayCommand(command, itemId) {
    if (!settings.controlLinkEnabled || viewMode !== 'all') return;
    syncChannel?.publish('display-command', { command, itemId });
    if (serverMode) postServerCommand(command, itemId);
  }

  function buildServerState() {
    const sharedSettings = cloneSettings(settings);
    delete sharedSettings.selectedIds;
    return {
      schema: 'material-view.state.v1', revision: serverRevision,
      articles: items, extraCatalog: extraItems, displayOrder: itemOrder,
      selectedIds: settings.selectedIds || [], currentId, sharedSettings,
      importedBatches: loadImportedBatches()
    };
  }

  function cacheServerState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state.sharedSettings, selectedIds: state.selectedIds }));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state.articles));
      localStorage.setItem(EXTRA_STORAGE_KEY, JSON.stringify(state.extraCatalog));
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(state.displayOrder));
      localStorage.setItem(IMPORTED_BATCHES_STORAGE_KEY, JSON.stringify(state.importedBatches));
    } catch (error) { console.warn('Server state cache could not be saved.', error); }
  }

  function applyServerState(state) {
    if (!state || state.schema !== 'material-view.state.v1') return false;
    serverRevision = state.revision;
    items = Array.isArray(state.articles) ? state.articles : [];
    extraItems = Array.isArray(state.extraCatalog) ? state.extraCatalog.map(normalizeExtraItem) : [];
    itemOrder = Array.isArray(state.displayOrder) ? state.displayOrder : [];
    settings = mergeConfig(fileConfig, state.sharedSettings || {});
    settings.selectedIds = Array.isArray(state.selectedIds) ? state.selectedIds : [];
    currentId = typeof state.currentId === 'string' ? state.currentId : null;
    cacheServerState(state);
    reconcileViewerOrder(false);
    return true;
  }

  async function initializeServerMode() {
    try {
      const response = await fetch('/api/material-view/state', { cache: 'no-store' });
      if (!response.ok) throw new Error(`state_get_${response.status}`);
      const state = await response.json();
      serverRevision = state.revision || 0;
      serverReady = true;
      if (state.revision > 0) applyServerState(state);
      else await flushServerState(true);
      connectServerSocket();
      document.documentElement.dataset.vctServer = 'connected';
    } catch (error) {
      serverReady = false;
      document.documentElement.dataset.vctServer = 'fallback';
      console.warn('Material Server unavailable; Sync cache is active.', error);
    }
  }

  function scheduleServerSave() {
    if (!serverMode || !serverReady) return;
    serverDirty = true;
    clearTimeout(serverSaveTimer);
    serverSaveTimer = setTimeout(() => flushServerState(), 100);
  }

  async function flushServerState(force = false) {
    if (!serverMode || !serverReady || (serverSaving && !force)) return;
    serverSaving = true;
    serverDirty = false;
    try {
      const response = await fetch('/api/material-view/state', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(buildServerState())
      });
      const result = await response.json();
      if (response.status === 409 && result.state) {
        applyServerState(result.state);
        applySettings(); renderSettings();
        if (viewMode !== 'settings') renderDisplay();
      }
      else if (!response.ok) throw new Error(result.error || `state_put_${response.status}`);
      else serverRevision = result.state.revision;
    } catch (error) {
      console.warn('Material Server update failed; local cache was kept.', error);
    } finally {
      serverSaving = false;
      if (serverDirty) scheduleServerSave();
    }
  }

  function connectServerSocket() {
    if (!serverMode) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    serverSocket = new WebSocket(`${protocol}//${location.host}/events`);
    serverSocket.addEventListener('open', () => {
      if (viewMode === 'all') postServerCommand('visibility-query');
      if (viewMode === 'view') postServerCommand('visibility-status', null, viewOutputVisible);
    });
    serverSocket.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message.schema !== 'material-hub.event.v1') return;
        if (message.eventType === 'state' && message.payload?.revision > serverRevision) {
          applyServerState(message.payload); applySettings(); renderSettings();
          if (viewMode !== 'settings') renderDisplay();
        }
        if (message.eventType === 'command') handleServerCommand(message.payload || {});
      } catch (error) { console.warn('Material Server message was ignored.', error); }
    });
    serverSocket.addEventListener('close', () => {
      if (viewMode === 'all') {
        linkedViewConnected = false;
        renderViewVisibilityControl();
      }
      setTimeout(connectServerSocket, 3000);
    });
  }

  function handleServerCommand(payload) {
    if (payload.command === 'visibility-query' && viewMode === 'view') {
      postServerCommand('visibility-status', null, viewOutputVisible);
      return;
    }
    if (payload.command === 'visibility-status' && viewMode === 'all' && typeof payload.value === 'boolean') {
      linkedViewConnected = true;
      linkedViewVisible = payload.value;
      renderViewVisibilityControl();
      return;
    }
    if (viewMode !== 'view' || !settings.controlLinkEnabled) return;
    if (payload.command === 'show-list') showList(false);
    if (payload.command === 'show-detail' && typeof payload.itemId === 'string') showDetail(payload.itemId, false);
    if (payload.command === 'visibility-command' && typeof payload.value === 'boolean') setViewOutputVisible(payload.value);
  }

  function postServerCommand(command, itemId = null, value = null) {
    fetch('/api/material-view/command', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command, itemId, value })
    }).catch(error => console.warn('Material Server command failed.', error));
  }

  function setViewOutputVisible(visible, reportStatus = true) {
    viewOutputVisible = Boolean(visible);
    document.body.classList.toggle('view-output-hidden', !viewOutputVisible);
    if (reportStatus) {
      syncChannel?.publish('visibility-status', { visible: viewOutputVisible });
      if (serverMode) postServerCommand('visibility-status', null, viewOutputVisible);
    }
  }

  function renderViewVisibilityControl() {
    if (!elements.viewVisibilityButton) return;
    const enabled = viewMode === 'all' && settings.controlLinkEnabled;
    elements.viewVisibilityButton.disabled = !enabled || !linkedViewConnected;
    elements.viewVisibilityButton.classList.toggle('is-hidden', !linkedViewVisible);
    elements.viewVisibilityButton.setAttribute('aria-pressed', String(linkedViewVisible));
    elements.viewVisibilityButton.textContent = enabled
      ? (!linkedViewConnected ? 'VIEW 接続待ち' : (linkedViewVisible ? 'VIEW 表示中' : 'VIEW 非表示'))
      : 'VIEW 連動OFF';
  }

  function handleSharedUpdate(type, payload = {}) {
    if (serverMode && SERVER_PERSISTED_UPDATE_TYPES.has(type)) return;
    if (type === 'settings-updated') {
      settings = loadSettings();
      if (viewMode === 'settings') settingsBeforeEdit = cloneSettings(settings);
      if (viewMode === 'view' && !settings.controlLinkEnabled) setViewOutputVisible(true, false);
    } else if (type === 'queue-updated') {
      const previousIds = new Set(items.map(item => item.id));
      items = loadArticleQueue();
      const newIds = items.filter(item => !previousIds.has(item.id)).map(item => item.id);
      settings.selectedIds = [...new Set([...(settings.selectedIds || []), ...newIds])]
        .filter(id => [...items, ...extraItems].some(item => item.id === id));
      if (currentId && ![...items, ...extraItems].some(item => item.id === currentId)) currentId = null;
      reconcileViewerOrder(true);
    } else if (type === 'extra-updated') {
      const previousIds = new Set(extraItems.map(item => item.id));
      extraItems = loadExtraCatalog();
      const newIds = extraItems.filter(item => !previousIds.has(item.id)).map(item => item.id);
      settings.selectedIds = [...new Set([...(settings.selectedIds || []), ...newIds])]
        .filter(id => [...items, ...extraItems].some(item => item.id === id));
      if (currentId?.startsWith('extra:') && !extraItems.some(item => item.id === currentId)) currentId = null;
      reconcileViewerOrder(true);
    } else if (type === 'order-updated') {
      itemOrder = loadViewerOrder();
      reconcileViewerOrder(false);
    } else if (type === 'display-command') {
      if (viewMode !== 'view' || !settings.controlLinkEnabled) return;
      if (payload.command === 'show-list') showList(false);
      if (payload.command === 'show-detail' && typeof payload.itemId === 'string') {
        const item = getContentItems().find(candidate => candidate.id === payload.itemId && settings.selectedIds.includes(candidate.id));
        if (item) showDetail(item.id, false);
      }
      return;
    } else if (type === 'visibility-command') {
      if (viewMode !== 'view' || !settings.controlLinkEnabled || typeof payload.visible !== 'boolean') return;
      setViewOutputVisible(payload.visible);
      return;
    } else if (type === 'visibility-query') {
      if (viewMode === 'view') syncChannel?.publish('visibility-status', { visible: viewOutputVisible });
      return;
    } else if (type === 'visibility-status') {
      if (viewMode !== 'all' || typeof payload.visible !== 'boolean') return;
      linkedViewConnected = true;
      linkedViewVisible = payload.visible;
      renderViewVisibilityControl();
      return;
    } else {
      return;
    }
    applySettings();
    renderSettings();
    if (viewMode !== 'settings') {
      if (items.length || extraItems.length) renderDisplay();
      else showMessage('記事がありません', 'Material Hubから新しい記事を追加してください。');
    }
  }

  function mergeConfig(base, override) {
    return {
      ...base,
      ...override,
      appearance: { ...base.appearance, ...(override.appearance || {}) },
      labels: { ...base.labels, ...(override.labels || {}) },
      typography: { ...base.typography, ...(override.typography || {}) },
      colors: { ...base.colors, ...(override.colors || {}) }
    };
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === 'object' ? mergeConfig(fileConfig, saved) : mergeConfig(DEFAULT_CONFIG, fileConfig);
    } catch (error) {
      console.warn('Material View settings could not be loaded.', error);
      return mergeConfig(DEFAULT_CONFIG, fileConfig);
    }
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch (error) { console.warn('Material View settings could not be saved.', error); }
    scheduleServerSave();
  }

  function validateData(value) {
    if (!value || typeof value !== 'object') return { ok: false, message: 'active_material.js が見つからないか、内容が不正です。' };
    if (value.schemaVersion !== '1.0' || value.source !== 'material-hub' || !Array.isArray(value.items)) {
      return { ok: false, message: '対応していないデータ形式です。Material Hubから書き出し直してください。' };
    }
    const invalid = value.items.some(item => !item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' || !item.title || typeof item.fact !== 'string' || !item.fact);
    return invalid ? { ok: false, message: '必須項目（id、title、fact）が不足している記事があります。' } : { ok: true };
  }

  function validateExtraData(value) {
    if (!value || typeof value !== 'object') return { ok: false };
    if (value.schemaVersion !== '1.0' || value.source !== 'material-editor' || value.deliveryMode !== 'replace' || !Array.isArray(value.items)) return { ok: false };
    const invalid = value.items.some(item => !item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' || !item.title || typeof item.fact !== 'string' || !item.fact);
    return { ok: !invalid };
  }

  function normalizeExtraItem(item) {
    return { ...item, id: item.id.startsWith('extra:') ? item.id : `extra:${item.id}`, dataSource: 'extra' };
  }

  function loadExtraCatalog() {
    try {
      const saved = JSON.parse(localStorage.getItem(EXTRA_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item?.id && item?.title && item?.fact).map(normalizeExtraItem) : [];
    } catch (error) { console.warn('Material View extra catalog could not be loaded.', error); return []; }
  }

  function replaceExtraCatalog(value) {
    const nextItems = value.items.map(normalizeExtraItem);
    try { localStorage.setItem(EXTRA_STORAGE_KEY, JSON.stringify(nextItems)); }
    catch (error) { console.warn('Material View extra catalog could not be saved.', error); }
    scheduleServerSave();
    return nextItems;
  }

  function loadViewerOrder() {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
    } catch (error) { console.warn('Material View display order could not be loaded.', error); return []; }
  }

  function saveViewerOrder() {
    try { localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(itemOrder)); }
    catch (error) { console.warn('Material View display order could not be saved.', error); }
    scheduleServerSave();
  }

  function reconcileViewerOrder(persist) {
    const availableIds = [...items, ...extraItems].map(item => item.id);
    const available = new Set(availableIds);
    itemOrder = [...new Set(itemOrder.filter(id => available.has(id)))];
    const known = new Set(itemOrder);
    availableIds.forEach(id => { if (!known.has(id)) { itemOrder.push(id); known.add(id); } });
    if (persist) saveViewerOrder();
  }

  function sortByViewerOrder(sourceItems) {
    const ranks = new Map(itemOrder.map((id, index) => [id, index]));
    return [...sourceItems].sort((left, right) => (ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  }

  function getContentItems() {
    if (settings.contentMode === 'extra') return sortByViewerOrder(extraItems);
    if (settings.contentMode === 'mixed') return sortByViewerOrder([...items, ...extraItems]);
    return sortByViewerOrder(items);
  }

  function loadArticleQueue() {
    try {
      const saved = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item?.id && item?.title && item?.fact) : [];
    } catch (error) {
      console.warn('Material View article queue could not be loaded.', error);
      return [];
    }
  }

  function saveArticleQueue() {
    try { localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items)); }
    catch (error) { console.warn('Material View article queue could not be saved.', error); }
    scheduleServerSave();
  }

  function getBatchId(batch) {
    if (typeof batch.batchId === 'string' && batch.batchId) return batch.batchId;
    return `legacy-${batch.exportedAt || 'undated'}-${batch.items.map(item => item.id).join('-')}`;
  }

  function loadImportedBatches() {
    try {
      const saved = JSON.parse(localStorage.getItem(IMPORTED_BATCHES_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) { return []; }
  }

  function importIncomingBatch(batch) {
    const batchId = getBatchId(batch);
    const importedBatches = loadImportedBatches();
    if (importedBatches.includes(batchId)) return { added: 0, skipped: true, newIds: [] };
    const existingIds = new Set(items.map(item => item.id));
    const newItems = batch.items.filter(item => !existingIds.has(item.id)).map(item => ({ ...item }));
    items.push(...newItems);
    saveArticleQueue();
    try {
      localStorage.setItem(IMPORTED_BATCHES_STORAGE_KEY, JSON.stringify([batchId, ...importedBatches].slice(0, 100)));
    } catch (error) { console.warn('Imported batch history could not be saved.', error); }
    return { added: newItems.length, skipped: false, newIds: newItems.map(item => item.id) };
  }

  function reconcileSelectedIds() {
    const available = new Set([...items, ...extraItems].map(item => item.id));
    if (!Array.isArray(settings.selectedIds)) settings.selectedIds = [...available];
    else settings.selectedIds = settings.selectedIds.filter(id => available.has(id));
    saveSettings();
  }

  function bindEvents() {
    elements.settingsButton.addEventListener('click', openSettings);
    elements.viewVisibilityButton.addEventListener('click', () => {
      if (!settings.controlLinkEnabled || viewMode !== 'all') return;
      linkedViewVisible = !linkedViewVisible;
      renderViewVisibilityControl();
      syncChannel?.publish('visibility-command', { visible: linkedViewVisible });
      if (serverMode) postServerCommand('visibility-command', null, linkedViewVisible);
    });
    elements.cancelSettingsButton.addEventListener('click', cancelSettingsAndClose);
    elements.saveSettingsButton.addEventListener('click', saveSettingsAndStay);
    elements.backButton.addEventListener('click', () => showList(true));
    elements.selectAllButton.addEventListener('click', () => setAllArticles(true));
    elements.clearAllButton.addEventListener('click', () => setAllArticles(false));
    elements.resetSettingsButton.addEventListener('click', resetSettings);
    elements.backupViewerButton.addEventListener('click', exportViewerBackup);
    elements.copyViewerBackupButton.addEventListener('click', copyViewerBackup);
    elements.saveViewerBackupButton.addEventListener('click', saveViewerBackupFile);
    elements.restoreViewerButton.addEventListener('click', () => elements.restoreViewerInput.click());
    elements.restoreViewerInput.addEventListener('change', importViewerBackup);
    elements.reloadViewerDataButton.addEventListener('click', rebuildViewerData);
    document.querySelectorAll('input[name="layoutMode"]').forEach(input => input.addEventListener('change', readSettingsForm));
    document.querySelectorAll('input[name="contentMode"]').forEach(input => input.addEventListener('change', () => { readSettingsForm(); renderViewerOrder(); }));
    elements.controlLinkEnabled.addEventListener('change', readSettingsForm);
    elements.panelHeading.addEventListener('input', readSettingsForm);
    ['panelBackground', 'panelHeadingText', 'titleBackground', 'titleBorder', 'titleText', 'detailBackground', 'detailText'].forEach(id => {
      const picker = elements[id];
      const textInput = elements[`${id}Text`];
      picker.addEventListener('input', () => {
        textInput.value = picker.value.toUpperCase();
        readSettingsForm();
      });
      textInput.addEventListener('input', () => {
        const color = normalizeHexColor(textInput.value);
        if (!color) return;
        picker.value = color;
        readSettingsForm();
      });
      textInput.addEventListener('change', () => {
        const color = normalizeHexColor(textInput.value) || picker.value;
        picker.value = color;
        textInput.value = color.toUpperCase();
        readSettingsForm();
      });
    });
    elements.panelOpacity.addEventListener('input', () => {
      elements.panelOpacityNumber.value = elements.panelOpacity.value;
      readSettingsForm();
    });
    elements.panelOpacityNumber.addEventListener('input', () => {
      const value = normalizeOpacity(elements.panelOpacityNumber.value);
      if (value === null) return;
      elements.panelOpacity.value = value;
      readSettingsForm();
    });
    elements.panelOpacityNumber.addEventListener('change', () => {
      const value = normalizeOpacity(elements.panelOpacityNumber.value) ?? Number(elements.panelOpacity.value);
      elements.panelOpacity.value = value;
      elements.panelOpacityNumber.value = value;
      readSettingsForm();
    });
    ['detailTitleScale', 'detailTextScale'].forEach(id => {
      const slider = elements[id];
      const numberInput = elements[`${id}Number`];
      slider.addEventListener('input', () => {
        numberInput.value = slider.value;
        readSettingsForm();
      });
      numberInput.addEventListener('input', () => {
        const value = normalizeScale(numberInput.value);
        if (value === null) return;
        slider.value = value;
        readSettingsForm();
      });
      numberInput.addEventListener('change', () => {
        const value = normalizeScale(numberInput.value) ?? Number(slider.value);
        slider.value = value;
        numberInput.value = value;
        readSettingsForm();
      });
    });
  }

  function applySettings() {
    const root = document.documentElement.style;
    root.setProperty('--panel-bg', hexToRgba(settings.colors.panelBackground, normalizeOpacity(settings.appearance.panelOpacity) / 100));
    root.setProperty('--panel-heading-text', settings.colors.panelHeadingText);
    elements.panelHeadingLabel.textContent = settings.labels.panelHeading || 'Topics';
    root.setProperty('--title-bg', settings.colors.titleBackground);
    root.setProperty('--title-border', settings.colors.titleBorder);
    root.setProperty('--title-text', settings.colors.titleText);
    root.setProperty('--detail-bg', settings.colors.detailBackground);
    root.setProperty('--detail-text', settings.colors.detailText);
    root.setProperty('--detail-title-size', `${4 * normalizeScale(settings.typography.detailTitleScale) / 100}vw`);
    root.setProperty('--detail-body-size', `${2.05 * normalizeScale(settings.typography.detailTextScale) / 100}vw`);
    elements.displayScreen.classList.toggle('split', settings.layoutMode === 'split');
    renderViewVisibilityControl();
  }

  function renderDisplay() {
    const contentItems = getContentItems();
    const visibleItems = contentItems.filter(item => settings.selectedIds.includes(item.id));
    const layoutChanged = renderedLayoutMode !== settings.layoutMode;
    renderedLayoutMode = settings.layoutMode;
    elements.messageScreen.classList.add('hidden');
    elements.displayScreen.classList.remove('hidden');
    elements.visibleCount.textContent = `${visibleItems.length} TOPICS`;
    elements.topicList.replaceChildren();

    if (!visibleItems.length) {
      const empty = document.createElement('p');
      empty.className = 'help-text';
      empty.textContent = '表示対象の記事がありません。設定から記事を選択してください。';
      elements.topicList.appendChild(empty);
      showList();
      return;
    }

    visibleItems.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `topic-button${item.id === currentId ? ' active' : ''}`;
      const category = document.createElement('span');
      category.className = 'topic-category';
      category.textContent = `${item.dataSource === 'extra' ? '案内 · ' : ''}${item.category || 'TOPIC'}`;
      const title = document.createElement('span');
      title.className = 'topic-title';
      title.textContent = item.title;
      const arrow = document.createElement('span');
      arrow.className = 'topic-arrow';
      arrow.textContent = '›';
      button.append(category, title, arrow);
      button.addEventListener('click', () => showDetail(item.id, true));
      elements.topicList.appendChild(button);
    });

    if (settings.layoutMode === 'split') {
      showDetail(currentId && visibleItems.some(item => item.id === currentId) ? currentId : visibleItems[0].id);
    } else if (!layoutChanged && currentId && visibleItems.some(item => item.id === currentId)) {
      showDetail(currentId);
    } else {
      showList();
    }
  }

  function showDetail(id, userInitiated = false) {
    const contentItems = getContentItems();
    const item = contentItems.find(candidate => candidate.id === id && settings.selectedIds.includes(candidate.id));
    if (!item) return showList();
    currentId = item.id;
    elements.detailCategory.textContent = `${item.dataSource === 'extra' ? '案内 · ' : ''}${item.category || 'TOPIC'}`;
    elements.detailTitle.textContent = item.title;
    elements.detailFact.textContent = item.fact;
    elements.detailReaction.textContent = item.reaction || '—';
    elements.detailTips.textContent = item.tips || '—';
    elements.detailPane.classList.remove('hidden');
    if (settings.layoutMode === 'switch') elements.listPane.classList.add('hidden');
    else elements.listPane.classList.remove('hidden');
    elements.backButton.classList.toggle('hidden', settings.layoutMode === 'split');
    elements.topicList.querySelectorAll('.topic-button').forEach((button, index) => {
      button.classList.toggle('active', contentItems.filter(candidate => settings.selectedIds.includes(candidate.id))[index]?.id === item.id);
    });
    if (userInitiated) broadcastDisplayCommand('show-detail', item.id);
    if (userInitiated) scheduleServerSave();
  }

  function showList(userInitiated = false) {
    currentId = null;
    elements.listPane.classList.remove('hidden');
    if (settings.layoutMode === 'switch') elements.detailPane.classList.add('hidden');
    if (userInitiated) broadcastDisplayCommand('show-list');
    if (userInitiated) scheduleServerSave();
  }

  function openSettings() {
    settingsBeforeEdit = cloneSettings(settings);
    elements.displayScreen.classList.add('hidden');
    elements.settingsScreen.classList.remove('hidden');
    renderSettings();
  }

  function saveSettingsAndStay() {
    readSettingsForm();
    saveSettings();
    settingsBeforeEdit = cloneSettings(settings);
    broadcastUpdate('settings-updated');
  }

  function cancelSettingsAndClose() {
    if (settingsBeforeEdit) settings = settingsBeforeEdit;
    settingsBeforeEdit = null;
    elements.settingsScreen.classList.add('hidden');
    applySettings();
    renderDisplay();
  }

  function cloneSettings(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function renderSettings() {
    const selectedLayout = document.querySelector(`input[name="layoutMode"][value="${settings.layoutMode}"]`);
    if (selectedLayout) selectedLayout.checked = true;
    const selectedContent = document.querySelector(`input[name="contentMode"][value="${settings.contentMode}"]`);
    if (selectedContent) selectedContent.checked = true;
    elements.controlLinkEnabled.checked = settings.controlLinkEnabled === true;
    elements.panelHeading.value = settings.labels.panelHeading || 'Topics';
    const panelOpacity = normalizeOpacity(settings.appearance.panelOpacity);
    elements.panelOpacity.value = panelOpacity;
    elements.panelOpacityNumber.value = panelOpacity;
    Object.keys(settings.colors).forEach(key => {
      if (!elements[key]) return;
      const color = normalizeHexColor(settings.colors[key]) || DEFAULT_CONFIG.colors[key];
      elements[key].value = color;
      elements[`${key}Text`].value = color.toUpperCase();
    });
    Object.keys(settings.typography).forEach(key => {
      const value = normalizeScale(settings.typography[key]);
      elements[key].value = value;
      elements[`${key}Number`].value = value;
    });
    const importText = importSummary.skipped ? '同じデータは取込済みです' : `今回 ${importSummary.added}件追加`;
    elements.dataStatus.textContent = `配信ネタ ${items.length}件・案内 ${extraItems.length}件（${importText}）`;
    elements.articleChecks.replaceChildren();
    renderArticleGroup('配信ネタ', items, true);
    renderArticleGroup('案内・紹介', extraItems, false);
    renderViewerOrder();
  }

  function renderArticleGroup(title, groupItems, removable) {
    const group = document.createElement('section');
    group.className = 'article-group';
    const heading = document.createElement('div');
    heading.className = 'article-group-heading';
    const headingTitle = document.createElement('h3');
    headingTitle.textContent = title;
    const count = document.createElement('span');
    count.textContent = `${groupItems.length}件`;
    heading.append(headingTitle, count);
    const list = document.createElement('div');
    list.className = 'article-group-list';
    if (!groupItems.length) {
      const empty = document.createElement('p');
      empty.className = 'article-group-empty';
      empty.textContent = `${title}の記事はありません`;
      list.appendChild(empty);
    }
    groupItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'article-check';
      const label = document.createElement('label');
      label.className = 'article-check-main';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = settings.selectedIds.includes(item.id);
      input.addEventListener('change', () => {
        if (input.checked) settings.selectedIds = [...new Set([...settings.selectedIds, item.id])];
        else settings.selectedIds = settings.selectedIds.filter(id => id !== item.id);
      });
      const text = document.createElement('span');
      text.textContent = item.title;
      label.append(input, text);
      row.append(label);
      if (removable) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'article-remove-button';
        removeButton.textContent = '使用後に削除';
        removeButton.addEventListener('click', () => removeQueueItem(item.id));
        row.append(removeButton);
      }
      list.appendChild(row);
    });
    group.append(heading, list);
    elements.articleChecks.appendChild(group);
  }

  function renderViewerOrder() {
    const orderedItems = getContentItems();
    elements.viewerOrderList.replaceChildren();
    if (!orderedItems.length) {
      const empty = document.createElement('p');
      empty.className = 'article-group-empty';
      empty.textContent = '現在のデータ種別に記事はありません';
      elements.viewerOrderList.appendChild(empty);
      return;
    }
    orderedItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'viewer-order-item';
      const source = document.createElement('span');
      source.className = 'viewer-order-source';
      source.textContent = item.dataSource === 'extra' ? '案内' : '配信ネタ';
      const title = document.createElement('span');
      title.className = 'viewer-order-title';
      title.textContent = item.title;
      const actions = document.createElement('div');
      actions.className = 'viewer-order-actions';
      const up = document.createElement('button');
      up.type = 'button'; up.textContent = '↑'; up.disabled = index === 0; up.setAttribute('aria-label', '上へ移動');
      up.dataset.itemId = item.id;
      up.dataset.direction = '-1';
      up.addEventListener('click', () => moveViewerItem(item.id, -1));
      const down = document.createElement('button');
      down.type = 'button'; down.textContent = '↓'; down.disabled = index === orderedItems.length - 1; down.setAttribute('aria-label', '下へ移動');
      down.dataset.itemId = item.id;
      down.dataset.direction = '1';
      down.addEventListener('click', () => moveViewerItem(item.id, 1));
      actions.append(up, down);
      row.append(source, title, actions);
      elements.viewerOrderList.appendChild(row);
    });
  }

  function moveViewerItem(id, direction) {
    const visibleOrder = getContentItems().map(item => item.id);
    const index = visibleOrder.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visibleOrder.length) return;
    const firstPosition = itemOrder.indexOf(visibleOrder[index]);
    const secondPosition = itemOrder.indexOf(visibleOrder[target]);
    if (firstPosition < 0 || secondPosition < 0) return;
    [itemOrder[firstPosition], itemOrder[secondPosition]] = [itemOrder[secondPosition], itemOrder[firstPosition]];
    saveViewerOrder();
    broadcastUpdate('order-updated');
    renderViewerOrder();
    const movedButton = Array.from(elements.viewerOrderList.querySelectorAll('.viewer-order-actions button'))
      .find(button => button.dataset.itemId === id && Number(button.dataset.direction) === direction);
    if (movedButton && !movedButton.disabled) {
      movedButton.focus({ preventScroll: true });
      movedButton.scrollIntoView({ block: 'nearest' });
    }
  }

  function removeQueueItem(id) {
    items = items.filter(item => item.id !== id);
    settings.selectedIds = settings.selectedIds.filter(selectedId => selectedId !== id);
    if (settingsBeforeEdit?.selectedIds) {
      settingsBeforeEdit.selectedIds = settingsBeforeEdit.selectedIds.filter(selectedId => selectedId !== id);
    }
    if (currentId === id) currentId = null;
    saveArticleQueue();
    reconcileViewerOrder(true);
    saveSettings();
    broadcastUpdate('queue-updated');
    renderSettings();
    if (items.length === 0 && extraItems.length === 0) {
      settingsBeforeEdit = null;
      showMessage('記事がありません', 'Material Hubから新しい記事を追加してください。');
    }
  }

  function readSettingsForm() {
    settings.layoutMode = document.querySelector('input[name="layoutMode"]:checked')?.value || 'switch';
    settings.contentMode = document.querySelector('input[name="contentMode"]:checked')?.value || 'active';
    settings.controlLinkEnabled = elements.controlLinkEnabled.checked;
    settings.labels = { panelHeading: elements.panelHeading.value.trim() || 'Topics' };
    settings.colors = {
      panelBackground: normalizeHexColor(elements.panelBackgroundText.value) || elements.panelBackground.value,
      panelHeadingText: normalizeHexColor(elements.panelHeadingTextText.value) || elements.panelHeadingText.value,
      titleBackground: normalizeHexColor(elements.titleBackgroundText.value) || elements.titleBackground.value,
      titleBorder: normalizeHexColor(elements.titleBorderText.value) || elements.titleBorder.value,
      titleText: normalizeHexColor(elements.titleTextText.value) || elements.titleText.value,
      detailBackground: normalizeHexColor(elements.detailBackgroundText.value) || elements.detailBackground.value,
      detailText: normalizeHexColor(elements.detailTextText.value) || elements.detailText.value
    };
    settings.typography = {
      detailTitleScale: normalizeScale(elements.detailTitleScaleNumber.value),
      detailTextScale: normalizeScale(elements.detailTextScaleNumber.value)
    };
    settings.appearance = { panelOpacity: normalizeOpacity(elements.panelOpacityNumber.value) };
    applySettings();
  }

  function normalizeOpacity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.min(100, Math.max(0, Math.round(number / 5) * 5));
  }

  function hexToRgba(value, alpha) {
    const hex = (normalizeHexColor(value) || '#FFFFFF').slice(1);
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function normalizeScale(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.min(130, Math.max(70, Math.round(number / 5) * 5));
  }

  function normalizeHexColor(value) {
    const match = String(value || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1].length === 3 ? [...match[1]].map(character => character.repeat(2)).join('') : match[1];
    return `#${hex.toUpperCase()}`;
  }

  function setAllArticles(checked) {
    settings.selectedIds = checked ? [...items, ...extraItems].map(item => item.id) : [];
    elements.articleChecks.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = checked; });
  }

  function resetSettings() {
    settings = mergeConfig(DEFAULT_CONFIG, fileConfig);
    settings.selectedIds = [...items, ...extraItems].map(item => item.id);
    applySettings();
    renderSettings();
  }

  function readStoredJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (error) { return fallback; }
  }

  async function exportViewerBackup() {
    const backup = {
      format: 'material-view-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings: readStoredJson(STORAGE_KEY, null),
        articleQueue: readStoredJson(QUEUE_STORAGE_KEY, []),
        extraCatalog: readStoredJson(EXTRA_STORAGE_KEY, []),
        displayOrder: readStoredJson(ORDER_STORAGE_KEY, []),
        importedBatches: readStoredJson(IMPORTED_BATCHES_STORAGE_KEY, [])
      }
    };
    const json = `${JSON.stringify(backup, null, 2)}\n`;
    elements.viewerBackupText.value = json;
    elements.viewerBackupText.classList.remove('hidden');
    elements.copyViewerBackupButton.hidden = false;
    elements.saveViewerBackupButton.hidden = !('showSaveFilePicker' in window);
    await copyViewerBackup('Viewerバックアップを作成し、JSONをクリップボードへコピーしました。');
  }

  async function copyViewerBackup(successMessage = 'ViewerバックアップJSONをクリップボードへコピーしました。') {
    const text = elements.viewerBackupText.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      elements.viewerBackupText.focus();
      elements.viewerBackupText.select();
      if (!document.execCommand('copy')) {
        elements.dataManagementStatus.textContent = '自動コピーできませんでした。JSON欄を選択して手動でコピーしてください。';
        return;
      }
    }
    elements.dataManagementStatus.textContent = successMessage;
  }

  async function saveViewerBackupFile() {
    const json = elements.viewerBackupText.value;
    if (!json || !('showSaveFilePicker' in window)) return;
    const filename = `material_view_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      const bytes = new TextEncoder().encode(json);
      const writable = await handle.createWritable();
      await writable.write({ type: 'write', position: 0, data: bytes });
      await writable.truncate(bytes.byteLength);
      await writable.close();
      const savedFile = await handle.getFile();
      if (savedFile.size !== bytes.byteLength) throw new Error(`write-size-mismatch:${savedFile.size}`);
      elements.dataManagementStatus.textContent = `Viewerバックアップを ${handle.name} に保存しました。`;
    } catch (error) {
      if (error?.name === 'AbortError') elements.dataManagementStatus.textContent = 'ファイル保存をキャンセルしました。コピー済みのJSONはそのまま利用できます。';
      else elements.dataManagementStatus.textContent = 'この環境ではファイルへ書き込めませんでした。コピー済みのJSONをテキストファイルへ貼り付けてください。';
    }
  }

  async function importViewerBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.format !== 'material-view-backup' || backup.version !== 1 || !backup.data || typeof backup.data !== 'object') throw new Error('unsupported');
      if (!window.confirm('現在のViewerデータをバックアップ内容で置き換えます。よろしいですか？')) return;
      const entries = [
        [STORAGE_KEY, backup.data.settings],
        [QUEUE_STORAGE_KEY, backup.data.articleQueue],
        [EXTRA_STORAGE_KEY, backup.data.extraCatalog],
        [ORDER_STORAGE_KEY, backup.data.displayOrder],
        [IMPORTED_BATCHES_STORAGE_KEY, backup.data.importedBatches]
      ];
      entries.forEach(([key, value]) => value === null || value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)));
      broadcastUpdate('settings-updated');
      broadcastUpdate('queue-updated');
      broadcastUpdate('extra-updated');
      broadcastUpdate('order-updated');
      window.location.reload();
    } catch (error) {
      elements.dataManagementStatus.textContent = '対応するViewerバックアップを読み込めませんでした。';
    }
  }

  function rebuildViewerData() {
    if (!window.confirm('Viewer内の記事・表示順・取込履歴を削除し、現在のJSファイルから再構築します。表示設定は維持されます。')) return;
    [QUEUE_STORAGE_KEY, EXTRA_STORAGE_KEY, ORDER_STORAGE_KEY, IMPORTED_BATCHES_STORAGE_KEY].forEach(key => localStorage.removeItem(key));
    settings.selectedIds = [];
    saveSettings();
    broadcastUpdate('queue-updated');
    broadcastUpdate('extra-updated');
    broadcastUpdate('order-updated');
    window.location.reload();
  }

  function showMessage(title, message) {
    elements.displayScreen.classList.add('hidden');
    elements.settingsScreen.classList.add('hidden');
    elements.messageTitle.textContent = title;
    elements.messageText.textContent = message;
    elements.messageScreen.classList.remove('hidden');
  }
})();
