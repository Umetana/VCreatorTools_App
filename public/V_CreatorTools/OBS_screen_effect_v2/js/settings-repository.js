/**
 * Local settings persistence for OBS Screen Effect V2.
 * Settings are normalized against the current schema at this boundary.
 */
class SettingsRepository {
    constructor(options = {}) {
        this.storage = options.storage || localStorage;
        this.storageKey = options.storageKey || EffectMessageProtocol.STORAGE_KEY;
        this.getDefaults = options.getDefaults || (() => (
            window.OBS_EFFECT_DEFAULT_SETTINGS ||
            (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS : {})
        ));
        this.getUserSettings = options.getUserSettings || (() => window.OBS_EFFECT_USER_SETTINGS);
        this.validator = options.validator || new SettingsValidator({ getDefaults: this.getDefaults });
    }

    load() {
        const local = this.storage.getItem(this.storageKey);
        if (local) {
            try {
                return this.validator.normalize(JSON.parse(local));
            } catch (e) {
                console.error('Failed to load local settings, falling back to default', e);
            }
        }
        const userSettings = this.getUserSettings();
        if (userSettings !== null && userSettings !== undefined) {
            try {
                return this.validator.normalize(userSettings);
            } catch (e) {
                console.error('Failed to load settings.js, falling back to default', e);
            }
        }
        return this.validator.normalize(this.getDefaults());
    }

    save(settings) {
        const normalized = this.normalize(settings);
        const serialized = JSON.stringify(normalized);
        if (serialized.length > 1000000) throw new TypeError('Settings payload is too large');
        this.storage.setItem(this.storageKey, serialized);
        return normalized;
    }

    normalize(settings) {
        return this.validator.normalize(settings);
    }

    clear() {
        this.storage.removeItem(this.storageKey);
    }
}

window.SettingsRepository = SettingsRepository;
