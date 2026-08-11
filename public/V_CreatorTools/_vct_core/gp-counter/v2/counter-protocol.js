(function (global) {
    'use strict';

    const NAME = 'vct.gp-multi-counter';
    const VERSION = 1;
    const CHANNEL_NAME = 'vct:gp-multi-counter:v2:channel';
    const STORAGE_KEY = 'vct:gp-multi-counter:v2:state';
    const SERVER_CACHE_KEY = 'vct:gp-multi-counter:v2:server-cache';
    const TYPES = Object.freeze({
        SNAPSHOT: 'counter.snapshot',
        CHANGED: 'counter.changed',
        STATE_REQUEST: 'counter.state.request'
    });
    const OPERATIONS = new Set(['increment', 'decrement', 'reset', 'set', 'update', 'create', 'remove', 'replace']);
    const ROLES = new Set(['controller', 'settings', 'display', 'consumer', 'server', 'unknown']);
    const MODES = new Set(['standard', 'sync', 'server']);

    class CounterMessageProtocol {
        constructor(options = {}) {
            this.role = options.role || 'unknown';
            this.mode = options.mode || 'standard';
            this.now = options.now || (() => Date.now());
            this.randomUUID = options.randomUUID || (() => globalThis.crypto?.randomUUID?.());
            this.sequence = 0;
            this.instanceId = options.instanceId || this.createId('instance');
            this.maxSeen = options.maxSeen || 256;
            this.seenIds = new Set();
            this.seenOrder = [];
            if (!ROLES.has(this.role)) throw new TypeError('Unsupported source role');
            if (!MODES.has(this.mode)) throw new TypeError('Unsupported source mode');
        }

        create(type, payload, options = {}) {
            const envelope = {
                protocol: NAME,
                protocolVersion: VERSION,
                messageId: this.createId('message'),
                source: { role: this.role, instanceId: this.instanceId, mode: this.mode },
                type,
                sentAt: this.now(),
                payload
            };
            if (options.replyTo) envelope.replyTo = options.replyTo;
            return this.validate(envelope);
        }

        createSnapshot(state, options = {}) {
            return this.create(TYPES.SNAPSHOT, { state, reason: options.reason || 'initial' }, { replyTo: options.replyTo });
        }

        createChanged(revision, changes, options = {}) {
            return this.create(TYPES.CHANGED, { revision, changes, cause: options.cause || 'user' });
        }

        createStateRequest(options = {}) {
            const payload = {};
            if (options.knownRevision !== undefined) payload.knownRevision = options.knownRevision;
            if (options.counterIds !== undefined) payload.counterIds = options.counterIds;
            return this.create(TYPES.STATE_REQUEST, payload);
        }

        receive(message) {
            const envelope = this.validate(message);
            if (this.seenIds.has(envelope.messageId)) return null;
            this.remember(envelope.messageId);
            return envelope;
        }

        validate(message) {
            if (!this.isObject(message)) throw new TypeError('Message envelope must be an object');
            if (message.protocol !== NAME) throw new TypeError('Unknown message protocol');
            if (message.protocolVersion !== VERSION) throw new TypeError('Unsupported protocol version');
            this.string(message.messageId, 200, 'messageId');
            if (message.replyTo !== undefined) this.string(message.replyTo, 200, 'replyTo');
            if (!Object.values(TYPES).includes(message.type)) throw new TypeError('Unknown message type');
            if (!Number.isFinite(message.sentAt) || message.sentAt < 0) throw new TypeError('sentAt is invalid');
            if (!this.isObject(message.source)) throw new TypeError('source must be an object');
            this.string(message.source.instanceId, 200, 'source.instanceId');
            if (!ROLES.has(message.source.role)) throw new TypeError('source.role is invalid');
            if (!MODES.has(message.source.mode)) throw new TypeError('source.mode is invalid');
            if (!this.isObject(message.payload)) throw new TypeError('payload must be an object');

            if (message.type === TYPES.SNAPSHOT) this.validateSnapshot(message);
            if (message.type === TYPES.CHANGED) this.validateChanged(message.payload);
            if (message.type === TYPES.STATE_REQUEST) this.validateStateRequest(message.payload);
            if (JSON.stringify(message).length > 1000000) throw new TypeError('Message envelope is too large');
            return message;
        }

        validateSnapshot(message) {
            global.GPMultiCounterSchema.validateState(message.payload.state);
            if (!new Set(['initial', 'requested', 'resync']).has(message.payload.reason)) throw new TypeError('snapshot reason is invalid');
            if (message.payload.reason === 'requested' && !message.replyTo) throw new TypeError('requested snapshot requires replyTo');
        }

        validateChanged(payload) {
            if (!Number.isSafeInteger(payload.revision) || payload.revision < 1) throw new TypeError('changed revision is invalid');
            if (!Array.isArray(payload.changes) || payload.changes.length === 0 || payload.changes.length > 200) {
                throw new TypeError('changes must be a non-empty array');
            }
            this.string(payload.cause, 64, 'payload.cause');
            const ids = new Set();
            payload.changes.forEach((change, index) => {
                if (!this.isObject(change)) throw new TypeError(`changes[${index}] must be an object`);
                this.string(change.id, 64, `changes[${index}].id`);
                if (ids.has(change.id)) throw new TypeError(`Duplicate changed id: ${change.id}`);
                ids.add(change.id);
                if (!OPERATIONS.has(change.operation)) throw new TypeError(`changes[${index}].operation is invalid`);
                if (change.previous !== null) global.GPMultiCounterSchema.validateCounter(change.previous, `changes[${index}].previous`);
                if (change.current !== null) global.GPMultiCounterSchema.validateCounter(change.current, `changes[${index}].current`);
                if (change.previous === null && change.operation !== 'create') throw new TypeError('Only create may have null previous');
                if (change.current === null && change.operation !== 'remove') throw new TypeError('Only remove may have null current');
                if (change.previous !== null && change.previous.id !== change.id) throw new TypeError('previous id does not match change id');
                if (change.current !== null && change.current.id !== change.id) throw new TypeError('current id does not match change id');
            });
        }

        validateStateRequest(payload) {
            if (payload.knownRevision !== undefined && (!Number.isSafeInteger(payload.knownRevision) || payload.knownRevision < 0)) {
                throw new TypeError('knownRevision is invalid');
            }
            if (payload.counterIds !== undefined) {
                if (!Array.isArray(payload.counterIds) || payload.counterIds.length > 200) throw new TypeError('counterIds is invalid');
                payload.counterIds.forEach((id, index) => this.string(id, 64, `counterIds[${index}]`));
            }
        }

        remember(messageId) {
            this.seenIds.add(messageId);
            this.seenOrder.push(messageId);
            while (this.seenOrder.length > this.maxSeen) this.seenIds.delete(this.seenOrder.shift());
        }

        createId(prefix) {
            const uuid = this.randomUUID();
            if (uuid) return uuid;
            this.sequence += 1;
            return `${prefix}-${this.now().toString(36)}-${this.sequence.toString(36)}`;
        }

        isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
        string(value, maxLength, path) {
            if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
                throw new TypeError(`${path} must be a non-empty string up to ${maxLength} characters`);
            }
        }
    }

    CounterMessageProtocol.NAME = NAME;
    CounterMessageProtocol.VERSION = VERSION;
    CounterMessageProtocol.CHANNEL_NAME = CHANNEL_NAME;
    CounterMessageProtocol.STORAGE_KEY = STORAGE_KEY;
    CounterMessageProtocol.SERVER_CACHE_KEY = SERVER_CACHE_KEY;
    CounterMessageProtocol.storageKeyForMode = mode => mode === 'server' ? SERVER_CACHE_KEY : STORAGE_KEY;
    CounterMessageProtocol.TYPES = TYPES;
    CounterMessageProtocol.OPERATIONS = OPERATIONS;
    global.CounterMessageProtocol = CounterMessageProtocol;
    if (typeof module !== 'undefined' && module.exports) module.exports = CounterMessageProtocol;
})(typeof window !== 'undefined' ? window : globalThis);
