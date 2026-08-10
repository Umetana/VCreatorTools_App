/**
 * Transport-independent message envelope for OBS Screen Effect V2.
 */
class EffectMessageProtocol {
    static NAME = 'vct.obs-screen-effect';
    static VERSION = 1;
    static CHANNEL_NAME = 'vct:obs-screen-effect:v2:channel';
    static STORAGE_KEY = 'vct:obs-screen-effect:v2:settings';
    static TYPES = new Set(['effect.trigger', 'settings.updated']);

    constructor(options = {}) {
        this.role = options.role || 'unknown';
        this.now = options.now || (() => Date.now());
        this.randomUUID = options.randomUUID || (() => globalThis.crypto?.randomUUID?.());
        this.sequence = 0;
        this.instanceId = options.instanceId || this.createId('instance');
        this.maxSeen = options.maxSeen || 256;
        this.seenIds = new Set();
        this.seenOrder = [];
    }

    create(type, payload) {
        return this.validate({
            protocol: EffectMessageProtocol.NAME,
            protocolVersion: EffectMessageProtocol.VERSION,
            messageId: this.createId('message'),
            source: { role: this.role, instanceId: this.instanceId },
            type,
            sentAt: this.now(),
            payload
        });
    }

    receive(message) {
        const envelope = this.validate(message);
        if (this.seenIds.has(envelope.messageId)) return null;
        this.remember(envelope.messageId);
        return envelope;
    }

    validate(message) {
        if (!this.isObject(message)) throw new TypeError('Message envelope must be an object');
        if (message.protocol !== EffectMessageProtocol.NAME) throw new TypeError('Unknown message protocol');
        if (message.protocolVersion !== EffectMessageProtocol.VERSION) throw new TypeError('Unsupported protocol version');
        this.string(message.messageId, 200, 'messageId');
        if (!EffectMessageProtocol.TYPES.has(message.type)) throw new TypeError('Unknown message type');
        if (!Number.isFinite(message.sentAt)) throw new TypeError('sentAt must be a finite number');
        if (!this.isObject(message.source)) throw new TypeError('source must be an object');
        this.string(message.source.role, 64, 'source.role');
        this.string(message.source.instanceId, 200, 'source.instanceId');
        if (!this.isObject(message.payload)) throw new TypeError('payload must be an object');

        if (message.type === 'effect.trigger') {
            this.string(message.payload.effectId, 128, 'payload.effectId');
            if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(message.payload.effectId)) {
                throw new TypeError('payload.effectId contains invalid characters');
            }
            if (!this.isObject(message.payload.params)) throw new TypeError('payload.params must be an object');
        } else if (!this.isObject(message.payload.settings)) {
            throw new TypeError('payload.settings must be an object');
        }

        const serialized = JSON.stringify(message);
        if (serialized.length > 1000000) throw new TypeError('Message envelope is too large');
        return message;
    }

    remember(messageId) {
        this.seenIds.add(messageId);
        this.seenOrder.push(messageId);
        while (this.seenOrder.length > this.maxSeen) {
            this.seenIds.delete(this.seenOrder.shift());
        }
    }

    createId(prefix) {
        const uuid = this.randomUUID();
        if (uuid) return uuid;
        this.sequence += 1;
        return `${prefix}-${this.now().toString(36)}-${this.sequence.toString(36)}`;
    }

    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    string(value, maxLength, path) {
        if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
            throw new TypeError(`${path} must be a non-empty string up to ${maxLength} characters`);
        }
    }
}

window.EffectMessageProtocol = EffectMessageProtocol;
