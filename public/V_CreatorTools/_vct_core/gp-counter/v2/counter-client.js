(function (global) {
    'use strict';

    class CounterClient {
        constructor(options = {}) {
            this.role = options.role || 'consumer';
            this.mode = options.mode || global.VCTRuntime?.mode || 'standard';
            this.repository = options.repository || null;
            this.canRespond = options.canRespond ?? ['controller', 'settings'].includes(this.role);
            this.protocol = options.protocol || new global.CounterMessageProtocol({ role: this.role, mode: this.mode });
            const Channel = options.Channel || global.BroadcastChannel;
            this.channel = options.channel || new Channel(global.CounterMessageProtocol.CHANNEL_NAME);
            this.listeners = new Set();
            this.pendingResponses = new Map();
            this.responseDelay = options.responseDelay || (() => 20 + this.hash(this.protocol.instanceId) % 61);
            this.setTimeout = options.setTimeout || global.setTimeout.bind(global);
            this.clearTimeout = options.clearTimeout || global.clearTimeout.bind(global);
            this.started = false;
        }

        start(options = {}) {
            if (this.started) return this;
            this.started = true;
            this.channel.addEventListener?.('message', event => this.receive(event.data));
            if (!this.channel.addEventListener) this.channel.onmessage = event => this.receive(event.data);
            if (options.initialState) this.notify({ type: 'counter.snapshot', state: options.initialState, reason: 'local' });
            if (options.requestState !== false) this.requestState(options.knownRevision);
            return this;
        }

        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        requestState(knownRevision) {
            const message = this.protocol.createStateRequest(knownRevision === undefined ? {} : { knownRevision });
            this.channel.postMessage(message);
            return message;
        }

        commit(counters, options = {}) {
            if (!this.repository) throw new Error('CounterClient cannot commit without a repository');
            const result = this.repository.commit(counters, options);
            if (!result.changed) return result;
            const message = this.protocol.createChanged(result.state.revision, result.changes, { cause: result.cause });
            this.channel.postMessage(message);
            this.notify({ type: message.type, state: result.state, changes: result.changes, cause: result.cause, message });
            return { ...result, message };
        }

        receive(rawMessage) {
            let message;
            try { message = this.protocol.receive(rawMessage); }
            catch (error) {
                console.warn('[GP Multi Counter V2] Invalid message was ignored.', error);
                return;
            }
            if (!message) return;
            if (message.type === global.CounterMessageProtocol.TYPES.STATE_REQUEST) this.onStateRequest(message);
            if (message.type === global.CounterMessageProtocol.TYPES.SNAPSHOT) this.onSnapshot(message);
            if (message.type === global.CounterMessageProtocol.TYPES.CHANGED) this.onChanged(message);
        }

        onStateRequest(message) {
            if (!this.canRespond || !this.repository) return;
            const timer = this.setTimeout(() => {
                this.pendingResponses.delete(message.messageId);
                const snapshot = this.protocol.createSnapshot(this.repository.getState(), {
                    reason: 'requested', replyTo: message.messageId
                });
                this.channel.postMessage(snapshot);
            }, this.responseDelay(message));
            this.pendingResponses.set(message.messageId, timer);
        }

        onSnapshot(message) {
            if (message.replyTo && this.pendingResponses.has(message.replyTo)) {
                this.clearTimeout(this.pendingResponses.get(message.replyTo));
                this.pendingResponses.delete(message.replyTo);
            }
            const state = message.payload.state;
            if (this.repository) this.repository.accept(state, { persist: this.canRespond });
            this.notify({ type: message.type, state, reason: message.payload.reason, message });
        }

        onChanged(message) {
            const current = this.repository?.getState();
            const revision = message.payload.revision;
            if (current && revision <= current.revision) return;
            if (current && revision > current.revision + 1) this.requestState(current.revision);
            const state = current ? this.applyChanges(current, revision, message.payload.changes) : null;
            if (state && this.repository) this.repository.accept(state, { persist: this.canRespond });
            this.notify({ type: message.type, state, changes: message.payload.changes, cause: message.payload.cause, message });
        }

        applyChanges(state, revision, changes) {
            const counters = new Map(state.counters.map(counter => [counter.id, counter]));
            changes.forEach(change => {
                if (change.current === null) counters.delete(change.id);
                else counters.set(change.id, change.current);
            });
            return global.GPMultiCounterSchema.createState([...counters.values()], {
                revision,
                updatedAt: Date.now()
            });
        }

        notify(event) { this.listeners.forEach(listener => listener(event)); }
        hash(value) { return [...String(value)].reduce((total, character) => total + character.charCodeAt(0), 0); }
        close() {
            this.pendingResponses.forEach(timer => this.clearTimeout(timer));
            this.pendingResponses.clear();
            this.listeners.clear();
            this.channel.close?.();
        }
    }

    global.CounterClient = CounterClient;
    if (typeof module !== 'undefined' && module.exports) module.exports = CounterClient;
})(typeof window !== 'undefined' ? window : globalThis);
