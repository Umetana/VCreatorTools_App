/**
 * Loads effect assets and resolves effect classes registered by plugins.
 * Only the public Effect API v2 contract is accepted.
 */
class EffectRegistry {
    constructor(options = {}) {
        this.document = options.document || document;
        this.registeredEffects = options.registeredEffects || window.REGISTERED_EFFECTS;
        this.loading = new Map();
        this.errors = new Map();
    }

    async load(effectId) {
        if (!EffectRegistry.isValidEffectId(effectId)) {
            this.reportError(effectId, 'Effect IDの形式が不正です');
            return null;
        }
        this.errors.delete(effectId);
        const registered = this.registeredEffects[effectId];
        if (registered) {
            return this.validate(effectId, registered) ? registered : null;
        }

        if (this.loading.has(effectId)) {
            return this.loading.get(effectId);
        }

        const loading = this.loadAssets(effectId);
        this.loading.set(effectId, loading);

        try {
            return await loading;
        } finally {
            this.loading.delete(effectId);
        }
    }

    static isValidEffectId(effectId) {
        return typeof effectId === 'string' &&
            effectId.length <= 128 &&
            /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(effectId);
    }

    loadAssets(effectId) {
        const path = `./effects/${effectId}`;

        if (!this.document.getElementById(`style-${effectId}`)) {
            const link = this.document.createElement('link');
            link.id = `style-${effectId}`;
            link.rel = 'stylesheet';
            link.href = `${path}/style.css`;
            this.document.head.appendChild(link);
        }

        return new Promise((resolve) => {
            const script = this.document.createElement('script');
            script.src = `${path}/main.js`;
            script.onload = () => {
                const effectClass = this.registeredEffects[effectId] || null;
                if (effectClass && this.validate(effectId, effectClass)) {
                    resolve(effectClass);
                } else if (effectClass) {
                    resolve(null);
                } else {
                    this.reportError(effectId, 'main.jsがREGISTERED_EFFECTSへクラスを登録していません');
                    resolve(null);
                }
            };
            script.onerror = (e) => {
                this.reportError(effectId, 'main.jsを読み込めませんでした', e);
                resolve(null);
            };
            this.document.head.appendChild(script);
        });
    }

    validate(effectId, EffectClass) {
        const manifest = EffectClass?.manifest;
        const errors = [];
        if (typeof EffectClass !== 'function') errors.push('Plugin classが関数ではありません');
        if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
            errors.push('manifestがオブジェクトではありません');
        }
        if (manifest?.apiVersion !== 2) errors.push('apiVersionは2である必要があります');
        if (!this.isText(manifest?.name, 1, 128)) errors.push('nameは1〜128文字の文字列である必要があります');
        if (manifest?.description !== undefined && !this.isText(manifest.description, 0, 1024)) {
            errors.push('descriptionは1024文字以下の文字列である必要があります');
        }
        if (manifest?.assetDisclosure !== undefined && manifest.assetDisclosure !== 'ai-generated') {
            errors.push('assetDisclosureはai-generatedである必要があります');
        }
        if (!Array.isArray(manifest?.fields) || manifest.fields.length > 64) {
            errors.push('fieldsは最大64件の配列である必要があります');
        }

        const lifecycleOwner = manifest?.runtime?.lifecycleOwner;
        if (lifecycleOwner !== undefined && !['host', 'effect'].includes(lifecycleOwner)) {
            errors.push('runtime.lifecycleOwnerはhostまたはeffectである必要があります');
        }
        if (typeof EffectClass?.prototype?.start !== 'function') errors.push('start()がありません');
        if (typeof EffectClass?.prototype?.destroy !== 'function') errors.push('destroy()がありません');

        const fields = Array.isArray(manifest?.fields) ? manifest.fields : [];
        const fieldNames = fields.map((field) => field?.name);
        const reservedNames = new Set([
            'mainText', 'mainColor', 'fontFamily', 'fontSize', 'duration',
            'volume', 'bgOpacity', 'trigger', 'runtimeOverride', 'options'
        ]);
        fields.forEach((field, index) => {
            errors.push(...this.validateField(field, index, reservedNames));
        });
        if (new Set(fieldNames).size !== fieldNames.length) {
            errors.push('field nameが重複しています');
        }

