/**
 * BroadcastChannel transport adapter.
 * Channel naming and message envelopes remain unchanged during the
 * compatibility refactor.
 */
class BroadcastTransport {
    constructor(channelName, options = {}) {
        const Channel = options.Channel || BroadcastChannel;
        this.channelName = channelName;
        this.channel = new Channel(channelName);
    }

    publish(message) {
        this.channel.postMessage(message);
    }

    subscribe(handler) {
        this.channel.onmessage = (event) => handler(event.data, event);
        return () => {
            this.channel.onmessage = null;
        };
    }

    close() {
        this.channel.close?.();
    }
}

window.BroadcastTransport = BroadcastTransport;
