"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SESSION_SCHEMA = "vct.remote-sessions";
const SESSION_SCHEMA_VERSION = 1;
const COOKIE_NAME = "vct_remote_session";

function createRemoteAuthService(options = {}) {
  const dataFile = options.dataFile === null ? null : path.resolve(options.dataFile || path.join(__dirname, "data", "remote-sessions.json"));
  const sessionDays = options.sessionDays || 30;
  const pairingTtlMs = options.pairingTtlMs || 10 * 60 * 1000;
  const now = options.now || (() => Date.now());
  const logger = options.logger || console;
  let sessions = [];
  let pairing = null;

  load();

  function load() {
    if (!dataFile || !fs.existsSync(dataFile)) return;
    try {
      const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      if (saved?.schema !== SESSION_SCHEMA || saved?.schemaVersion !== SESSION_SCHEMA_VERSION || !Array.isArray(saved.sessions)) throw new Error("unsupported session file");
      sessions = saved.sessions.filter(validSessionRecord);
      prune();
    } catch (error) {
      logger.error?.(`[remote] failed to read sessions: ${error.message}`);
      sessions = [];
    }
  }

  function persist() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    const document = { schema: SESSION_SCHEMA, schemaVersion: SESSION_SCHEMA_VERSION, sessions };
    fs.writeFileSync(temporaryFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryFile, dataFile);
  }

  function prune() {
    const current = now();
    const previousLength = sessions.length;
    sessions = sessions.filter(session => session.expiresAt > current);
    if (sessions.length !== previousLength) persist();
  }

  function regeneratePairingCode() {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    pairing = { code, expiresAt: now() + pairingTtlMs };
    return pairingInfo();
  }

  function pairingInfo() {
    if (!pairing || pairing.expiresAt <= now()) return { active: false, code: null, expiresAt: null };
    return { active: true, code: pairing.code, expiresAt: pairing.expiresAt };
  }

  function pair(code, deviceName) {
    const info = pairingInfo();
    if (!info.active || !safeEqual(String(code || ""), pairing.code)) return null;
    pairing = null;
    prune();
    const token = crypto.randomBytes(32).toString("base64url");
    const createdAt = now();
    const session = {
      id: crypto.randomUUID(),
      tokenHash: hashToken(token),
      deviceName: normalizeDeviceName(deviceName),
      createdAt,
      expiresAt: createdAt + sessionDays * 24 * 60 * 60 * 1000,
      lastSeenAt: createdAt,
    };
    sessions.push(session);
    persist();
    return { token, session: publicSession(session) };
  }

  function authenticate(token) {
    if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
    prune();
    const tokenHash = hashToken(token);
    const session = sessions.find(item => safeEqual(item.tokenHash, tokenHash));
    if (!session) return null;
    session.lastSeenAt = now();
    return publicSession(session);
  }

  function revoke(token) {
    if (typeof token !== "string") return false;
    const tokenHash = hashToken(token);
    const previousLength = sessions.length;
    sessions = sessions.filter(item => !safeEqual(item.tokenHash, tokenHash));
    if (sessions.length !== previousLength) persist();
    return sessions.length !== previousLength;
  }

  function revokeAll() {
    const count = sessions.length;
    sessions = [];
    persist();
    return count;
  }

  function listSessions() {
    prune();
    return sessions.map(publicSession);
  }

  return Object.freeze({ regeneratePairingCode, pairingInfo, pair, authenticate, revoke, revokeAll, listSessions });
}

function parseCookie(header = "") {
  const cookies = {};
  String(header).split(";").forEach(part => {
    const separator = part.indexOf("=");
    if (separator < 0) return;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function sessionCookie(token, maxAgeSeconds) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/remote; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/remote; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function validSessionRecord(value) {
  return value && typeof value.id === "string" && typeof value.tokenHash === "string" && typeof value.deviceName === "string"
    && Number.isFinite(value.createdAt) && Number.isFinite(value.expiresAt) && Number.isFinite(value.lastSeenAt);
}

function publicSession(session) {
  return { id: session.id, deviceName: session.deviceName, createdAt: session.createdAt, expiresAt: session.expiresAt, lastSeenAt: session.lastSeenAt };
}

function normalizeDeviceName(value) {
  if (typeof value !== "string" || !value.trim()) return "Remote device";
  return value.trim().slice(0, 80);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { createRemoteAuthService, parseCookie, sessionCookie, clearSessionCookie, COOKIE_NAME };
