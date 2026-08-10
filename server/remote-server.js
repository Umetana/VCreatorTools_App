"use strict";

const http = require("http");
const os = require("os");
const crypto = require("crypto");
const path = require("path");
const express = require("express");
const { createRemoteAuthService, parseCookie, sessionCookie, clearSessionCookie, COOKIE_NAME } = require("./remote-auth-service");

const REMOTE_DEFAULTS = Object.freeze({
  enabled: false,
  host: "0.0.0.0",
  port: 3010,
  pairingRequired: true,
  sessionDays: 30,
  sessionFile: "data/remote-sessions.json",
  effectCatalogFile: "data/remote-effects.json",
});

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  throw new TypeError("remote.enabled must be boolean");
}

function normalizeRemoteConfig(input = {}, options = {}) {
  const env = options.env || {};
  const mainPort = Number(options.mainPort);
  const remote = {
    ...REMOTE_DEFAULTS,
    ...(input || {}),
  };
  remote.enabled = parseBoolean(env.REMOTE_ENABLED, remote.enabled);
  remote.host = env.REMOTE_HOST || remote.host;
  remote.port = Number(env.REMOTE_PORT ?? remote.port);

  if (typeof remote.enabled !== "boolean") throw new TypeError("remote.enabled must be boolean");
  if (typeof remote.host !== "string" || !remote.host.trim()) throw new TypeError("remote.host must be a non-empty string");
  if (!Number.isInteger(remote.port) || remote.port < 1 || remote.port > 65535) throw new RangeError("remote.port must be an integer from 1 to 65535");
  if (Number.isInteger(mainPort) && remote.enabled && remote.port === mainPort) throw new RangeError("remote.port must differ from the main port");
  if (typeof remote.pairingRequired !== "boolean") throw new TypeError("remote.pairingRequired must be boolean");
  if (!Number.isInteger(remote.sessionDays) || remote.sessionDays < 1 || remote.sessionDays > 3650) throw new RangeError("remote.sessionDays must be an integer from 1 to 3650");
  if (typeof remote.sessionFile !== "string" || !remote.sessionFile.trim()) throw new TypeError("remote.sessionFile must be a non-empty string");
  if (typeof remote.effectCatalogFile !== "string" || !remote.effectCatalogFile.trim()) throw new TypeError("remote.effectCatalogFile must be a non-empty string");
  return Object.freeze(remote);
}

