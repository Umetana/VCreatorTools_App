/**
 * Settings schema v1 validation and normalization.
 */
class SettingsValidator {
    static VERSION = 1;

    constructor(options = {}) {
        this.getDefaults = options.getDefaults || (() => (
            typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS : {}
        ));
    }

    normalize(input) {
        if (!this.isObject(input)) throw new TypeError('Settings must be an object');
        if (input.schemaVersion !== undefined && input.schemaVersion !== SettingsValidator.VERSION) {
            throw new TypeError(`Unsupported settings schemaVersion: ${input.schemaVersion}`);
        }

        const defaults = this.getDefaults() || {};
        const gridSource = this.isObject(input.gridConfig) ? input.gridConfig : defaults.gridConfig;
        const resolutionSource = this.isObject(input.resolution) ? input.resolution : defaults.resolution;
        if (!this.isObject(gridSource) || !this.isObject(resolutionSource)) {
            throw new TypeError('resolution and gridConfig are required');
        }
        if (!Array.isArray(input.buttons)) throw new TypeError('buttons must be an array');

        const gridConfig = {
            cols: this.integer(gridSource.cols, 1, 20, 'gridConfig.cols'),
            rows: this.integer(gridSource.rows, 1, 20, 'gridConfig.rows')
        };
        const resolution = {
            width: this.integer(resolutionSource.width, 1, 7680, 'resolution.width'),
            height: this.integer(resolutionSource.height, 1, 4320, 'resolution.height')
        };
        const buttons = input.buttons.map((button, index) => this.normalizeButton(button, index));

        this.assertUnique(buttons.map((button) => button.id), 'button id');
        this.assertUnique(buttons.map((button) => button.gridIndex), 'button gridIndex');

        return {
            schemaVersion: SettingsValidator.VERSION,
            masterVolume: this.number(
                input.masterVolume ?? defaults.masterVolume ?? 0.5,
                0,
                1,
                'masterVolume'
            ),
            resolution,
            gridConfig,
            buttons
        };
    }

    normalizeButton(button, index) {
        if (!this.isObject(button)) throw new TypeError(`buttons[${index}] must be an object`);
        if (!this.isObject(button.params)) throw new TypeError(`buttons[${index}].params must be an object`);

        const id = this.string(button.id, 128, `buttons[${index}].id`);
        const effectId = this.string(button.effectId, 128, `buttons[${index}].effectId`);
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(effectId)) {
            throw new TypeError(`buttons[${index}].effectId contains invalid characters`);
        }

        const params = button.params;
        const normalizedParams = {
            mainText: this.optionalString(params.mainText, 2000, ''),
            mainColor: this.optionalString(params.mainColor, 64, '#ffffff'),
            fontFamily: this.optionalString(params.fontFamily, 500, ''),
            fontSize: this.optionalString(params.fontSize, 64, '100px'),
            duration: this.number(params.duration ?? 3000, 100, 600000, `buttons[${index}].params.duration`),
            volume: this.number(params.volume ?? 0.5, 0, 1, `buttons[${index}].params.volume`),
            bgOpacity: this.number(params.bgOpacity ?? 0.4, 0, 1, `buttons[${index}].params.bgOpacity`),
            options: this.normalizeOptions(params.options, index)
        };
        if (params.trigger !== undefined) {
            normalizedParams.trigger = this.normalizeTrigger(params.trigger, index);
        }

        return {
            id,
            label: this.optionalString(button.label, 500, id),
            effectId,
            gridIndex: this.integer(button.gridIndex, 0, 399, `buttons[${index}].gridIndex`),
            params: normalizedParams
        };
    }

    normalizeTrigger(trigger, index) {
        if (!this.isObject(trigger)) throw new TypeError(`buttons[${index}].params.trigger must be an object`);
        const allowedTypes = ['none', 'increment', 'reach', 'interval'];
        if (!allowedTypes.includes(trigger.type)) {
            throw new TypeError(`buttons[${index}].params.trigger.type is invalid`);
        }
        return {
            type: trigger.type,
            linkedId: this.optionalString(trigger.linkedId, 128, 'counter1'),
            value: this.number(trigger.value ?? 100, 1, Number.MAX_SAFE_INTEGER, `buttons[${index}].params.trigger.value`)
        };
    }

    normalizeOptions(options, index) {
        if (options === undefined) return {};
        if (!this.isObject(options)) throw new TypeError(`buttons[${index}].params.options must be an object`);
        const serialized = JSON.stringify(options);
        if (serialized.length > 100000) throw new TypeError(`buttons[${index}].params.options is too large`);
        return JSON.parse(serialized);
    }

    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    string(value, maxLength, path) {
        if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
            throw new TypeError(`${path} must be a non-empty string up to ${maxLength} characters`);
        }
        return value;
    }

    optionalString(value, maxLength, fallback) {
        if (value === undefined || value === null) return fallback;
        if (typeof value !== 'string' || value.length > maxLength) {
            throw new TypeError(`Expected a string up to ${maxLength} characters`);
        }
        return value;
    }

    number(value, min, max, path) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) throw new TypeError(`${path} must be a finite number`);
        return Math.max(min, Math.min(max, parsed));
    }

    integer(value, min, max, path) {
        return Math.round(this.number(value, min, max, path));
    }

    assertUnique(values, label) {
        if (new Set(values).size !== values.length) throw new TypeError(`${label} values must be unique`);
    }
}

window.SettingsValidator = SettingsValidator;
