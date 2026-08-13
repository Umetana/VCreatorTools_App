const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'dist', 'electron');
const { version } = require(path.join(projectRoot, 'package.json'));
const expected = [
  `VCreatorTools-Setup-${version}.exe`,
  `VCreatorTools-Portable-${version}.zip`,
  'jp.vcreatortools.streamdeck.streamDeckPlugin',
];

const missing = expected.filter((name) => !fs.existsSync(path.join(outputRoot, name)));
if (missing.length) {
  throw new Error(`Release artifact missing: ${missing.join(', ')}`);
}

const lines = expected.map((name) => {
  const data = fs.readFileSync(path.join(outputRoot, name));
  return `${crypto.createHash('sha256').update(data).digest('hex')}  ${name}`;
});
fs.writeFileSync(path.join(outputRoot, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${path.join(outputRoot, 'SHA256SUMS.txt')}`);
