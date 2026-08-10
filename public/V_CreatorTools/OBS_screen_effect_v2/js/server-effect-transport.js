/**
 * Server transport for effect.trigger envelopes.
 * The unified server relays accepted envelopes over the shared /events socket.
 */
class ServerEffectTransport {
    constructor(options = {}) {
        this.endpoint = options.endpoint || '/api/obs-screen-effect/v2/trigger';
        this.eventsPath = options.eventsPath || '/events';
        this.fetch = options.fetch || globalThis.fetch?.bind(globalThis);
        this.WebSocket = options.WebSocket || globalThis.WebSocket;
        this.location = options.location || globalThis.location;
        this.reconnectDelay = options.reconnectDelay || 3000;
        this.onError = options.onError || ((error) => console.warn('[EffectServerTransport]', error));
        this.listeners = new Set();
        this.statusListeners = new Set();
        this.socket = null;
        this.reconnectTimer = null;
        this.closed = false;
        this.status = Object.freeze({ mode: 'server', state: 'connecting', connected: false, lastError: null, lastAcceptedAt: null, delivered: null });
        this.connect();
    }

    publish(message) {
        if (!this.fetch) return Promise.reject(new Error('Fetch API is unavailable'));
        return this.fetch(this.endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(message)
        }).then(async (response) => {
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || `effect_transport_${response.status}`);
            this.setStatus({ lastAcceptedAt: Date.now(), delivered: Number.isFinite(body.delivered) ? body.delivered : null });
            return body;
        }).catch((error) => {
            this.onError(error);
            throw error;
        });
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    subscribeStatus(listener) {
        this.statusListeners.add(listener);
        listener(this.status);
        return () => this.statusListeners.delete(listener);
    }

    getStatus() {
        return this.status;
    }

    connect() {
        if (this.closed || !this.WebSocket || !this.location) return;
        const protocol = this.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.setStatus({ state: 'connecting', connected: false });
        this.socket = new this.WebSocket(`${protocol}//${this.location.host}${this.eventsPath}`);
        this.socket.addEventListener('open', () => {
            this.setStatus({ state: 'connected', connected: true, lastError: null });
        });
        this.socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message?.protocol !== EffectMessageProtocol.NAME || message?.type !== 'effect.trigger') return;
                this.listeners.forEach((listener) => listener(message));
            } catch (error) {
                this.onError(error);
            }
        });
        this.socket.addEventListener('close', () => {
            if (this.closed) return;
            this.setStatus({ state: 'reconnecting', connected: false });
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
        });
        this.socket.addEventListener('error', () => {
            this.setStatus({ state: 'error', connected: false, lastError: 'WebSocket connection error' });
        });
    }

    setStatus(update) {
        this.status = Object.freeze({ ...this.status, ...update });
        this.statusListeners.forEach((listener) => listener(this.status));
    }

    close() {
        this.closed = true;
        this.setStatus({ state: 'closed', connected: false });
        clearTimeout(this.reconnectTimer);
        this.listeners.clear();
        this.statusListeners.clear();
        this.socket?.close();
    }
}

window.ServerEffectTransport = ServerEffectTransport;