        if (errors.length > 0) {
            this.reportError(effectId, `Manifest契約が不正です: ${errors.join(' / ')}`);
            return false;
        }
        this.errors.delete(effectId);
        return true;
    }

    validateField(field, index, reservedNames) {
        const prefix = `fields[${index}]`;
        const errors = [];
        if (!field || typeof field !== 'object' || Array.isArray(field)) return [`${prefix}がオブジェクトではありません`];
        if (typeof field.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(field.name)) {
            errors.push(`${prefix}.nameの形式が不正です`);
        } else if (reservedNames.has(field.name)) {
            errors.push(`${prefix}.nameは予約済みです`);
        }
        if (field.label !== undefined && !this.isText(field.label, 1, 128)) errors.push(`${prefix}.labelが不正です`);
        if (!['boolean', 'number', 'color', 'select', 'text', 'asset-select'].includes(field.type)) {
            errors.push(`${prefix}.typeが未対応です`);
            return errors;
        }
        if (field.type === 'boolean' && typeof field.default !== 'boolean') errors.push(`${prefix}.defaultは真偽値が必要です`);
        if (field.type === 'number') {
            const numericKeys = ['default', 'min', 'max', 'step'];
            numericKeys.forEach((key) => {
                if (field[key] !== undefined && !Number.isFinite(field[key])) errors.push(`${prefix}.${key}は有限数が必要です`);
            });
            if (field.default === undefined) errors.push(`${prefix}.defaultが必要です`);
            if (Number.isFinite(field.min) && Number.isFinite(field.max) && field.min > field.max) errors.push(`${prefix}.minがmaxを超えています`);
            if (Number.isFinite(field.step) && field.step <= 0) errors.push(`${prefix}.stepは0より大きい必要があります`);
            if (Number.isFinite(field.default) && Number.isFinite(field.min) && field.default < field.min) errors.push(`${prefix}.defaultがmin未満です`);
            if (Number.isFinite(field.default) && Number.isFinite(field.max) && field.default > field.max) errors.push(`${prefix}.defaultがmaxを超えています`);
        }
        if (field.type === 'color' && (typeof field.default !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(field.default))) {
            errors.push(`${prefix}.defaultは#RRGGBB形式が必要です`);
        }
        if (field.type === 'text' && !this.isText(field.default, 0, 4096)) errors.push(`${prefix}.defaultは4096文字以下の文字列が必要です`);
        if (field.type === 'select') {
            if (!Array.isArray(field.options) || field.options.length === 0 || field.options.length > 100) {
                errors.push(`${prefix}.optionsは1〜100件必要です`);
            } else {
                const values = [];
                field.options.forEach((option, optionIndex) => {
                    if (!option || typeof option !== 'object' || !this.isText(option.label, 1, 128) || !this.isText(option.value, 1, 256)) {
                        errors.push(`${prefix}.options[${optionIndex}]が不正です`);
                    } else {
                        values.push(option.value);
                    }
                });
                if (new Set(values).size !== values.length) errors.push(`${prefix}.optionsのvalueが重複しています`);
                if (!values.includes(field.default)) errors.push(`${prefix}.defaultがoptionsに存在しません`);
            }
        }
        if (field.type === 'asset-select') {
            if (!this.isText(field.default, 0, 256)) errors.push(`${prefix}.defaultは256文字以下の文字列が必要です`);
            if (!['/api/user-assets/v1/screen-effect/image-performance', '/api/user-assets/v1/screen-effect/money-shower'].includes(field.dataSource)) {
                errors.push(`${prefix}.dataSourceが未対応です`);
            }
        }
        return errors;
    }

    isText(value, minLength, maxLength) {
        return typeof value === 'string' && value.length >= minLength && value.length <= maxLength;
    }

    reportError(effectId, message, detail) {
        const key = typeof effectId === 'string' ? effectId : String(effectId);
        this.errors.set(key, message);
        console.error(`[EffectRegistry:${key}] ${message}`, ...(detail ? [detail] : []));
    }

    getError(effectId) {
        return this.errors.get(effectId) || null;
    }
}

window.REGISTERED_EFFECTS = {};
window.EffectRegistry = EffectRegistry;
