/**
 * Routes effect.trigger through Server transport in Server mode.
 * settings.updated remains local until the settings Server phase.
 */
class EffectTransportRouter {
    constructor(options = {}) {
        this.mode = options.mode || window.VCTRuntime?.mode || 'standard';
        this.broadcast = options.broadcast || new BroadcastTransport(EffectMessageProtocol.CHANNEL_NAME);
        this.server = this.mode === 'server'
            ? (options.server || new ServerEffectTransport(options.serverOptions))
            : null;
    }

    publish(message) {
        if (this.server && message?.type === 'effect.trigger') return this.server.publish(message);
        return this.broadcast.publish(message);
    }

    subscribe(listener) {
        const unsubscribeBroadcast = this.broadcast.subscribe(listener);
        const unsubscribeServer = this.server?.subscribe(listener);
        return () => {
            unsubscribeBroadcast?.();
            unsubscribeServer?.();
        };
    }

    subscribeStatus(listener) {
        if (this.server) return this.server.subscribeStatus(listener);
        listener(Object.freeze({ mode: this.mode, state: 'local', connected: true, lastError: null }));
        return () => {};
    }

    getStatus() {
        return this.server?.getStatus() || Object.freeze({ mode: this.mode, state: 'local', connected: true, lastError: null });
    }

    close() {
        this.broadcast.close?.();
        this.server?.close();
    }
}

window.EffectTransportRouter = EffectTransportRouter;
