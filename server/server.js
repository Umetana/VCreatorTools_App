"use strict";

const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocket, WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const { createGpCounterV2Service } = require("./gp-counter-v2-service");
const { createEffectTransportService } = require("./effect-transport-service");
const { createMaroV2Service } = require("./maro-v2-service");
const { REMOTE_DEFAULTS, normalizeRemoteConfig, createRemoteServer } = require("./remote-server");
const { createRemoteEffectCatalogService } = require("./remote-effect-catalog-service");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const SERVICE_VERSION = "1.0.0";
const BRIDGE_SCHEMA = "msbridge.event.v1";
const MATERIAL_SCHEMA = "material-hub.event.v1";
const MATERIAL_STATE_SCHEMA = "material-view.state.v1";
const GP_COUNTER_SCHEMA = "gp-counter.event.v1";
const GP_COUNTER_STATE_SCHEMA = "gp-counter.state.v1";
const ALLOWED_EVENT_TYPES = new Set(["comment", "meta"]);

function loadConfig(configFile = path.join(__dirname, "server.config.json")) {
  const defaults = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    bodyLimit: "256kb",
    publicDir: "public",
    userGadgetsDir: null,
    materialDataFile: "data/material-view.json",
    gpCounterDataFile: "data/gp-counter.json",
    gpCounterV2DataFile: "data/gp-counter-v2.json",
    maroV2DataFile: "data/maro-v2.json",
    remote: REMOTE_DEFAULTS,
    logging: { directory: "logs", maxBytes: 1048576, keepFiles: 14 },
  };
  if (!fs.existsSync(configFile)) return defaults;
  const loaded = JSON.parse(fs.readFileSync(configFile, "utf8"));
  const merged = { ...defaults, ...loaded, remote: { ...defaults.remote, ...(loaded.remote || {}) }, logging: { ...defaults.logging, ...(loaded.logging || {}) } };
  merged.remote = normalizeRemoteConfig(merged.remote, { mainPort: merged.port });
  return merged;
}

