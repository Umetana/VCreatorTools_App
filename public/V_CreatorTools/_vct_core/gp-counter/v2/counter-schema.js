(function (global) {
    'use strict';

    const NAME = 'vct.gp-multi-counter.state';
    const VERSION = 1;
    const MAX_COUNTERS = 200;
    const COUNTER_FIELDS = Object.freeze([
        'id', 'label', 'count', 'unit', 'goalCount', 'showGoal',
        'bgColor', 'borderColor', 'textColor', 'labelSize', 'countSize',
        'isBold', 'isShadow', 'fontFamily'
    ]);

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function assertString(value, maxLength, path, pattern) {
        if (typeof value !== 'string' || value.length > maxLength || (pattern && !pattern.test(value))) {
            throw new TypeError(`${path} is invalid`);
        }
    }

    function validateCounter(counter, path = 'counter') {
        if (!isObject(counter)) throw new TypeError(`${path} must be an object`);
        for (const field of COUNTER_FIELDS) {
            if (!(field in counter)) throw new TypeError(`${path}.${field} is required`);
        }
        assertString(counter.id, 64, `${path}.id`, /^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
        assertString(counter.label, 100, `${path}.label`);
        assertString(counter.unit, 30, `${path}.unit`);
        assertString(counter.bgColor, 64, `${path}.bgColor`);
        assertString(counter.borderColor, 64, `${path}.borderColor`);
        assertString(counter.textColor, 64, `${path}.textColor`);
        assertString(counter.labelSize, 32, `${path}.labelSize`);
        assertString(counter.countSize, 32, `${path}.countSize`);
        assertString(counter.fontFamily, 200, `${path}.fontFamily`);
        if (!Number.isSafeInteger(counter.count) || counter.count < 0) throw new TypeError(`${path}.count is invalid`);
        if (!Number.isSafeInteger(counter.goalCount) || counter.goalCount < 0) throw new TypeError(`${path}.goalCount is invalid`);
        for (const field of ['showGoal', 'isBold', 'isShadow']) {
            if (typeof counter[field] !== 'boolean') throw new TypeError(`${path}.${field} must be boolean`);
        }
        return counter;
    }

    function validateCounters(counters, path = 'counters') {
        if (!Array.isArray(counters) || counters.length > MAX_COUNTERS) throw new TypeError(`${path} is invalid`);
        const ids = new Set();
        counters.forEach((counter, index) => {
            validateCounter(counter, `${path}[${index}]`);
            if (ids.has(counter.id)) throw new TypeError(`${path} contains duplicate id: ${counter.id}`);
            ids.add(counter.id);
        });
        return counters;
    }

    function validateState(state) {
        if (!isObject(state)) throw new TypeError('state must be an object');
        if (state.schema !== NAME) throw new TypeError('Unsupported state schema');
        if (state.schemaVersion !== VERSION) throw new TypeError('Unsupported state schemaVersion');
        if (!Number.isSafeInteger(state.revision) || state.revision < 0) throw new TypeError('state.revision is invalid');
        if (!Number.isFinite(state.updatedAt) || state.updatedAt < 0) throw new TypeError('state.updatedAt is invalid');
        validateCounters(state.counters);
        return state;
    }

    function createState(counters = [], options = {}) {
        return validateState({
            schema: NAME,
            schemaVersion: VERSION,
            revision: options.revision ?? 0,
            updatedAt: options.updatedAt ?? Date.now(),
            counters: counters.map(counter => ({ ...counter }))
        });
    }

    const api = Object.freeze({ NAME, VERSION, MAX_COUNTERS, COUNTER_FIELDS, validateCounter, validateCounters, validateState, createState });
    global.GPMultiCounterSchema = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
