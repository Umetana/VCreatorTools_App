"use strict";

const fs = require("node:fs");
const path = require("node:path");

const IMAGE_PERFORMANCE_KIND = "screen-effect-v2/image-performance";
const MONEY_SHOWER_KIND = "screen-effect-v2/money-shower";
const PNG_NAME = /^[^\x00-\x1f<>:"/\\|?*]+\.png$/i;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function hasPngSignature(file) {
  const descriptor = fs.openSync(file, "r");
  try {
    const header = Buffer.alloc(PNG_SIGNATURE.length);
    return fs.readSync(descriptor, header, 0, header.length, 0) === header.length && header.equals(PNG_SIGNATURE);
  } finally {
    fs.closeSync(descriptor);
  }
}

function createUserAssetsService(options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory || path.join(__dirname, "user_assets"));
  const imageDirectory = path.join(rootDirectory, "screen_effect_v2", "image_performance");
  const moneyShowerDirectory = path.join(rootDirectory, "screen_effect_v2", "money_shower");
  const maxBytes = Number(options.maxBytes || 20 * 1024 * 1024);
  const logger = options.logger || console;

  fs.mkdirSync(imageDirectory, { recursive: true });
  fs.mkdirSync(moneyShowerDirectory, { recursive: true });

  function listAssets(directory, urlBase) {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && PNG_NAME.test(entry.name))
      .map((entry) => {
        const file = path.join(directory, entry.name);
        const stat = fs.statSync(file);
        if (stat.size <= PNG_SIGNATURE.length || stat.size > maxBytes || !hasPngSignature(file)) return null;
        return {
          assetId: entry.name,
          label: path.basename(entry.name, path.extname(entry.name)),
          bytes: stat.size,
          url: `${urlBase}/${encodeURIComponent(entry.name)}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, "ja", { numeric: true, sensitivity: "base" }));
  }

  function listImagePerformanceAssets() { return listAssets(imageDirectory, "/user-assets/screen-effect-v2/image-performance"); }
  function listMoneyShowerAssets() { return listAssets(moneyShowerDirectory, "/user-assets/screen-effect-v2/money-shower"); }

  function resolveImageFrom(directory, name) {
    if (typeof name !== "string" || !PNG_NAME.test(name) || path.basename(name) !== name) return null;
    const file = path.join(directory, name);
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size <= PNG_SIGNATURE.length || stat.size > maxBytes || !hasPngSignature(file)) return null;
      return file;
    } catch {
      return null;
    }
  }
  function resolveImage(name) { return resolveImageFrom(imageDirectory, name); }
  function resolveMoneyShowerImage(name) { return resolveImageFrom(moneyShowerDirectory, name); }

  function mount(app) {
    app.get("/api/user-assets/v1/screen-effect/image-performance", (_req, res) => {
      try {
        return res.json({ ok: true, kind: IMAGE_PERFORMANCE_KIND, assets: listImagePerformanceAssets() });
      } catch (error) {
        logger.error?.("[user-assets] failed to list image-performance assets", error);
        return res.status(500).json({ ok: false, error: "user_assets_list_failed" });
      }
    });
    app.get("/user-assets/screen-effect-v2/image-performance/:name", (req, res) => {
      const file = resolveImage(req.params.name);
      if (!file) return res.status(404).json({ ok: false, error: "user_asset_not_found" });
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.type("png").sendFile(file);
    });
    app.get("/api/user-assets/v1/screen-effect/money-shower", (_req, res) => {
      try {
        return res.json({ ok: true, kind: MONEY_SHOWER_KIND, assets: listMoneyShowerAssets() });
      } catch (error) {
        logger.error?.("[user-assets] failed to list money-shower assets", error);
        return res.status(500).json({ ok: false, error: "user_assets_list_failed" });
      }
    });
    app.get("/user-assets/screen-effect-v2/money-shower/:name", (req, res) => {
      const file = resolveMoneyShowerImage(req.params.name);
      if (!file) return res.status(404).json({ ok: false, error: "user_asset_not_found" });
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.type("png").sendFile(file);
    });
  }

  return { rootDirectory, imageDirectory, moneyShowerDirectory, maxBytes, mount, listImagePerformanceAssets, listMoneyShowerAssets, resolveImage, resolveMoneyShowerImage };
}

module.exports = { createUserAssetsService, IMAGE_PERFORMANCE_KIND, MONEY_SHOWER_KIND };
