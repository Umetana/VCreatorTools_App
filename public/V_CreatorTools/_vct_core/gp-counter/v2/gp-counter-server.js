(function (global) {
    'use strict';

    function createClient(options = {}) {
        const enabled = global.VCTRuntime?.mode === 'server';
        const onState = typeof options.onState === 'function' ? options.onState : function () {};
        const onMessage = typeof options.onMessage === 'function' ? options.onMessage : function () {};
        const protocol = new global.CounterMessageProtocol({ role: options.role || 'consumer', mode: 'server' });
        let state = global.GPMultiCounterSchema.createState([], { revision: 0, updatedAt: Date.now() });
        let socket = null;
        let reconnectTimer = null;
        let closed = false;

        async function request(url, init) {
            const response = await fetch(url, init);
            const body = await response.json();
            if (!response.ok) {
                const error = new Error(body.error || `gp_counter_v2_${response.status}`);
                error.response = body;
                throw error;
            }
            return body;
        }

        function accept(message, fallbackState) {
            let envelope = null;
            if (message) {
                try { envelope = protocol.receive(message); }
                catch (error) {
                    console.warn('[GP Multi Counter V2] Invalid Server message was ignored.', error);
                    return false;
                }
            }
            if (!envelope && !fallbackState) return false;
            if (envelope?.type === global.CounterMessageProtocol.TYPES.SNAPSHOT) {
                state = clone(global.GPMultiCounterSchema.validateState(envelope.payload.state));
            } else if (envelope?.type === global.CounterMessageProtocol.TYPES.CHANGED) {
                if (envelope.payload.revision <= state.revision) return false;
                state = applyChanges(state, envelope.payload.revision, envelope.sentAt, envelope.payload.changes);
            } else if (fallbackState) {
                const validated = global.GPMultiCounterSchema.validateState(fallbackState);
                if (validated.revision < state.revision) return false;
                state = clone(validated);
            } else return false;
            onMessage(envelope);
            onState(clone(state), envelope);
            return true;
        }

        async function refresh(reason = 'requested') {
            const requestMessage = protocol.createStateRequest({ knownRevision: state.revision });
            const result = await request(`/api/gp-counter/v2/state?replyTo=${encodeURIComponent(requestMessage.messageId)}`, { cache: 'no-store' });
            accept(result.message, result.state);
            return state;
        }

        function connect() {
            if (!enabled || closed) return;
            const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            socket = new WebSocket(`${socketProtocol}//${location.host}/events`);
            socket.addEventListener('open', () => {
                refresh('resync').catch(error => console.warn('[GP Multi Counter V2] Reconnect snapshot failed.', error));
            });
            socket.addEventListener('message', event => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.protocol === global.CounterMessageProtocol.NAME) accept(message);
                } catch (error) {
                    console.warn('[GP Multi Counter V2] Server event was ignored.', error);
                }
            });
            socket.addEventListener('close', () => {
                if (closed) return;
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connect, 3000);
            });
        }

        async function initialize(seedCounters = []) {
            if (!enabled) return null;
            await refresh();
            if (state.revision === 0 && state.counters.length === 0 && seedCounters.length > 0) {
                await replaceCounters(seedCounters, 'initial-seed');
            }
            connect();
            return clone(state);
        }

        async function command(operation, counterId, amount) {
            if (!enabled) return null;
            const payload = { operation, counterId };
            if (operation === 'set') payload.value = amount;
            else if (operation === 'increment' || operation === 'decrement') payload.delta = Math.abs(amount ?? 1);
            const result = await request('/api/gp-counter/v2/command', {
                method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
            });
            accept(result.message, result.state);
            return clone(state);
        }

        async function replaceCounters(counters, cause = 'settings') {
            if (!enabled) return null;
            try {
                const result = await request('/api/gp-counter/v2/state', {
                    method: 'PUT', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ ...state, counters, cause })
                });
                accept(result.message, result.state);
            } catch (error) {
                if (error.response?.message || error.response?.state) accept(error.response.message, error.response.state);
                throw error;
            }
            return clone(state);
        }

        function close() {
            closed = true;
            clearTimeout(reconnectTimer);
            socket?.close();
        }

        return Object.freeze({ enabled, initialize, refresh, command, replaceCounters, close, getState: () => clone(state) });
    }

    function applyChanges(previousState, revision, updatedAt, changes) {
        const counters = new Map(previousState.counters.map(counter => [counter.id, counter]));
        changes.forEach(change => {
            if (change.current === null) counters.delete(change.id);
            else counters.set(change.id, change.current);
        });
        return global.GPMultiCounterSchema.createState([...counters.values()], { revision, updatedAt });
    }

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    global.GPCounterServer = Object.freeze({ createClient });
})(window);
