(function (global) {
    'use strict';

    class CounterStateRepository {
        constructor(options = {}) {
            this.storage = options.storage || global.localStorage;
            this.storageKey = options.storageKey || global.CounterMessageProtocol.STORAGE_KEY;
            this.now = options.now || (() => Date.now());
            this.schema = options.schema || global.GPMultiCounterSchema;
            this.core = options.core || global.GPMultiCounter;
            this.state = null;
        }

        load(fallbackCounters = []) {
            const raw = this.storage.getItem(this.storageKey);
            if (raw !== null) {
                try {
                    this.state = this.schema.validateState(JSON.parse(raw));
                    return this.cloneState(this.state);
                } catch (error) {
                    this.backupBroken(raw);
                    console.warn('[GP Multi Counter V2] Invalid saved state was ignored.', error);
                }
            }
            const counters = this.normalizeCounters(fallbackCounters);
            this.state = this.schema.createState(counters, { revision: 0, updatedAt: this.now() });
            return this.cloneState(this.state);
        }

        getState() {
            if (!this.state) return this.load([]);
            return this.cloneState(this.state);
        }

        commit(nextCounters, options = {}) {
            if (!this.state) this.load([]);
            const normalized = this.normalizeCounters(nextCounters);
            const changes = this.diff(this.state.counters, normalized, options.operations, options.defaultOperation);
            if (changes.length === 0) return { changed: false, state: this.getState(), changes: [] };
            const nextState = this.schema.createState(normalized, {
                revision: this.state.revision + 1,
                updatedAt: this.now()
            });
            this.storage.setItem(this.storageKey, JSON.stringify(nextState));
            this.state = nextState;
            return { changed: true, state: this.getState(), changes, cause: options.cause || 'user' };
        }

        accept(state, options = {}) {
            const validated = this.schema.validateState(state);
            if (!options.force && this.state && validated.revision < this.state.revision) return false;
            this.state = this.cloneState(validated);
            if (options.persist !== false) this.storage.setItem(this.storageKey, JSON.stringify(this.state));
            return true;
        }

        diff(previousCounters, currentCounters, operationHints = {}, defaultOperation) {
            const previousById = new Map(previousCounters.map(counter => [counter.id, counter]));
            const currentById = new Map(currentCounters.map(counter => [counter.id, counter]));
            const ids = new Set([...previousById.keys(), ...currentById.keys()]);
            const changes = [];
            ids.forEach(id => {
                const previous = previousById.get(id) || null;
                const current = currentById.get(id) || null;
                if (previous && current && this.equal(previous, current)) return;
                const hinted = operationHints instanceof Map ? operationHints.get(id) : operationHints[id];
                const operation = hinted || this.inferOperation(previous, current, defaultOperation);
                changes.push({ id, operation, previous, current });
            });
            return changes;
        }

        inferOperation(previous, current, defaultOperation) {
            if (!previous) return 'create';
            if (!current) return 'remove';
            const changedFields = Object.keys(current).filter(key => !this.equal(previous[key], current[key]));
            if (defaultOperation === 'replace') return changedFields.includes('count') ? 'replace' : 'update';
            if (changedFields.length === 1 && changedFields[0] === 'count') {
                if (current.count === 0) return 'reset';
                if (current.count === previous.count + 1) return 'increment';
                if (current.count === previous.count - 1) return 'decrement';
                return 'set';
            }
            if (!changedFields.includes('count')) return 'update';
            return 'replace';
        }

        normalizeCounters(counters) {
            const normalized = this.core?.normalizeCounters
                ? this.core.normalizeCounters(counters, { allowEmpty: true })
                : counters.map(counter => ({ ...counter }));
            this.schema.validateCounters(normalized);
            return normalized;
        }

        backupBroken(raw) {
            try { this.storage.setItem(`${this.storageKey}:broken:${this.now()}`, raw); } catch { /* best effort */ }
        }

        cloneState(state) { return JSON.parse(JSON.stringify(state)); }
        equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
    }

    global.CounterStateRepository = CounterStateRepository;
    if (typeof module !== 'undefined' && module.exports) module.exports = CounterStateRepository;
})(typeof window !== 'undefined' ? window : globalThis);