function createRemoteServer(options = {}) {
  const config = normalizeRemoteConfig(options.config, { mainPort: options.mainPort });
  const logger = options.logger || console;
  const services = options.services || {};
  const auth = createRemoteAuthService({ dataFile: options.sessionFile, sessionDays: config.sessionDays, logger, now: options.now, pairingTtlMs: options.pairingTtlMs });
  const app = express();
  const server = http.createServer(app);
  const uiDirectory = path.resolve(options.uiDirectory || path.join(__dirname, "remote-ui"));
  let lastError = null;
  let heartbeatTimer = null;
  const pairLimits = new Map();
  const actionLimits = new Map();
  const recentActions = new Map();
  const sseClients = new Set();
  const unsubscribeCounter = services.gpCounterV2?.subscribe?.(() => publishSse("state", { resource: "counter" }));
  const unsubscribeEffects = services.remoteEffectCatalog?.subscribe?.(() => publishSse("state", { resource: "effects" }));

  app.disable("x-powered-by");
  app.use(express.json({ limit: options.bodyLimit || "32kb", strict: true }));

  app.get(["/remote", "/remote/"], (_req, res) => res.sendFile(path.join(uiDirectory, "index.html")));
  app.get("/remote/style.css", (_req, res) => res.type("css").sendFile(path.join(uiDirectory, "style.css")));
  app.get("/remote/app.js", (_req, res) => res.type("js").sendFile(path.join(uiDirectory, "app.js")));

  app.post("/remote/api/pair", requireSameOrigin, (req, res) => {
    const key = clientAddress(req);
    if (!allowRequest(pairLimits, key, 5, 10 * 60 * 1000)) return res.status(429).json({ ok: false, error: "too_many_pairing_attempts" });
    const result = auth.pair(req.body?.code, req.body?.deviceName);
    if (!result) {
      logger.info?.(`[remote] pairing rejected from ${key}`);
      return res.status(401).json({ ok: false, error: "invalid_or_expired_pairing_code" });
    }
    pairLimits.delete(key);
    res.setHeader("Set-Cookie", sessionCookie(result.token, config.sessionDays * 24 * 60 * 60));
    logger.info?.(`[remote] paired session=${result.session.id} from ${key}`);
    return res.json({ ok: true, session: result.session });
  });

  app.use("/remote/api", authenticate);

  app.get("/remote/events", authenticate, (req, res) => {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const client = { res, sessionId: req.remoteSession.id };
    sseClients.add(client);
    writeSse(res, "state", { resource: "initial" });
    req.on("close", () => sseClients.delete(client));
  });

  app.get("/remote/api/state", (_req, res) => {
    const counterState = services.gpCounterV2?.getState?.();
    return res.json({
      serverTime: Date.now(),
      counter: counterState ? { revision: counterState.revision, updatedAt: counterState.updatedAt, counters: counterState.counters } : null,
      effects: services.remoteEffectCatalog?.remoteState?.() || { revision: 0, buttons: [] },
      capabilities: { counter: Boolean(counterState), effectTrigger: Boolean(services.remoteEffectCatalog && services.effectTransport) },
    });
  });

  app.post("/remote/api/action", requireSameOrigin, (req, res) => {
    const key = req.remoteSession.id;
    if (!allowRequest(actionLimits, key, 60, 60 * 1000)) return res.status(429).json({ ok: false, error: "too_many_actions" });
    if (!validRequestId(req.body?.requestId)) return res.status(400).json({ ok: false, error: "invalid_request_id" });
    const actionKey = `${key}:${req.body.requestId}`;
    const previousResult = recentActions.get(actionKey);
    if (previousResult && previousResult.expiresAt > Date.now()) return res.json({ ...previousResult.body, duplicate: true });
    const payload = req.body?.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return res.status(400).json({ ok: false, error: "invalid_payload" });
    if (req.body?.type === "effect.trigger") {
      if (Object.keys(payload).some(key => key !== "buttonId")) return res.status(400).json({ ok: false, error: "effect_action_accepts_button_id_only" });
      const button = services.remoteEffectCatalog?.resolve?.(payload.buttonId);
      if (!button) return res.status(404).json({ ok: false, error: "remote_effect_button_not_found" });
      try {
        const result = services.effectTransport.trigger({
          protocol: "vct.obs-screen-effect",
          protocolVersion: 1,
          messageId: crypto.randomUUID(),
          source: { role: "remote", instanceId: `remote-${req.remoteSession.id}` },
          type: "effect.trigger",
          sentAt: Date.now(),
          payload: { effectId: button.effectId, params: button.params },
        });
        const body = { ok: true, requestId: req.body.requestId, buttonId: button.buttonId, delivered: result.delivered, messageId: result.messageId };
        rememberAction(recentActions, actionKey, body);
        return res.json(body);
      } catch (error) {
        return res.status(error.status || 400).json({ ok: false, error: error.message || "effect_trigger_failed" });
      }
    }
    if (req.body?.type !== "counter.command") return res.status(400).json({ ok: false, error: "unsupported_action_type" });
    if (!new Set(["increment", "decrement", "reset"]).has(payload.operation)) return res.status(400).json({ ok: false, error: "unsupported_operation" });
    if (payload.operation === "reset" && payload.confirm !== true) return res.status(400).json({ ok: false, error: "reset_confirmation_required" });
    try {
      const result = services.gpCounterV2.command({ operation: payload.operation, counterId: payload.counterId, delta: payload.delta, cause: "remote" });
      const body = { ok: true, requestId: req.body.requestId, ...result };
      rememberAction(recentActions, actionKey, body);
      return res.json(body);
    } catch (error) {
      return res.status(error.status || 400).json({ ok: false, error: error.message || "invalid_command" });
    }
  });

  app.post("/remote/api/logout", requireSameOrigin, (req, res) => {
    const token = parseCookie(req.headers.cookie)[COOKIE_NAME];
    auth.revoke(token);
    closeSessionClients(req.remoteSession.id);
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.json({ ok: true });
  });

  app.use((_req, res) => res.status(404).json({ ok: false, error: "not_found" }));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === "entity.too.large") return res.status(413).json({ ok: false, error: "body_too_large" });
    if (error instanceof SyntaxError) return res.status(400).json({ ok: false, error: "invalid_json" });
    logger.error?.("[remote] request error", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  });

  function requireSameOrigin(req, res, next) {
    const origin = req.get("origin");
    const expected = `${req.protocol}://${req.get("host")}`;
    if (origin !== expected) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
    return next();
  }

  function authenticate(req, res, next) {
    const token = parseCookie(req.headers.cookie)[COOKIE_NAME];
    const session = auth.authenticate(token);
    if (!session) return res.status(401).json({ ok: false, error: "authentication_required" });
    req.remoteSession = session;
    return next();
  }

  async function start() {
    if (!config.enabled) return null;
    if (server.listening) return server.address();
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => { server.off("error", reject); resolve(); });
      });
      lastError = null;
      auth.regeneratePairingCode();
      heartbeatTimer = setInterval(() => { for (const client of sseClients) client.res.write(": keepalive\n\n"); }, 25000);
      heartbeatTimer.unref?.();
      for (const url of remoteUrls(config, server.address()?.port ?? config.port)) logger.info?.(`[remote] URL ${url}`);
      return server.address();
    } catch (error) {
      lastError = { code: error.code || "REMOTE_START_FAILED", message: error.message };
      logger.error?.(`[remote] listener failed ${config.host}:${config.port}: ${error.message}`);
      return null;
    }
  }

  async function stop() {
    clearInterval(heartbeatTimer); heartbeatTimer = null;
    for (const client of sseClients) client.res.end();
    sseClients.clear();
    if (!server.listening) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }

  function status() {
    return {
      enabled: config.enabled,
      state: !config.enabled ? "disabled" : server.listening ? "listening" : lastError ? "error" : "stopped",
      host: config.host,
      port: server.address()?.port ?? config.port,
      error: lastError ? { ...lastError } : null,
      urls: server.listening ? remoteUrls(config, server.address()?.port ?? config.port) : [],
      sseClients: sseClients.size,
    };
  }

  function pairingInfo() { return { ...auth.pairingInfo(), sessions: auth.listSessions() }; }
  function regeneratePairingCode() { return auth.regeneratePairingCode(); }
  function revokeAllSessions() {
    const count = auth.revokeAll();
    publishSse("session.revoked", {});
    for (const client of sseClients) client.res.end();
    sseClients.clear();
    return count;
  }

  function publishSse(event, data) {
    for (const client of [...sseClients]) {
      if (client.res.destroyed) sseClients.delete(client);
      else writeSse(client.res, event, data);
    }
  }

  function closeSessionClients(sessionId) {
    for (const client of [...sseClients]) {
      if (client.sessionId !== sessionId) continue;
      writeSse(client.res, "session.revoked", {}); client.res.end(); sseClients.delete(client);
    }
  }

  return Object.freeze({ app, server, config, auth, start, stop, status, pairingInfo, regeneratePairingCode, revokeAllSessions, publishSse, unsubscribe: () => { unsubscribeCounter?.(); unsubscribeEffects?.(); } });
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function remoteUrls(config, port) {
  const hosts = config.host !== "0.0.0.0" ? [config.host] : Object.entries(os.networkInterfaces())
    .filter(([name]) => !isVirtualInterface(name))
    .flatMap(([, addresses]) => addresses || [])
    .filter(item => item && item.family === "IPv4" && !item.internal && !item.address.startsWith("169.254."))
    .map(item => item.address);
  return [...new Set(hosts)].map(host => `http://${host}:${port}/remote/`);
}

function isVirtualInterface(name) {
  return /(?:^|[\s(])(?:vEthernet|WSL|Hyper-V|Docker|VMware|VirtualBox|Default Switch|VPN|Tailscale|ZeroTier)(?:[\s)]|$)/i.test(String(name));
}

function clientAddress(req) { return req.socket.remoteAddress || "unknown"; }

function allowRequest(store, key, limit, windowMs) {
  const current = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= current) {
    store.set(key, { count: 1, resetAt: current + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

function validRequestId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

function rememberAction(store, key, body) {
  const current = Date.now();
  for (const [storedKey, entry] of store) if (entry.expiresAt <= current) store.delete(storedKey);
  store.set(key, { expiresAt: current + 5 * 60 * 1000, body });
}

module.exports = { REMOTE_DEFAULTS, normalizeRemoteConfig, createRemoteServer, remoteUrls, isVirtualInterface };
