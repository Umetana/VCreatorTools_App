"use strict";

const fs = require("node:fs");
const path = require("node:path");

function resolveDataLocation(options) {
  const env = options.env || {};
  const explicitPortableRoot = typeof env.VCT_PORTABLE_ROOT === "string" && env.VCT_PORTABLE_ROOT.trim()
    ? path.resolve(env.VCT_PORTABLE_ROOT.trim())
    : null;
  const packagedPortableRoot = typeof env.PORTABLE_EXECUTABLE_DIR === "string" && env.PORTABLE_EXECUTABLE_DIR.trim()
    ? path.resolve(env.PORTABLE_EXECUTABLE_DIR.trim())
    : null;
  const applicationDirectory = options.isPackaged
    ? path.dirname(path.resolve(options.executablePath))
    : path.resolve(options.appPath);
  const portableRoot = explicitPortableRoot || packagedPortableRoot || applicationDirectory;
  const markerFile = path.join(portableRoot, "portable.json");
  const portable = Boolean(explicitPortableRoot || packagedPortableRoot || fs.existsSync(markerFile));
  return Object.freeze({
    mode: portable ? "portable" : "installed",
    root: portable ? portableRoot : path.resolve(options.userDataPath),
    markerFile,
  });
}

module.exports = { resolveDataLocation };
