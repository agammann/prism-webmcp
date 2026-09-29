import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { zipSync, unzipSync } from 'fflate';
const files = ['LICENSE', 'PRIVACY.md', 'README.md', 'lib.js', 'manifest.json', 'popup.css', 'popup.html', 'popup.js'];
const content = {};
for (const name of files) content[name] = new Uint8Array(await readFile(new URL(`../extension/${name}`, import.meta.url)));
const destination = new URL('../public/prism-webmcp-companion.zip', import.meta.url);
if (process.argv.includes('--check')) {
  const archived = unzipSync(await readFile(destination));
  assert.deepEqual(Object.keys(archived).sort(), [...files].sort());
  for (const name of files) assert.deepEqual(archived[name], content[name], `${name} differs from packaged source`);
  console.log('Companion ZIP matches all eight source files.');
} else {
  await writeFile(destination, zipSync(content, { level: 9, mtime: new Date('2026-01-01T00:00:00Z') }));
  console.log('Packaged companion from current source.');
}