function createFileLogger(options = {}) {
  const directory = path.resolve(options.directory || path.join(__dirname, "logs"));
  const maxBytes = Number(options.maxBytes || 1048576);
  const keepFiles = Number(options.keepFiles || 14);
  fs.mkdirSync(directory, { recursive: true });

  function logFile() {
    return path.join(directory, `server-${new Date().toISOString().slice(0, 10)}.log`);
  }

  function rotate(file) {
    if (!fs.existsSync(file) || fs.statSync(file).size < maxBytes) return;
    const suffix = new Date().toISOString().replace(/[:.]/g, "-");
    fs.renameSync(file, path.join(directory, `${path.basename(file, ".log")}-${suffix}.log`));
  }

  function prune() {
    const files = fs.readdirSync(directory)
      .filter((name) => /^server-.*\.log$/.test(name))
      .map((name) => ({ name, time: fs.statSync(path.join(directory, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    for (const file of files.slice(keepFiles)) fs.unlinkSync(path.join(directory, file.name));
  }

  function write(level, values) {
    const file = logFile();
    rotate(file);
    const message = values.map((value) => value instanceof Error ? value.stack || value.message : String(value)).join(" ");
    const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}`;
    fs.appendFileSync(file, `${line}\n`, "utf8");
    console[level === "error" ? "error" : "log"](line);
  }

  prune();
  return { info: (...values) => write("info", values), error: (...values) => write("error", values) };
}

function validateBridgeEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "body_must_be_object";
  if (value.schema !== BRIDGE_SCHEMA) return "unsupported_schema";
  if (!ALLOWED_EVENT_TYPES.has(value.eventType)) return "unsupported_event_type";
  if (!value.payload || typeof value.payload !== "object" || Array.isArray(value.payload)) {
    return "payload_must_be_object";
  }
  return null;
}

function validateMaterialState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "body_must_be_object";
  if (value.schema !== MATERIAL_STATE_SCHEMA) return "unsupported_schema";
  if (!Number.isInteger(value.revision) || value.revision < 0) return "revision_must_be_nonnegative_integer";
  if (!Array.isArray(value.articles)) return "articles_must_be_array";
  if (!Array.isArray(value.extraCatalog)) return "extra_catalog_must_be_array";
  if (!Array.isArray(value.displayOrder) || !value.displayOrder.every(id => typeof id === "string")) return "display_order_must_be_string_array";
  if (!Array.isArray(value.selectedIds) || !value.selectedIds.every(id => typeof id === "string")) return "selected_ids_must_be_string_array";
  if (value.currentId != null && typeof value.currentId !== "string") return "current_id_must_be_string";
  if (!value.sharedSettings || typeof value.sharedSettings !== "object" || Array.isArray(value.sharedSettings)) return "shared_settings_must_be_object";
  if (!Array.isArray(value.importedBatches)) return "imported_batches_must_be_array";
  return null;
}

function emptyMaterialState() {
  return { schema: MATERIAL_STATE_SCHEMA, revision: 0, updatedAt: null, articles: [], extraCatalog: [], displayOrder: [], selectedIds: [], currentId: null, sharedSettings: {}, importedBatches: [] };
}

function validateGpCounterState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "body_must_be_object";
  if (value.schema !== GP_COUNTER_STATE_SCHEMA) return "unsupported_schema";
  if (!Number.isInteger(value.revision) || value.revision < 0) return "revision_must_be_nonnegative_integer";
  if (!Array.isArray(value.counters)) return "counters_must_be_array";
  const ids = new Set();
  for (const counter of value.counters) {
    if (!counter || typeof counter !== "object" || Array.isArray(counter)) return "counter_must_be_object";
    if (typeof counter.id !== "string" || !counter.id || ids.has(counter.id)) return "counter_id_must_be_unique_string";
    if (!Number.isSafeInteger(counter.count) || counter.count < 0) return "counter_count_must_be_nonnegative_integer";
    ids.add(counter.id);
  }
  return null;
}

function emptyGpCounterState() {
  return { schema: GP_COUNTER_STATE_SCHEMA, revision: 0, updatedAt: null, counters: [] };
}

function createUnifiedServer(options = {}) {
  const config = options.config || {};
  const host = options.host || process.env.HOST || config.host || DEFAULT_HOST;
  const port = Number(options.port ?? process.env.PORT ?? config.port ?? DEFAULT_PORT);
  const publicDir = path.resolve(options.publicDir || config.publicDir || path.join(__dirname, "public"));
  const configuredUserGadgetsDir = options.userGadgetsDir ?? process.env.VCT_USER_GADGETS_DIR ?? config.userGadgetsDir;
  const userGadgetsDir = configuredUserGadgetsDir ? path.resolve(configuredUserGadgetsDir) : null;
  const userGadgetsAvailable = Boolean(userGadgetsDir && fs.existsSync(userGadgetsDir) && fs.statSync(userGadgetsDir).isDirectory());
  const dataFile = options.dataFile === null
    ? null
    : path.resolve(options.dataFile || process.env.MATERIAL_DATA_FILE || config.materialDataFile || path.join(__dirname, "data", "material-view.json"));
  const gpCounterDataFile = options.gpCounterDataFile === null || options.dataFile === null
    ? null
    : path.resolve(options.gpCounterDataFile || process.env.GP_COUNTER_DATA_FILE || config.gpCounterDataFile || path.join(__dirname, "data", "gp-counter.json"));
  const gpCounterV2DataFile = options.gpCounterV2DataFile === null || options.dataFile === null
    ? null
    : path.resolve(options.gpCounterV2DataFile || process.env.GP_COUNTER_V2_DATA_FILE || config.gpCounterV2DataFile || path.join(__dirname, "data", "gp-counter-v2.json"));
  const maroV2DataFile = options.maroV2DataFile === null || options.dataFile === null
    ? null
    : path.resolve(options.maroV2DataFile || process.env.MARO_V2_DATA_FILE || config.maroV2DataFile || path.join(__dirname, "data", "maro-v2.json"));
  const bodyLimit = options.bodyLimit || process.env.BODY_LIMIT || config.bodyLimit || "256kb";
  const bridgeToken = options.bridgeToken ?? process.env.BRIDGE_TOKEN ?? "";
  const adminToken = options.adminToken ?? process.env.VCT_ADMIN_TOKEN ?? "";
  const logger = options.logger || console;
  const remoteConfig = normalizeRemoteConfig(options.remote || config.remote, { env: process.env, mainPort: port });
  const app = express();
  const startedAt = new Date();
  const counters = { bridgeEvents: 0, materialUpdates: 0, materialCommands: 0, gpCounterUpdates: 0, gpCounterCommands: 0, effectTriggers: 0 };

  function isAdminRequest(req) {
    if (!adminToken) return true;
    const supplied = req.get("X-VCT-Admin-Token") || "";
    const expectedBuffer = Buffer.from(adminToken);
    const suppliedBuffer = Buffer.from(supplied);
    return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
  }

  function requireAdmin(req, res, next) {
    if (isAdminRequest(req)) return next();
    return res.status(403).json({ ok: false, error: "admin_authorization_required" });
  }

  let materialState = emptyMaterialState();
  if (dataFile && fs.existsSync(dataFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      if (saved?.schema === MATERIAL_STATE_SCHEMA) materialState = { ...materialState, ...saved };
      else if (saved && Array.isArray(saved.items)) {
        materialState = { ...materialState, revision: Number(saved.revision) || 0, updatedAt: saved.updatedAt || null, articles: saved.items, selectedIds: saved.selectedId ? [saved.selectedId] : [], currentId: saved.selectedId || null };
      }
    } catch (error) {
      logger.error?.(`[material] failed to read ${dataFile}: ${error.message}`);
    }
  }

  let gpCounterState = emptyGpCounterState();
  if (gpCounterDataFile && fs.existsSync(gpCounterDataFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(gpCounterDataFile, "utf8"));
      if (!validateGpCounterState(saved)) gpCounterState = { ...gpCounterState, ...saved };
    } catch (error) {
      logger.error?.(`[gp-counter] failed to read ${gpCounterDataFile}: ${error.message}`);
    }
  }

  app.disable("x-powered-by");
  app.use(express.json({ limit: bodyLimit, strict: true }));
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/events" });

  function broadcast(event) {
    const message = JSON.stringify(event);
    let delivered = 0;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        delivered += 1;
      }
    }
    return delivered;
  }

  function persistMaterialState() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(materialState, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryFile, dataFile);
  }

  function persistGpCounterState() {
    if (!gpCounterDataFile) return;
    fs.mkdirSync(path.dirname(gpCounterDataFile), { recursive: true });
    const temporaryFile = `${gpCounterDataFile}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(gpCounterState, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryFile, gpCounterDataFile);
  }

  function publishGpCounterState() {
    const event = { schema: GP_COUNTER_SCHEMA, eventType: "state", sentAt: gpCounterState.updatedAt, payload: gpCounterState };
    return broadcast(event);
  }

  const gpCounterV2 = createGpCounterV2Service({ dataFile: gpCounterV2DataFile, broadcast, logger });
  gpCounterV2.mount(app);
  const effectTransport = createEffectTransportService({
    broadcast,
    logger,
    onAccepted: () => { counters.effectTriggers += 1; }
  });
  effectTransport.mount(app);
  const maroV2 = createMaroV2Service({ dataFile: maroV2DataFile, broadcast, logger });
  maroV2.mount(app);
  const remoteEffectCatalogFile = options.remoteEffectCatalogFile === null || options.dataFile === null
    ? null
    : path.resolve(options.remoteEffectCatalogFile || remoteConfig.effectCatalogFile || path.join(__dirname, "data", "remote-effects.json"));
  const remoteEffectCatalog = createRemoteEffectCatalogService({ dataFile: remoteEffectCatalogFile, logger });
  remoteEffectCatalog.mount(app);
  const remoteSessionFile = options.remoteSessionFile === null || options.dataFile === null
    ? null
    : path.resolve(options.remoteSessionFile || remoteConfig.sessionFile || path.join(__dirname, "data", "remote-sessions.json"));
  const remote = createRemoteServer({ config: remoteConfig, mainPort: port, sessionFile: remoteSessionFile, bodyLimit: "32kb", logger, services: { gpCounterV2, effectTransport, remoteEffectCatalog } });

  app.use("/bridge", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.post("/bridge", (req, res) => {
    if (bridgeToken) {
      const token = req.get("x-bridge-token") || req.body?.token || "";
      if (token !== bridgeToken) return res.status(401).json({ ok: false, error: "bad_token" });
    }
    const validationError = validateBridgeEvent(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });
    const event = { ...req.body, hubReceivedAt: new Date().toISOString() };
    const delivered = broadcast(event);
    counters.bridgeEvents += 1;
    logger.info?.(`[bridge] ${event.eventType} clients=${delivered}`);
    return res.json({ ok: true, delivered, hubReceivedAt: event.hubReceivedAt });
  });

  app.get("/api/get-gadgets", (_req, res, next) => {
    try {
      const allowedModes = new Set(["standalone", "sync", "server"]);
      const allowedRoles = new Set(["display", "control", "settings", "hub", "editor"]);
      const allowedStatuses = new Set(["development", "beta", "release"]);
      const normalizeModes = (value, fieldName) => {
        if (value === undefined) return ["sync"];
        if (!Array.isArray(value) || value.length === 0) throw new Error(`${fieldName} must be a non-empty array`);
        if (!value.every((mode) => typeof mode === "string" && allowedModes.has(mode))) {
          throw new Error(`${fieldName} contains an unsupported mode`);
        }
        return [...new Set(value)];
      };
      const validatePageFile = (folderDir, value, fieldName) => {
        if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} must be a non-empty string`);
        const file = value.trim();
        if (/^(?:[a-z][a-z0-9+.-]*:|[\\/])/i.test(file)) throw new Error(`${fieldName} must be relative`);
        let filePath;
        try { filePath = decodeURIComponent(file.split(/[?#]/, 1)[0]).replace(/\\/g, "/"); }
        catch { throw new Error(`${fieldName} contains invalid encoding`); }
        if (!filePath.toLowerCase().endsWith(".html") || filePath.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
          throw new Error(`${fieldName} must point to a local HTML file`);
        }
        const absoluteFile = path.resolve(folderDir, ...filePath.split("/"));
        if (!absoluteFile.startsWith(`${path.resolve(folderDir)}${path.sep}`) || !fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) {
          throw new Error(`${fieldName} does not exist`);
        }
        return file;
      };
      const pageUrl = (root, folder, file, mode) => {
        const url = new URL(`http://${host}:${server.address()?.port ?? port}/${root.urlKey || root.key}/${folder}/${file}`);
        if (mode !== "standalone") url.searchParams.set("vctMode", mode);
        return url.toString();
      };
      const roots = [
        { key: "V_CreatorTools", label: "[VCT]", cssClass: "tag-vct", color: "#19a974" },
        { key: "Custom", label: "[Custom]", cssClass: "tag-custom", color: "#2f80ed" },
        { key: "vct_web_app", label: "[Web App]", cssClass: "tag-web-app", color: "#a78bfa" },
        ...(userGadgetsAvailable ? [{ key: "user_gadgets", urlKey: "user_gadgets", directory: userGadgetsDir, requireManifest: true, label: "[User]", cssClass: "tag-user", color: "#f59e0b" }] : []),
      ];
      const gadgets = roots.flatMap((root) => {
        const rootDir = root.directory || path.join(publicDir, root.key);
        if (!fs.existsSync(rootDir)) return [];
        return fs.readdirSync(rootDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .flatMap((entry) => {
            const folderDir = path.join(rootDir, entry.name);
            const manifestFile = path.join(folderDir, "manifest.json");
            try {
              const manifest = fs.existsSync(manifestFile)
                ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
                : null;
              if (root.requireManifest && manifest === null) throw new Error("manifest.json is required for user gadgets");
              if (manifest !== null && (!manifest || typeof manifest !== "object" || Array.isArray(manifest))) {
                throw new Error("manifest root must be an object");
              }
              if (manifest?.name !== undefined && (typeof manifest.name !== "string" || !manifest.name.trim())) {
                throw new Error("manifest.name must be a non-empty string");
              }
              if (manifest?.schemaVersion !== undefined && manifest.schemaVersion !== 1) {
                throw new Error("manifest.schemaVersion must be 1");
              }
              if (manifest?.version !== undefined && (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version))) {
                throw new Error("manifest.version must be a semantic version");
              }
              if (manifest?.status !== undefined && !allowedStatuses.has(manifest.status)) {
                throw new Error("manifest.status is unsupported");
              }
              if (manifest?.pages !== undefined && !Array.isArray(manifest.pages)) {
                throw new Error("manifest.pages must be an array");
              }
              const pages = manifest?.pages ?? fs.readdirSync(folderDir)
                .filter((file) => file.toLowerCase().endsWith(".html"))
                .map((file) => ({ name: file, file }));
              const gadgetModes = normalizeModes(manifest?.modes, "manifest.modes");
              const normalizedPages = pages.map((page, index) => {
                if (!page || typeof page !== "object" || Array.isArray(page)) throw new Error(`manifest.pages[${index}] must be an object`);
                const file = validatePageFile(folderDir, page.file, `manifest.pages[${index}].file`);
                if (page.name !== undefined && (typeof page.name !== "string" || !page.name.trim())) {
                  throw new Error(`manifest.pages[${index}].name must be a non-empty string`);
                }
                const modes = normalizeModes(page.modes ?? gadgetModes, `manifest.pages[${index}].modes`);
                const role = page.role ?? (page.type === "view" ? "display" : page.type) ?? "display";
                if (typeof role !== "string" || !allowedRoles.has(role)) throw new Error(`manifest.pages[${index}].role is unsupported`);
                if (page.obs !== undefined && typeof page.obs !== "boolean") throw new Error(`manifest.pages[${index}].obs must be boolean`);
                const urls = Object.fromEntries(modes.map((mode) => [mode, pageUrl(root, entry.name, file, mode)]));
                return { name: page.name?.trim() || file, type: page.type ?? role, role, obs: page.obs ?? false, modes, urls, url: urls.sync ?? urls.server ?? urls.standalone };
              });
              if (normalizedPages.length === 0) return [];
              const rawName = manifest?.name?.trim() || `${entry.name}${manifest ? "" : " (Auto)"}`;
              return [{
                name: `${root.label} ${rawName}`,
                rawName,
                version: manifest?.version,
                status: manifest?.status,
                root: root.key,
                tag: { text: root.label, class: root.cssClass, color: root.color,
                  html: `<span style="font-weight:700;color:${root.color}">${root.label}</span>` },
                modes: gadgetModes,
                pages: normalizedPages,
              }];
            } catch (error) {
              logger.error?.(`[gadgets] skipped ${root.key}/${entry.name}: ${error.message}`);
              return [];
            }
          });
      });
      res.json(gadgets);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/material-view/state", (_req, res) => res.json(materialState));

  app.put("/api/material-view/state", (req, res) => {
    const validationError = validateMaterialState(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });
    if (req.body.revision !== materialState.revision) {
      return res.status(409).json({ ok: false, error: "revision_conflict", state: materialState });
    }
    materialState = { ...req.body, revision: materialState.revision + 1, updatedAt: new Date().toISOString() };
    counters.materialUpdates += 1;
    persistMaterialState();
    const event = { schema: MATERIAL_SCHEMA, eventType: "state", sentAt: materialState.updatedAt, payload: materialState };
    const delivered = broadcast(event);
    return res.json({ ok: true, delivered, state: materialState });
  });

  app.post("/api/material-view/command", (req, res) => {
    const { command, itemId = null, value = null } = req.body || {};
    if (!new Set(["show", "hide", "next", "previous", "show-list", "show-detail", "visibility-command", "visibility-query", "visibility-status"]).has(command)) {
      return res.status(400).json({ ok: false, error: "unsupported_command" });
    }
    if (itemId != null && typeof itemId !== "string") {
      return res.status(400).json({ ok: false, error: "item_id_must_be_string" });
    }
    if (value != null && typeof value !== "boolean") {
      return res.status(400).json({ ok: false, error: "value_must_be_boolean" });
    }
    const event = {
      schema: MATERIAL_SCHEMA,
      eventType: "command",
      sentAt: new Date().toISOString(),
      payload: { command, itemId, value },
    };
    counters.materialCommands += 1;
    return res.json({ ok: true, delivered: broadcast(event) });
  });

  app.get("/api/gp-counter/state", (_req, res) => res.json(gpCounterState));

  app.put("/api/gp-counter/state", (req, res) => {
    const validationError = validateGpCounterState(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });
    if (req.body.revision !== gpCounterState.revision) {
      return res.status(409).json({ ok: false, error: "revision_conflict", state: gpCounterState });
    }
    gpCounterState = { ...req.body, revision: gpCounterState.revision + 1, updatedAt: new Date().toISOString() };
    counters.gpCounterUpdates += 1;
    persistGpCounterState();
    return res.json({ ok: true, delivered: publishGpCounterState(), state: gpCounterState });
  });

  app.post("/api/gp-counter/command", (req, res) => {
    const { command, counterId, delta = 0 } = req.body || {};
    if (!new Set(["increment", "reset"]).has(command)) return res.status(400).json({ ok: false, error: "unsupported_command" });
    if (typeof counterId !== "string" || !counterId) return res.status(400).json({ ok: false, error: "counter_id_must_be_string" });
    if (command === "increment" && (!Number.isSafeInteger(delta) || delta === 0)) {
      return res.status(400).json({ ok: false, error: "delta_must_be_nonzero_integer" });
    }
    const index = gpCounterState.counters.findIndex(counter => counter.id === counterId);
    if (index < 0) return res.status(404).json({ ok: false, error: "counter_not_found" });
    const current = gpCounterState.counters[index];
    const count = command === "reset" ? 0 : Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, current.count + delta));
    gpCounterState = {
      ...gpCounterState,
      revision: gpCounterState.revision + 1,
      updatedAt: new Date().toISOString(),
      counters: gpCounterState.counters.map((counter, counterIndex) => counterIndex === index ? { ...counter, count } : counter),
    };
    counters.gpCounterCommands += 1;
    persistGpCounterState();
    return res.json({ ok: true, delivered: publishGpCounterState(), state: gpCounterState });
  });

  function health() {
    return {
    ok: true,
    service: "vct-unified-server",
    version: SERVICE_VERSION,
    host,
    port: server.address()?.port ?? port,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    websocketClients: wss.clients.size,
    counters: { ...counters },
    acceptedSchema: BRIDGE_SCHEMA,
    acceptedEventTypes: [...ALLOWED_EVENT_TYPES],
    features: { static: true, gadgets: true, userGadgets: userGadgetsAvailable, websocket: true, bridge: true, materialView: true, gpCounter: true, gpCounterV2: true, screenEffectV2: true, maroV2: true, remote: remote.status() },
    };
  }

  app.get("/health", (_req, res) => res.json(health()));
  app.get("/api/remote/status", (req, res) => {
    const authorized = isAdminRequest(req);
    const pairing = authorized ? remote.pairingInfo() : { active: false, code: null, expiresAt: null, sessions: [], restricted: true };
    return res.json({ ok: true, remote: remote.status(), pairing });
  });
  app.get("/api/remote/qr", async (req, res) => {
    const urls = remote.status().urls;
    const index = Number(req.query.index || 0);
    if (!Number.isInteger(index) || index < 0 || index >= urls.length) return res.status(404).json({ ok: false, error: "remote_url_not_found" });
    try {
      const svg = await QRCode.toString(urls[index], { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 220 });
      return res.type("svg").send(svg);
    } catch (error) {
      logger.error?.("[remote] QR generation failed", error);
      return res.status(500).json({ ok: false, error: "qr_generation_failed" });
    }
  });
  app.post("/api/remote/pairing/regenerate", requireAdmin, (_req, res) => res.json({ ok: true, pairing: remote.regeneratePairingCode() }));
  app.post("/api/remote/sessions/revoke-all", requireAdmin, (_req, res) => res.json({ ok: true, revoked: remote.revokeAllSessions() }));
  app.get("/admin", (_req, res) => res.type("html").send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>VCreatorTools Server</title><style>
body{font:16px system-ui;margin:0;background:#111827;color:#e5e7eb}main{max-width:800px;margin:48px auto;padding:24px}
  h1{margin:0 0 8px}.ok{color:#34d399}.card{background:#1f2937;border:1px solid #374151;border-radius:12px;padding:18px;margin-top:18px}
  .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.qrs{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px}.qr{padding:10px;background:#fff;color:#111;border-radius:9px;text-align:center}.qr img{display:block;width:180px;height:180px}.qr small{display:block;max-width:180px;overflow-wrap:anywhere}button{padding:9px 12px;border:1px solid #4b5563;border-radius:7px;background:#1f2937;color:#e5e7eb;cursor:pointer}
dl{display:grid;grid-template-columns:180px 1fr;gap:10px;margin:0}dt{color:#9ca3af}dd{margin:0}code{color:#93c5fd}
  </style></head><body><main><h1>VCreatorTools Server</h1><p id="summary">確認中...</p><div class="card"><dl id="status"></dl><div id="remote-qrs" class="qrs"></div><div id="admin-actions" class="actions"><button onclick="remoteAction('/api/remote/pairing/regenerate')">Pairing code再生成</button><button onclick="remoteAction('/api/remote/sessions/revoke-all','すべてのRemote端末をログアウトしますか？')">全Remote Session破棄</button></div></div>
  <script>const summaryElement=document.getElementById('summary');const statusElement=document.getElementById('status');
  async function refresh(){try{const [h,r]=await Promise.all([fetch('/health',{cache:'no-store'}).then(r=>r.json()),fetch('/api/remote/status',{cache:'no-store'}).then(r=>r.json())]);summaryElement.innerHTML='<span class="ok">● 稼働中</span>';
  const rows={バージョン:h.version,待受:h.host+':'+h.port,Remote:h.features.remote.state+(h.features.remote.error?' ('+h.features.remote.error.code+')':''),'Remote URL':h.features.remote.urls.join(' / ')||'無効','Pairing code':r.pairing.restricted?'Electron Appで管理':(r.pairing.active?r.pairing.code:'未発行'),'Remote Session':r.pairing.restricted?'非表示':r.pairing.sessions.length,稼働時間:h.uptimeSeconds+' 秒',WebSocket接続:h.websocketClients,
'Bridge受信':h.counters.bridgeEvents,'Material更新':h.counters.materialUpdates};
  statusElement.innerHTML=Object.entries(rows).map(([k,v])=>'<dt>'+k+'</dt><dd><code>'+v+'</code></dd>').join('');document.getElementById('admin-actions').hidden=r.pairing.restricted===true;document.getElementById('remote-qrs').innerHTML=h.features.remote.urls.map((url,index)=>'<div class="qr"><img src="/api/remote/qr?index='+index+'" alt="Remote URL QR"><small>'+url+'</small></div>').join('')}catch(e){summaryElement.textContent='サーバー状態を取得できません'}}
  async function remoteAction(path,message){if(message&&!confirm(message))return;await fetch(path,{method:'POST'});refresh()}refresh();setInterval(refresh,3000)</script>
</main></body></html>`));

  if (userGadgetsAvailable) {
    const realUserGadgetsDir = fs.realpathSync(userGadgetsDir);
    app.use("/user_gadgets", (req, res, next) => {
      try {
        const requested = path.resolve(userGadgetsDir, `.${decodeURIComponent(req.path)}`);
        if (!fs.existsSync(requested)) return next();
        const relative = path.relative(realUserGadgetsDir, fs.realpathSync(requested));
        if (relative.startsWith("..") || path.isAbsolute(relative)) return res.status(403).json({ ok: false, error: "user_gadget_path_forbidden" });
        return next();
      } catch {
        return res.status(400).json({ ok: false, error: "invalid_user_gadget_path" });
      }
    }, express.static(userGadgetsDir, { index: false, fallthrough: true }));
  }
  app.use(express.static(publicDir));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === "entity.too.large") return res.status(413).json({ ok: false, error: "body_too_large" });
    if (error instanceof SyntaxError) return res.status(400).json({ ok: false, error: "invalid_json" });
    logger.error?.("[server] request error", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  });

  wss.on("connection", (socket, request) => {
    logger.info?.(`[ws] connected from ${request.socket.remoteAddress}`);
    socket.on("close", () => logger.info?.("[ws] disconnected"));
  });

  async function start() {
    if (server.listening) return server.address();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => { server.off("error", reject); resolve(); });
    });
    await remote.start();
    return server.address();
  }

  async function stop() {
    await remote.stop();
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve, reject) => {
      wss.close((wsError) => {
        if (wsError && wsError.code !== "ERR_SERVER_NOT_RUNNING") return reject(wsError);
        if (!server.listening) return resolve();
        server.close((serverError) => (serverError ? reject(serverError) : resolve()));
      });
    });
  }

  return { app, server, wss, remote, services: { gpCounterV2, effectTransport, maroV2, remoteEffectCatalog }, start, stop, broadcast };
}

if (require.main === module) {
  let config;
  try {
    config = loadConfig(process.env.VCT_CONFIG_FILE || undefined);
  } catch (error) {
    console.error(`server.config.json を読み込めません: ${error.message}`);
    process.exit(1);
  }
  const logDirectory = path.resolve(config.logging.directory || "logs");
  const logger = createFileLogger({ ...config.logging, directory: logDirectory });
  const instance = createUnifiedServer({ config, logger });
  let stopping = false;
  async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    logger.info(`[server] ${signal} received; shutting down`);
    try { await instance.stop(); process.exit(0); }
    catch (error) { logger.error("[server] shutdown failed", error); process.exit(1); }
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  instance.start().then((address) => {
    logger.info(`[server] started http://${config.host}:${address.port}`);
    logger.info(`[server] admin http://${config.host}:${address.port}/admin`);
    logger.info(`[server] websocket ws://${config.host}:${address.port}/events`);
  }).catch((error) => {
    if (error.code === "EADDRINUSE") logger.error(`[server] ${config.host}:${config.port} は使用中です。既存サーバーを終了してください。`);
    else logger.error("[server] startup failed", error);
    process.exitCode = 1;
  });
}

module.exports = { createUnifiedServer, validateBridgeEvent, validateMaterialState, loadConfig, createFileLogger };
