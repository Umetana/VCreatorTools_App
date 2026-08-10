(function (global) {
  'use strict';

  const CHANNEL = 'vct:maro-panel:v2:channel';
  const STORAGE = 'vct:maro-panel:v2:state';
  const SERVER_CACHE = 'vct:maro-panel:v2:server-cache';
  const EVENT_SCHEMA = 'maro-panel.event.v2';

  class MaroClient {
    constructor(options = {}) {
      this.mode = options.mode || global.VCTRuntime?.mode || 'standard';
      this.storageKey = this.mode === 'server' ? SERVER_CACHE : STORAGE;
      this.storage = global.VCTRuntime?.storage;
      this.state = global.MaroSchema.createState();
      this.listeners = new Set();
      this.channel = null;
      this.socket = null;
    }

    loadLocal() {
      const saved = this.storage?.get(this.storageKey, null);
      const fallback = global.MARO_V2_LEGACY
        ? global.MaroSchema.fromLegacy(global.MARO_V2_LEGACY.config, global.MARO_V2_LEGACY.data)
        : this.state;
      this.state = global.MaroSchema.normalizeState(saved || fallback);
      return this.state;
    }

    persist() { this.storage?.set(this.storageKey, this.state); }
    emit() { this.listeners.forEach(listener => listener(this.state)); }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

    async initialize() {
      this.loadLocal();
      if (this.mode === 'server') {
        try { await this.refreshServer(); this.connectSocket(); } catch (error) { console.warn('[Maro V2] Server unavailable; cache is active.', error); }
      } else if (this.mode === 'sync') {
        this.channel = global.VCTRuntime.createChannel(CHANNEL);
        this.channel.subscribe(message => {
          if (message.type !== 'maro.state') return;
          const incoming = global.MaroSchema.normalizeState(message.state);
          if (incoming.revision < this.state.revision) return;
          this.state = incoming; this.persist(); this.emit();
        });
        this.channel.publish('maro.state.request');
        this.channel.subscribe(message => {
          if (message.type === 'maro.state.request') this.channel.publish('maro.state', { state: this.state });
        });
      }
      this.emit();
      return this.state;
    }

    async refreshServer() {
      const response = await fetch('/api/maro/v2/state', { cache: 'no-store' });
      if (!response.ok) throw new Error(`State request failed: ${response.status}`);
      this.state = global.MaroSchema.normalizeState(await response.json());
      this.persist(); this.emit(); return this.state;
    }

    connectSocket() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.socket = new WebSocket(`${protocol}//${location.host}/events`);
      this.socket.addEventListener('message', event => {
        try {
          const message = JSON.parse(event.data);
          if (message.schema !== EVENT_SCHEMA || message.eventType !== 'state') return;
          this.state = global.MaroSchema.normalizeState(message.payload);
          this.persist(); this.emit();
        } catch {}
      });
    }

    async replaceState(nextState) {
      const normalized = global.MaroSchema.normalizeState({ ...nextState, revision: this.state.revision });
      if (this.mode === 'server') {
        const response = await fetch('/api/maro/v2/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(normalized) });
        const result = await response.json();
        if (response.status === 409 && result.state) { this.state = global.MaroSchema.normalizeState(result.state); this.persist(); this.emit(); throw new Error('別画面で更新されたため、最新状態を読み込みました。'); }
        if (!response.ok) throw new Error(result.error || `Save failed: ${response.status}`);
        this.state = global.MaroSchema.normalizeState(result.state);
      } else {
        this.state = global.MaroSchema.normalizeState({ ...normalized, revision: this.state.revision + 1, updatedAt: new Date().toISOString() });
        this.channel?.publish('maro.state', { state: this.state });
      }
      this.persist(); this.emit(); return this.state;
    }

    async command(command, panelId = null) {
      if (this.mode === 'server') {
        const response = await fetch('/api/maro/v2/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command, panelId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Command failed: ${response.status}`);
        this.state = global.MaroSchema.normalizeState(result.state);
        this.persist(); this.emit(); return this.state;
      }
      const next = global.MaroSchema.normalizeState(this.state);
      const runtime = next.runtime;
      const opened = new Set(runtime.openedPanelIds);
      if (command === 'open' && panelId) { if (!opened.has(panelId)) runtime.history.push(panelId); opened.add(panelId); }
      else if (command === 'close' && panelId) opened.delete(panelId);
      else if (command === 'show-detail' && panelId) runtime.activePanelId = panelId;
      else if (command === 'hide-detail') runtime.activePanelId = null;
      else if (command === 'reset') { opened.clear(); runtime.activePanelId = null; runtime.history = []; }
      else if (command === 'undo') { const previous = runtime.history.pop(); if (previous) opened.delete(previous); runtime.activePanelId = null; }
      else if (command === 'show') runtime.visible = true;
      else if (command === 'hide') runtime.visible = false;
      else throw new Error('Unsupported command');
      runtime.openedPanelIds = [...opened];
      return this.replaceState(next);
    }
  }

  MaroClient.CHANNEL = CHANNEL;
  MaroClient.STORAGE = STORAGE;
  MaroClient.SERVER_CACHE = SERVER_CACHE;
  MaroClient.EVENT_SCHEMA = EVENT_SCHEMA;
  global.MaroClient = MaroClient;
})(window);
