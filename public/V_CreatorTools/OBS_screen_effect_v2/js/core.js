/**
 * Core logic for OBS Universal Effect Gadget
 */
class EffectCore {
    constructor(role) {
        this.role = role; // 'screen', 'controller', 'config'
        this.messageProtocol = new EffectMessageProtocol({ role });
        this.settingsRepository = new SettingsRepository();
        this.effectRegistry = new EffectRegistry();
        this.effectTransport = new EffectTransportRouter();
        this.counterTriggerEngine = new CounterTriggerEngine();
        this.settings = this.loadSettings();
        this.debug = window.OBS_EFFECT_DEBUG === true;

        this.setupListeners();
        this.debugLog(`Initialized as ${role}`);
    }

    loadSettings() {
        return this.settingsRepository.load();
    }

    saveSettings(newSettings) {
        this.settings = this.settingsRepository.save(newSettings);
        this.broadcast('settings.updated', { settings: this.settings });
    }

    clearSettings() {
        this.settingsRepository.clear();
    }

    broadcast(type, payload) {
        const result = this.effectTransport.publish(this.messageProtocol.create(type, payload));
        result?.catch?.((error) => console.error(`[EffectCore:${this.role}] Could not publish ${type}`, error));
        return result;
    }

    setupListeners() {
        this.effectTransport.subscribe((message) => {
            let envelope;
            try {
                envelope = this.messageProtocol.receive(message);
            } catch (error) {
                console.error('[Core] Rejected invalid effect message', error);
                return;
            }
            if (!envelope) return;
            const { type, payload } = envelope;
            this.debugLog(`[${this.role}] Received: ${type}`);

            if (type === 'settings.updated') {
                try {
                    this.settings = this.settingsRepository.normalize(payload.settings);
                    if (typeof this.onConfigUpdate === 'function') {
                        this.onConfigUpdate(this.settings);
                    }
                } catch (error) {
                    console.error('[Core] Rejected invalid settings.updated payload', error);
                }
            } else if (type === 'effect.trigger' && this.role === 'screen') {
                if (typeof this.onEffectTrigger === 'function') {
                    this.onEffectTrigger(payload.effectId, payload.params);
                }
            }
        });
    }

    handleCounterChanges(changes, cause) {
        this.counterTriggerEngine.processChanges(changes, this.settings.buttons).forEach(({ button, operation }) => {
            this.debugLog(
                `Counter Trigger: Button:${button.label}, Type:${button.params.trigger.type}, Operation:${operation}, Cause:${cause || 'unknown'}`
            );
            if (this.role === 'screen' && typeof this.onEffectTrigger === 'function') {
                this.onEffectTrigger(button.effectId, button.params);
            }
        });
    }

    // Effect Loading Logic (Screen specific)
    async loadEffect(effectId) {
        return this.effectRegistry.load(effectId);
    }

    debugLog(...args) {
        if (this.debug) console.debug('[EffectCore]', ...args);
    }
}
