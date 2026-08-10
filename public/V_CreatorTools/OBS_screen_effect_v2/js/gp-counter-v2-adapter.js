/**
 * Adapts GP Multi Counter V2 events to the Screen Effect trigger boundary.
 * Snapshots update CounterClient/Server state only; only Changed is emitted.
 */
class GPCounterV2Adapter {
    constructor(options = {}) {
        this.mode = options.mode || window.VCTRuntime?.mode || 'standard';
        this.onChanged = options.onChanged || (() => {});
        this.onError = options.onError || ((error) => console.warn('[Screen Effect] Counter V2 error', error));
        this.client = null;
        this.serverClient = null;
        this.repository = null;
    }

    start() {
        if (this.mode === 'server') return this.startServer();
        return this.startBrowser();
    }

    startBrowser() {
        this.repository = new CounterStateRepository({
            storageKey: CounterMessageProtocol.storageKeyForMode(this.mode)
        });
        const initial = this.repository.load([]);
        this.client = new CounterClient({
            role: 'consumer',
            mode: this.mode,
            repository: this.repository,
            canRespond: false
        });
        this.client.subscribe((event) => {
            if (event.type !== CounterMessageProtocol.TYPES.CHANGED) return;
            this.onChanged(event.changes, event.cause, event.message);
        });
        this.client.start({ knownRevision: initial.revision });
        return this;
    }

    startServer() {
        this.serverClient = GPCounterServer.createClient({
            role: 'consumer',
            onMessage: (message) => {
                if (message?.type !== CounterMessageProtocol.TYPES.CHANGED) return;
                this.onChanged(message.payload.changes, message.payload.cause, message);
            }
        });
        this.serverClient.initialize([]).catch(this.onError);
        return this;
    }

    close() {
        this.client?.close();
        this.serverClient?.close();
    }
}

window.GPCounterV2Adapter = GPCounterV2Adapter;
