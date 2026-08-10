(() => {
  'use strict';

  const VERSION = '0.1.0';
  const MODES = Object.freeze({ STANDARD: 'standard', SYNC: 'sync', SERVER: 'server' });

  function detectEnvironment(locationLike = window.location) {
    const protocol = locationLike.protocol || 'file:';
    const host = locationLike.hostname || '';
    const isLocalServer = (protocol === 'http:' || protocol === 'https:') &&
      ['127.0.0.1', 'localhost', '::1'].includes(host);
    return Object.freeze({ protocol, host, isFile: protocol === 'file:', isLocalServer });
  }

  function resolveMode(locationLike = window.location) {
    const environment = detectEnvironment(locationLike);
    if (environment.isFile) return MODES.STANDARD;
    const requested = new URL(locationLike.href).searchParams.get('vctMode')?.toLowerCase();
    if (requested === MODES.SERVER && environment.isLocalServer) return MODES.SERVER;
    return environment.isLocalServer ? MODES.SYNC : MODES.STANDARD;
  }

  function createStorage(storage = window.localStorage) {
    return Object.freeze({
      get(key, fallback = null) {
        try {
          const raw = storage.getItem(key);
          return raw === null ? fallback : JSON.parse(raw);
        } catch (error) {
          console.warn(`[VCTRuntime] Could not read ${key}`, error);
          return fallback;
        }
      },
      set(key, value) {
        try { storage.setItem(key, JSON.stringify(value)); return true; }
        catch (error) { console.warn(`[VCTRuntime] Could not write ${key}`, error); return false; }
      },
      remove(key) {
        try { storage.removeItem(key); return true; }
        catch (error) { console.warn(`[VCTRuntime] Could not remove ${key}`, error); return false; }
      },
    });
  }

  function createChannel(name, options = {}) {
    const senderId = options.senderId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel(name) : null;
    const listeners = new Set();
    channel?.addEventListener('message', event => {
      if (!event.data || event.data.senderId === senderId) return;
      listeners.forEach(listener => listener(event.data));
    });
    return Object.freeze({
      name,
      senderId,
      supported: Boolean(channel),
      publish(type, payload = {}) {
        const message = { ...payload, type, senderId, revision: Date.now() };
        channel?.postMessage(message);
        return message;
      },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      close() { listeners.clear(); channel?.close(); },
    });
  }

  function observeStorage(keys, listener) {
    const accepted = new Set(keys);
    const handler = event => { if (accepted.has(event.key)) listener(event.key, event); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  function storageAvailable() {
    try { void window.localStorage.length; return true; } catch { return false; }
  }

  async function diagnostics() {
    let server = { connected: false, service: null, version: null };
    if (environment.isLocalServer && typeof window.fetch === 'function') {
      try {
        const response = await window.fetch('/health', { cache: 'no-store' });
        const health = response.ok ? await response.json() : null;
        server = { connected: Boolean(health?.ok), service: health?.service || null, version: health?.version || null };
      } catch { /* The diagnostic panel reports the disconnected state. */ }
    }
    return Object.freeze({
      runtimeVersion: VERSION,
      mode,
      origin: window.location.origin || 'file://',
      storage: storageAvailable(),
      broadcastChannel: typeof window.BroadcastChannel === 'function',
      server,
    });
  }

  async function showDiagnostics() {
    if (document.getElementById('vct-runtime-diagnostics')) return;
    const info = await diagnostics();
    const panel = document.createElement('aside');
    panel.id = 'vct-runtime-diagnostics';
    panel.setAttribute('aria-label', 'VCreatorTools diagnostics');
    panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:10px 12px;border:1px solid #475569;border-radius:8px;background:rgba(15,23,42,.94);color:#e2e8f0;font:12px/1.5 ui-monospace,monospace;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none';
    const status = value => value ? '<span style="color:#4ade80">OK</span>' : '<span style="color:#f87171">NG</span>';
    panel.innerHTML = `<strong>VCreatorTools</strong><br>Mode: ${info.mode}<br>Origin: ${info.origin}<br>Storage: ${status(info.storage)}<br>BroadcastChannel: ${status(info.broadcastChannel)}<br>Server: ${status(info.server.connected)}<br>Runtime: ${info.runtimeVersion}`;
    document.body.appendChild(panel);
  }

  const environment = detectEnvironment();
  const mode = resolveMode();
  document.documentElement.dataset.vctMode = mode;
  window.VCTRuntime = Object.freeze({
    version: VERSION,
    apiVersion: '0.1',
    MODES,
    mode,
    environment,
    storage: createStorage(),
    detectEnvironment,
    resolveMode,
    createStorage,
    createChannel,
    observeStorage,
    diagnostics,
    showDiagnostics,
  });
  if (new URL(window.location.href).searchParams.get('vctDebug') === '1') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showDiagnostics, { once: true });
    else showDiagnostics();
  }
})();
