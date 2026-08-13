"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const express = require("express");
const { createUserAssetsService } = require("../server/user-assets-service");

const silentLogger = { error() {} };
const png = (...bytes) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...bytes]);

async function fixture(t, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vct-user-assets-"));
  const service = createUserAssetsService({ rootDirectory: root, logger: silentLogger, ...options });
  const app = express();
  service.mount(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { service, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("user asset service creates its image-performance directory and lists safe PNG files", async (t) => {
  const { service, baseUrl } = await fixture(t);
  assert.equal(fs.existsSync(service.imageDirectory), true);
  fs.writeFileSync(path.join(service.imageDirectory, "10.png"), png(1, 2, 3));
  fs.writeFileSync(path.join(service.imageDirectory, "02.png"), png(4, 5));
  fs.writeFileSync(path.join(service.imageDirectory, "ignore.jpg"), Buffer.from([6]));

  const response = await fetch(`${baseUrl}/api/user-assets/v1/screen-effect/image-performance`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.assets.map((item) => item.assetId), ["02.png", "10.png"]);
  assert.equal(body.assets[0].url, "/user-assets/screen-effect-v2/image-performance/02.png");
});

test("user asset delivery rejects missing, oversized, non-PNG and traversal paths", async (t) => {
  const { service, baseUrl } = await fixture(t, { maxBytes: 12 });
  fs.writeFileSync(path.join(service.imageDirectory, "ok.png"), png(1, 2, 3));
  fs.writeFileSync(path.join(service.imageDirectory, "large.png"), png(1, 2, 3, 4, 5));
  fs.writeFileSync(path.join(service.imageDirectory, "fake.png"), Buffer.from("not png"));
  fs.writeFileSync(path.join(service.imageDirectory, "plain.txt"), "x");

  const ok = await fetch(`${baseUrl}/user-assets/screen-effect-v2/image-performance/ok.png`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/png");
  assert.equal((await ok.arrayBuffer()).byteLength, 11);
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/image-performance/large.png`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/image-performance/plain.txt`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/image-performance/fake.png`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/image-performance/missing.png`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/image-performance/%2e%2e%2fsecret.png`)).status, 404);
});

test("money shower portraits use an isolated safe PNG collection", async (t) => {
  const { service, baseUrl } = await fixture(t);
  fs.writeFileSync(path.join(service.imageDirectory, "effect.png"), png(1));
  fs.writeFileSync(path.join(service.moneyShowerDirectory, "portrait.png"), png(2, 3));
  const response = await fetch(`${baseUrl}/api/user-assets/v1/screen-effect/money-shower`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.assets.map((item) => item.assetId), ["portrait.png"]);
  assert.equal(body.assets[0].url, "/user-assets/screen-effect-v2/money-shower/portrait.png");
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/money-shower/portrait.png`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/user-assets/screen-effect-v2/money-shower/effect.png`)).status, 404);
});
