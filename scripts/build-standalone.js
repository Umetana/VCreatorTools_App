"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(projectRoot, "public", "V_CreatorTools");

const packages = Object.freeze({
  "gp-multi-counter": {
    directoryName: "VCreatorTools_GP_Multi_Counter",
    copies: [
      ["_vct_core/runtime/v1", "_vct_core/runtime/v1"],
      ["_vct_core/gp-counter/v2", "_vct_core/gp-counter/v2"],
      ["_vct_lib/ui/inline-color-picker", "_vct_lib/ui/inline-color-picker"],
      ["_vct_lib/ui/choice-dialog", "_vct_lib/ui/choice-dialog"],
      ["GP_multi_counter_v2", "GP_multi_counter_v2"],
    ],
  },
});

function buildStandalone(name, options = {}) {
  const definition = packages[name];
  if (!definition) throw new Error(`Unknown standalone package: ${name}`);
  const outputRoot = path.resolve(options.outputRoot || path.join(projectRoot, "dist", "standalone"));
  const destination = path.join(outputRoot, definition.directoryName);
  const relativeDestination = path.relative(outputRoot, destination);
  if (relativeDestination.startsWith("..") || path.isAbsolute(relativeDestination)) throw new Error("Invalid standalone output path");
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  for (const [sourceRelative, destinationRelative] of definition.copies) {
    const source = path.join(publicRoot, ...sourceRelative.split("/"));
    const target = path.join(destination, ...destinationRelative.split("/"));
    if (!fs.existsSync(source)) throw new Error(`Standalone source is missing: ${sourceRelative}`);
    fs.cpSync(source, target, { recursive: true, force: true });
  }
  const validation = validatePackage(destination);
  return { name, destination, ...validation };
}

function validatePackage(packageRoot) {
  const allFiles = walk(packageRoot);
  const htmlFiles = allFiles.filter((file) => file.toLowerCase().endsWith(".html"));
  const missing = [];
  const escaped = [];
  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, "utf8");
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
      const reference = match[1];
      if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(reference)) continue;
      let pathname;
      try { pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]); }
      catch { missing.push(`${path.relative(packageRoot, htmlFile)} -> ${reference}`); continue; }
      const resolved = path.resolve(path.dirname(htmlFile), pathname);
      const relative = path.relative(packageRoot, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) escaped.push(`${path.relative(packageRoot, htmlFile)} -> ${reference}`);
      else if (!fs.existsSync(resolved)) missing.push(`${path.relative(packageRoot, htmlFile)} -> ${reference}`);
    }
  }
  if (escaped.length || missing.length) {
    throw new Error([escaped.length ? `References outside package:\n${escaped.join("\n")}` : "", missing.length ? `Missing references:\n${missing.join("\n")}` : ""].filter(Boolean).join("\n"));
  }
  return { htmlFiles: htmlFiles.length, files: allFiles.length };
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

if (require.main === module) {
  try {
    const result = buildStandalone(process.argv[2] || "gp-multi-counter");
    console.log(`Built ${result.name}: ${result.destination}`);
    console.log(`Validated ${result.files} files / ${result.htmlFiles} HTML files`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { packages, buildStandalone, validatePackage };
