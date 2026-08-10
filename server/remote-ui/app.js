(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const TAB_KEY = 'vct:remote:v1:active-tab';
  let events = null;
  let refreshTimer = null;
  let toastTimer = null;

  async function request(path, options = {}) {
    const response = await fetch(path, { cache: 'no-store', ...options });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) { showPairing(); throw new Error('authentication_required'); }
    if (!response.ok) throw new Error(body.error || `request_${response.status}`);
    return body;
  }

  function showPairing() {
    events?.close(); events = null;
    $('pairing').hidden = false; $('remote-content').hidden = true; $('remote-tabs').hidden = true; $('logout').hidden = true;
    setConnection(false, 'ペアリングが必要です');
  }

  function showRemote() {
    $('pairing').hidden = true; $('remote-content').hidden = false; $('remote-tabs').hidden = false; $('logout').hidden = false;
    selectTab(loadTab());
  }

  function loadTab() {
    try { const saved = localStorage.getItem(TAB_KEY); return saved === 'effect' ? saved : 'counter'; }
    catch { return 'counter'; }
  }

  function selectTab(tab) {
    const selected = tab === 'effect' ? 'effect' : 'counter';
    document.querySelectorAll('.tab').forEach(button => {
      const active = button.dataset.tab === selected; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === selected));
    try { localStorage.setItem(TAB_KEY, selected); } catch {}
  }

  function setConnection(online, text) {
    $('connection').textContent = text;
    $('connection').className = `status ${online ? 'online' : 'offline'}`;
  }

  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
  }

  function requestId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

  async function action(type, payload, control) {
    if (control) control.disabled = true;
    try {
      const result = await request('/remote/api/action', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId: requestId(), type, payload })
      });
      if (type === 'effect.trigger') toast(`発火: ${result.buttonId}`);
      scheduleRefresh();
    } catch (error) { if (error.message !== 'authentication_required') toast(`エラー: ${error.message}`); }
    finally { if (control) control.disabled = false; }
  }

  function renderCounters(counter) {
    $('counter-revision').textContent = counter ? `revision ${counter.revision}` : '利用不可';
    const target = $('counters'); const counters = counter?.counters || [];
    if (!counters.length) { target.className = 'counter-list empty'; target.textContent = 'Counterがありません'; return; }
    target.className = 'counter-list';
    target.replaceChildren(...counters.map(item => {
      const card = document.createElement('article'); card.className = 'counter';
      const name = document.createElement('div'); name.className = 'counter-name'; name.textContent = item.label || item.id;
      const count = document.createElement('div'); count.className = 'counter-count'; count.textContent = item.count;
      const controls = document.createElement('div'); controls.className = 'counter-actions';
      const minus = document.createElement('button'); minus.textContent = '−'; minus.addEventListener('click', () => action('counter.command', { counterId: item.id, operation: 'decrement' }, minus));
      const plus = document.createElement('button'); plus.textContent = '＋'; plus.addEventListener('click', () => action('counter.command', { counterId: item.id, operation: 'increment' }, plus));
      const reset = document.createElement('button'); reset.className = 'reset'; reset.textContent = 'リセット'; reset.addEventListener('click', () => { if (confirm(`${item.label || item.id}を0に戻しますか？`)) action('counter.command', { counterId: item.id, operation: 'reset', confirm: true }, reset); });
      controls.append(plus, minus, reset); card.append(name, count, controls); return card;
    }));
  }

  function renderEffects(effects) {
    $('effect-revision').textContent = `revision ${effects?.revision || 0}`;
    const target = $('effects'); const buttons = effects?.buttons || [];
    if (!buttons.length) { target.className = 'effect-grid empty'; target.textContent = 'Remote公開されたEffectがありません'; return; }
    target.className = 'effect-grid';
    target.replaceChildren(...buttons.map(item => {
      const button = document.createElement('button'); button.className = 'effect'; button.textContent = item.label;
      button.addEventListener('click', () => action('effect.trigger', { buttonId: item.buttonId }, button)); return button;
    }));
  }

  async function loadState() {
    try {
      const state = await request('/remote/api/state');
      showRemote(); renderCounters(state.counter); renderEffects(state.effects); setConnection(true, '接続済み');
      if (!events) startEvents();
    } catch (error) { if (error.message !== 'authentication_required') setConnection(false, '接続エラー'); }
  }

  function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(loadState, 80); }

  function startEvents() {
    events = new EventSource('/remote/events');
    events.addEventListener('open', () => setConnection(true, '接続済み'));
    events.addEventListener('state', scheduleRefresh);
    events.addEventListener('session.revoked', showPairing);
    events.onerror = () => setConnection(false, '再接続中...');
  }

  $('pair-form').addEventListener('submit', async event => {
    event.preventDefault(); $('pair-error').textContent = '';
    try {
      await request('/remote/api/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: $('pair-code').value, deviceName: $('device-name').value }) });
      $('pair-code').value = ''; await loadState();
    } catch (error) { $('pair-error').textContent = error.message === 'authentication_required' ? 'コードを確認してください' : error.message; }
  });

  document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));
  $('logout').addEventListener('click', async () => { try { await request('/remote/api/logout', { method: 'POST' }); } catch {} showPairing(); });
  loadState();
})();
