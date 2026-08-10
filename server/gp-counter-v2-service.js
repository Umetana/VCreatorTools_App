const fs = require('fs');
const path = require('path');

const Schema = require('../public/V_CreatorTools/GP_multi_counter_v2/counter-schema.js');
const Protocol = require('../public/V_CreatorTools/GP_multi_counter_v2/counter-protocol.js');

function createGpCounterV2Service(options = {}) {
  const dataFile = options.dataFile === null ? null : path.resolve(options.dataFile || path.join(__dirname, 'data', 'gp-counter-v2.json'));
  const broadcast = options.broadcast || (() => 0);
  const logger = options.logger || console;
  const now = options.now || (() => Date.now());
  const protocol = new Protocol({ role: 'server', mode: 'server', now });
  const listeners = new Set();
  let state = Schema.createState([], { revision: 0, updatedAt: now() });

  if (dataFile && fs.existsSync(dataFile)) {
    try { state = clone(Schema.validateState(JSON.parse(fs.readFileSync(dataFile, 'utf8')))); }
    catch (error) { logger.error?.(`[gp-counter-v2] failed to read ${dataFile}: ${error.message}`); }
  }

  function persist() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryFile, dataFile);
  }

  function snapshot(reason = 'initial', replyTo) {
    return protocol.createSnapshot(clone(state), { reason, replyTo });
  }

  function commit(counters, options = {}) {
    Schema.validateCounters(counters);
    const changes = diff(state.counters, counters, options.operations, options.defaultOperation);
    if (changes.length === 0) return { changed: false, state: clone(state), message: snapshot('resync') };
    state = Schema.createState(counters, { revision: state.revision + 1, updatedAt: now() });
    persist();
    const message = protocol.createChanged(state.revision, changes, { cause: options.cause || 'server' });
    const delivered = broadcast(message);
    const result = { changed: true, delivered, state: clone(state), message };
    listeners.forEach(listener => listener(result));
    return result;
  }

  function command(input = {}) {
    const { operation, counterId } = input;
    if (!new Set(['increment', 'decrement', 'reset', 'set']).has(operation)) throw httpError(400, 'unsupported_operation');
    if (typeof counterId !== 'string' || !counterId) throw httpError(400, 'counter_id_must_be_string');
    const index = state.counters.findIndex(counter => counter.id === counterId);
    if (index < 0) throw httpError(404, 'counter_not_found');
    const previous = state.counters[index];
    let count;
    if (operation === 'reset') count = 0;
    else if (operation === 'set') {
      if (!Number.isSafeInteger(input.value) || input.value < 0) throw httpError(400, 'value_must_be_nonnegative_integer');
      count = input.value;
    } else {
      const delta = input.delta === undefined ? 1 : input.delta;
      if (!Number.isSafeInteger(delta) || delta <= 0) throw httpError(400, 'delta_must_be_positive_integer');
      count = operation === 'increment'
        ? Math.min(Number.MAX_SAFE_INTEGER, previous.count + delta)
        : Math.max(0, previous.count - delta);
    }
    const counters = state.counters.map((counter, counterIndex) => counterIndex === index ? { ...counter, count } : counter);
    return commit(counters, { operations: { [counterId]: operation }, cause: input.cause || 'server-command' });
  }

  function mount(app) {
    app.get('/api/gp-counter/v2/state', (req, res) => {
      const replyTo = typeof req.query.replyTo === 'string' && req.query.replyTo ? req.query.replyTo : undefined;
      const message = snapshot(replyTo ? 'requested' : 'initial', replyTo);
      res.json({ ok: true, state: clone(state), message });
    });

    app.put('/api/gp-counter/v2/state', (req, res) => {
      try {
        Schema.validateState(req.body);
        if (req.body.revision !== state.revision) return res.status(409).json({ ok: false, error: 'revision_conflict', state: clone(state), message: snapshot('resync') });
        return res.json({
          ok: true,
          ...commit(req.body.counters, { cause: req.body.cause || 'settings', defaultOperation: 'replace' })
        });
      } catch (error) { return sendError(res, error); }
    });

    app.post('/api/gp-counter/v2/command', (req, res) => {
      try { return res.json({ ok: true, ...command(req.body) }); }
      catch (error) { return sendError(res, error); }
    });
  }

  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }

  return Object.freeze({ mount, snapshot, command, commit, getState: () => clone(state), subscribe });
}

function diff(previousCounters, currentCounters, operationHints = {}, defaultOperation) {
  const previousById = new Map(previousCounters.map(counter => [counter.id, counter]));
  const currentById = new Map(currentCounters.map(counter => [counter.id, counter]));
  const ids = new Set([...previousById.keys(), ...currentById.keys()]);
  const changes = [];
  ids.forEach(id => {
    const previous = previousById.get(id) || null;
    const current = currentById.get(id) || null;
    if (JSON.stringify(previous) === JSON.stringify(current)) return;
    changes.push({ id, operation: operationHints[id] || inferOperation(previous, current, defaultOperation), previous, current });
  });
  return changes;
}

function inferOperation(previous, current, defaultOperation) {
  if (!previous) return 'create';
  if (!current) return 'remove';
  const fields = Object.keys(current).filter(key => JSON.stringify(previous[key]) !== JSON.stringify(current[key]));
  if (defaultOperation === 'replace') return fields.includes('count') ? 'replace' : 'update';
  if (fields.length === 1 && fields[0] === 'count') {
    if (current.count === 0) return 'reset';
    if (current.count === previous.count + 1) return 'increment';
    if (current.count === previous.count - 1) return 'decrement';
    return 'set';
  }
  return fields.includes('count') ? 'replace' : 'update';
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function sendError(res, error) { return res.status(error.status || 400).json({ ok: false, error: error.message || 'invalid_state' }); }

module.exports = { createGpCounterV2Service, diff, inferOperation };
