(() => {
  'use strict';
  const KEYS = Object.freeze({ bridgeUrl: 'vct:total-operations-console:v2:bridge-url', words: 'vct:total-operations-console:v2:word-rules', favorites: 'vct:total-operations-console:v2:counter-favorites' });
  const COUNTERS_PER_PAGE = 6;
  const $ = id => document.getElementById(id);
  const repository = new CounterStateRepository({ storageKey: CounterMessageProtocol.storageKeyForMode(VCTRuntime.mode) });
  let counterState = repository.load([]);
  const counterClient = new CounterClient({ role: 'controller', repository });
  const counterServer = GPCounterServer.createClient({ role: 'controller', onState(next, message) { repository.accept(next, { force: true }); counterState = next; addLog(message?.type || 'counter.state'); renderCounters(); } });
  const effectRepository = new SettingsRepository();
  let effectSettings = effectRepository.load();
  let remoteEffectCatalog = { schema: 'vct.remote-effects', schemaVersion: 1, revision: 0, updatedAt: null, buttons: [] };
  let remoteEffectSelection = new Set();
  let counterFilter = 'favorites';
  let counterPage = 0;
  let counterFavorites = loadFavorites();
  const effectProtocol = new EffectMessageProtocol({ role: 'controller' });
  const effectTransport = new EffectTransportRouter();
  let bridgeSocket = null;
  let reconnectTimer = null;

  function addLog(text) {
    if (!text) return;
    const log = $('event-log');
    log.textContent = `${new Date().toLocaleTimeString()} ${text}\n${log.textContent}`.slice(0, 16000);
  }

  function button(label, handler, className = '') {
    const element = document.createElement('button');
    element.textContent = label; element.className = className; element.addEventListener('click', handler); return element;
  }

  function loadFavorites() {
    try { const value = JSON.parse(localStorage.getItem(KEYS.favorites) || '[]'); return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []); }
    catch { return new Set(); }
  }

  function saveFavorites() { localStorage.setItem(KEYS.favorites, JSON.stringify([...counterFavorites])); }

  function toggleFavorite(id) {
    if (counterFavorites.has(id)) counterFavorites.delete(id); else counterFavorites.add(id);
    saveFavorites(); renderCounters();
  }

  function selectCounterFilter(filter) {
    counterFilter = filter; counterPage = 0;
    document.querySelectorAll('.counter-filter').forEach(item => item.classList.toggle('active', item.dataset.counterFilter === filter));
    renderCounters();
  }

  function renderCounters() {
    $('counter-status').textContent = `${VCTRuntime.mode} / revision ${counterState.revision} / ${counterState.counters.length} counters`;
    const validIds = new Set(counterState.counters.map(counter => counter.id));
    const staleFavorites = [...counterFavorites].filter(id => !validIds.has(id));
    if (staleFavorites.length) { staleFavorites.forEach(id => counterFavorites.delete(id)); saveFavorites(); }
    const selected = counterFilter === 'favorites' ? counterState.counters.filter(counter => counterFavorites.has(counter.id)) : counterState.counters;
    const totalPages = Math.max(1, Math.ceil(selected.length / COUNTERS_PER_PAGE));
    counterPage = Math.min(counterPage, totalPages - 1);
    const visible = counterFilter === 'all' ? selected.slice(counterPage * COUNTERS_PER_PAGE, (counterPage + 1) * COUNTERS_PER_PAGE) : selected;
    $('counter-filter-status').textContent = counterFilter === 'favorites' ? `${selected.length} favorites` : `${selected.length} counters`;
    const pagination = $('counter-pagination');
    pagination.hidden = counterFilter !== 'all' || totalPages <= 1;
    $('counter-page').textContent = `${counterPage + 1} / ${totalPages}`;
    $('counter-prev').disabled = counterPage === 0; $('counter-next').disabled = counterPage >= totalPages - 1;
    const list = $('counter-list');
    if (!counterState.counters.length) { list.className = 'empty'; list.textContent = 'Counterがありません'; return; }
    if (!visible.length) { list.className = 'empty'; list.textContent = 'お気に入りはありません。「すべて」から★を選択してください。'; return; }
    list.className = '';
    list.replaceChildren(...visible.map(counter => {
      const row = document.createElement('div'); row.className = 'counter-row';
      const name = document.createElement('div'); name.className = 'counter-name'; name.textContent = `${counter.label} (${counter.id})`;
      const count = document.createElement('div'); count.className = 'counter-count'; count.textContent = counter.count;
      const favorite = button('★', () => toggleFavorite(counter.id), `favorite-button${counterFavorites.has(counter.id) ? ' active' : ''}`); favorite.title = 'お気に入り切り替え';
      row.append(favorite, name, count, button('+', () => operateCounter(counter.id, 'increment')), button('−', () => operateCounter(counter.id, 'decrement')), button('リセット', () => operateCounter(counter.id, 'reset')));
      return row;
    }));
  }

  async function operateCounter(id, operation) {
    if (counterServer.enabled) { try { await counterServer.command(operation, id, 1); } catch (error) { addLog(`Counter error: ${error.message}`); } return; }
    const counters = repository.getState().counters;
    const target = counters.find(counter => counter.id === id); if (!target) return;
    if (operation === 'increment') target.count += 1;
    else if (operation === 'decrement') target.count = Math.max(0, target.count - 1);
    else target.count = 0;
    counterClient.commit(counters, { operations: { [id]: operation }, cause: 'toc-v2' });
  }

  function renderEffects() {
    const grid = $('effect-grid');
    const buttons = [...effectSettings.buttons].sort((a, b) => a.gridIndex - b.gridIndex);
    if (!buttons.length) { grid.className = 'effect-grid empty'; grid.textContent = 'Effectボタンがありません'; return; }
    grid.className = 'effect-grid';
    grid.replaceChildren(...buttons.map(item => {
      const card = document.createElement('div'); card.className = 'effect-card';
      const element = button(item.label, () => {
        const result = effectTransport.publish(effectProtocol.create('effect.trigger', { effectId: item.effectId, params: item.params }));
        if (result?.then) {
          result.then(response => addLog(`effect.trigger accepted ${item.effectId} clients=${response.delivered}`))
            .catch(error => addLog(`Effect error: ${error.message}`));
        } else addLog(`effect.trigger ${item.effectId}`);
      }, 'effect-button');
      const icon = document.createElement('span'); icon.textContent = '✨'; element.prepend(icon);
      card.append(element);
      if (VCTRuntime.mode === VCTRuntime.MODES.SERVER) {
        const remoteLabel = document.createElement('label'); remoteLabel.className = 'effect-remote-toggle';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = remoteEffectSelection.has(item.id);
        checkbox.addEventListener('change', () => { if (checkbox.checked) remoteEffectSelection.add(item.id); else remoteEffectSelection.delete(item.id); updateRemoteEffectStatus(); });
        remoteLabel.append(checkbox, document.createTextNode(' Remoteへ公開')); card.append(remoteLabel);
      }
      return card;
    }));
  }

  function updateRemoteEffectStatus(text) {
    const target = $('remote-effect-status');
    if (!target) return;
    target.textContent = text || `revision ${remoteEffectCatalog.revision} / ${remoteEffectSelection.size} buttons`;
  }

  async function loadRemoteEffectCatalog() {
    if (VCTRuntime.mode !== VCTRuntime.MODES.SERVER) return;
    $('remote-effect-tools').hidden = false;
    try {
      const response = await fetch('/api/remote/effects', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `remote_effects_${response.status}`);
      remoteEffectCatalog = body.state;
      remoteEffectSelection = new Set(remoteEffectCatalog.buttons.map(item => item.buttonId));
      updateRemoteEffectStatus(); renderEffects();
    } catch (error) { updateRemoteEffectStatus(`読込エラー: ${error.message}`); }
  }

  async function saveRemoteEffectCatalog() {
    const currentButtons = [...effectSettings.buttons].sort((a, b) => a.gridIndex - b.gridIndex);
    const availableIds = new Set(currentButtons.map(item => item.id));
    remoteEffectSelection = new Set([...remoteEffectSelection].filter(id => availableIds.has(id)));
    const document = {
      schema: 'vct.remote-effects', schemaVersion: 1, revision: remoteEffectCatalog.revision, updatedAt: remoteEffectCatalog.updatedAt,
      buttons: currentButtons.filter(item => remoteEffectSelection.has(item.id)).map(item => ({
        buttonId: item.id, label: item.label, effectId: item.effectId, order: item.gridIndex, params: item.params
      }))
    };
    $('save-remote-effects').disabled = true; updateRemoteEffectStatus('保存中...');
    try {
      const response = await fetch('/api/remote/effects', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(document) });
      const body = await response.json();
      if (response.status === 409 && body.state) { remoteEffectCatalog = body.state; remoteEffectSelection = new Set(body.state.buttons.map(item => item.buttonId)); renderEffects(); throw new Error('他画面で更新されました。最新状態を再読込しました'); }
      if (!response.ok) throw new Error(body.error || `remote_effects_${response.status}`);
      remoteEffectCatalog = body.state; remoteEffectSelection = new Set(body.state.buttons.map(item => item.buttonId));
      updateRemoteEffectStatus(); renderEffects(); addLog(`Remote Effect Catalog saved revision=${body.state.revision}`);
    } catch (error) { updateRemoteEffectStatus(`保存エラー: ${error.message}`); }
    finally { $('save-remote-effects').disabled = false; }
  }

  function parseWords() { return $('word-rules').value.split(/[\s,，、　]+/).map(word => word.trim()).filter(Boolean); }
  function addEvent(targetId, text, detail, hit = false) {
    const target = $(targetId); if (target.classList.contains('empty')) { target.classList.remove('empty'); target.textContent = ''; }
    const entry = document.createElement('div'); entry.className = `event${hit ? ' hit' : ''}`; entry.textContent = text;
    const small = document.createElement('small'); small.textContent = detail; entry.appendChild(small); target.prepend(entry);
    while (target.children.length > 30) target.lastChild.remove();
  }

  function normalizedPair(payload) { return payload?.raw || payload?.normalized ? { raw: payload.raw || {}, normalized: payload.normalized || {} } : { raw: payload || {}, normalized: {} }; }
  function commentData(event) {
    const { raw, normalized } = normalizedPair(event.payload); const data = raw.data || {};
    const html = String(data.comment || ''); const box = document.createElement('div'); box.innerHTML = html;
    return { text: String(normalized.text || box.textContent || data.speechText || ''), user: String(normalized.user || data.displayName || data.name || '') };
  }
  function first(...values) { return values.find(value => value !== undefined && value !== null && value !== '') ?? null; }
  function formatMeta(value) { if (value === null) return '---'; const number = Number(value); return Number.isFinite(number) ? number.toLocaleString('ja-JP') : String(value); }
  function handleMeta(event) {
    const { raw, normalized } = normalizedPair(event.payload); const data = raw.data || {};
    const meta = {
      platform: first(normalized.platform, raw.type, raw.service?.name, event.source?.app, '---'),
      viewers: first(normalized.viewer, normalized.viewers, data.viewer, data.viewers),
      likes: first(normalized.upVote, normalized.likeCount, normalized.goodCount, normalized.likes, data.upVote, data.likeCount, data.goodCount, data.likes),
      subscribers: first(normalized.subscriberCount, normalized.subscribers, data.subscriberCount, data.subscribers)
    };
    $('meta-platform').textContent = formatMeta(meta.platform); $('meta-viewers').textContent = formatMeta(meta.viewers); $('meta-likes').textContent = formatMeta(meta.likes); $('meta-subscribers').textContent = formatMeta(meta.subscribers);
    addLog(`bridge meta ${meta.platform}`);
  }
  function handleComment(event) {
    const comment = commentData(event); if (!comment.text) return;
    addEvent('comments', comment.text, `${new Date().toLocaleTimeString()} ${comment.user || 'unknown'}`);
    const lower = comment.text.toLowerCase(); const hit = parseWords().find(word => lower.includes(word.toLowerCase()));
    if (hit) addEvent('word-hits', comment.text, `${new Date().toLocaleTimeString()} “${hit}” / ${comment.user || 'unknown'}`, true);
  }
  function receiveBridge(event) {
    if (!event || event.schema !== 'msbridge.event.v1') return;
    if (event.eventType !== 'meta' && event.eventType !== 'comment') return;
    setBridgeReception(true, event.eventType);
    if (event.eventType === 'meta') handleMeta(event); else handleComment(event);
  }

  function toWebSocketUrl(httpUrl) { const url = new URL(httpUrl); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; url.pathname = '/events'; url.search = ''; url.hash = ''; return url.href; }
  function setServerWsStatus(online, text) { const badge = $('server-ws-badge'); badge.className = `badge ${online ? 'online' : 'offline'}`; badge.textContent = text; }
  function setBridgeReception(received, eventType = '') {
    const badge = $('bridge-badge'); badge.className = `badge ${received ? 'online' : 'waiting'}`; badge.textContent = received ? 'Bridge 受信あり' : 'Bridge 受信待ち';
    if (received) $('meta-updated').textContent = `最終受信：${new Date().toLocaleTimeString()}（${eventType}）`;
  }
  function connectBridge() {
    clearTimeout(reconnectTimer); bridgeSocket?.close();
    setServerWsStatus(false, 'Server WS 接続中...'); setBridgeReception(false);
    try { bridgeSocket = new WebSocket(toWebSocketUrl($('bridge-url').value)); } catch (error) { setServerWsStatus(false, 'Server WS URL不正'); return; }
    const socket = bridgeSocket;
    socket.addEventListener('open', () => { if (bridgeSocket !== socket) return; setServerWsStatus(true, 'Server WS 接続中'); addLog('server websocket connected'); });
    socket.addEventListener('message', event => { if (bridgeSocket !== socket) return; try { receiveBridge(JSON.parse(event.data)); } catch { /* multiplexed invalid data is ignored */ } });
    socket.addEventListener('close', () => { if (bridgeSocket !== socket) return; setServerWsStatus(false, 'Server WS 切断'); setBridgeReception(false); reconnectTimer = setTimeout(connectBridge, 5000); });
    socket.addEventListener('error', () => { if (bridgeSocket === socket) setServerWsStatus(false, 'Server WS 接続エラー'); });
  }

  async function initialBridgeUrl() {
    const saved = localStorage.getItem(KEYS.bridgeUrl); if (saved) return saved;
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try { const response = await fetch('/health', { cache: 'no-store' }); const health = response.ok ? await response.json() : null; if (health?.service === 'vct-unified-server') return location.origin; } catch { }
    }
    return 'http://127.0.0.1:3000';
  }

  async function renderDiagnostics() {
    const info = await VCTRuntime.diagnostics(); const rows = { Mode: info.mode, Origin: info.origin, Storage: info.storage, BroadcastChannel: info.broadcastChannel, 'VCT Server': info.server.connected ? `${info.server.service} ${info.server.version}` : 'not detected', 'Bridge URL': $('bridge-url').value };
    const list = $('diagnostics'); list.replaceChildren(...Object.entries(rows).flatMap(([key, value]) => { const dt = document.createElement('dt'); dt.textContent = key; const dd = document.createElement('dd'); dd.textContent = String(value); return [dt, dd]; }));
    $('summary').textContent = `Mode: ${info.mode} / ${info.origin}`;
  }

  function configureNavigation() {
    const params = new URLSearchParams({ from: 'toc-v2' });
    if (VCTRuntime.mode === VCTRuntime.MODES.SERVER) params.set('vctMode', 'server');
    $('effect-settings-link').href = `../OBS_screen_effect_v2/config.html?${params}`;
  }

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.tab,.panel').forEach(element => element.classList.remove('active')); tab.classList.add('active'); $(`tab-${tab.dataset.tab}`).classList.add('active'); }));
  document.querySelectorAll('.counter-filter').forEach(item => item.addEventListener('click', () => selectCounterFilter(item.dataset.counterFilter)));
  $('counter-prev').addEventListener('click', () => { if (counterPage > 0) { counterPage -= 1; renderCounters(); } });
  $('counter-next').addEventListener('click', () => { counterPage += 1; renderCounters(); });
  $('word-rules').value = localStorage.getItem(KEYS.words) || '';
  $('word-rules').addEventListener('change', () => localStorage.setItem(KEYS.words, $('word-rules').value));
  $('bridge-reconnect').addEventListener('click', () => { localStorage.setItem(KEYS.bridgeUrl, $('bridge-url').value); connectBridge(); renderDiagnostics(); });
  $('clear-log').addEventListener('click', () => { $('event-log').textContent = ''; });
  $('save-remote-effects').addEventListener('click', saveRemoteEffectCatalog);
  effectTransport.subscribe(message => { try { const accepted = effectProtocol.receive(message); if (accepted?.type === 'settings.updated') { effectSettings = new SettingsValidator().normalize(accepted.payload.settings); renderEffects(); addLog('settings.updated'); } } catch { } });
  effectTransport.subscribeStatus(status => {
    const label = status.state === 'local' ? `${status.mode} / BroadcastChannel` : `server / ${status.state}`;
    $('effect-status').textContent = label;
    $('effect-status').style.color = status.connected ? 'var(--ok)' : (status.state === 'error' ? 'var(--bad)' : 'var(--muted)');
  });
  counterClient.subscribe(event => { if (event.state) counterState = event.state; addLog(event.message?.type); renderCounters(); });

  (async () => {
    configureNavigation(); renderCounters(); renderEffects(); await loadRemoteEffectCatalog();
    $('bridge-url').value = await initialBridgeUrl(); await renderDiagnostics(); connectBridge();
    if (counterServer.enabled) counterServer.initialize(counterState.counters).catch(error => addLog(`Counter Server: ${error.message}`));
    else counterClient.start({ knownRevision: counterState.revision });
  })();
})();
