"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { localDateKey, localTimestamp } = require("../server/log-time");
const { createFileLogger } = require("../server/server");

test("local log timestamp includes the local UTC offset", () => {
  const date = new Date(2026, 7, 16, 7, 9, 54, 218);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, "0")}:${String(absoluteOffset % 60).padStart(2, "0")}`;
  assert.equal(localDateKey(date), "2026-08-16");
  assert.equal(localTimestamp(date), `2026-08-16T07:09:54.218${offset}`);
});

test("file logger uses the same local date for its filename and line", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vct-log-time-"));
  const date = new Date(2026, 7, 16, 7, 9, 54, 218);
  const originalLog = console.log;
  console.log = () => {};
  try {
    const logger = createFileLogger({ directory, now: () => date });
    logger.info("[server] started");
    const file = path.join(directory, "server-2026-08-16.log");
    assert.equal(fs.existsSync(file), true);
    assert.match(fs.readFileSync(file, "utf8"), /^2026-08-16T07:09:54\.218[+-]\d{2}:\d{2} INFO \[server\] started\r?\n$/);
  } finally {
    console.log = originalLog;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
