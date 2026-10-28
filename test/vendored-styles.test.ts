import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

void test('shadcn styles retain upstream bytes and license without installing its CLI', () => {
  const css = readFileSync(new URL('../vendor/shadcn-styles/tailwind.css', import.meta.url));
  assert.equal(createHash('sha256').update(css).digest('hex'), 'bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a');
  const license = readFileSync(new URL('../vendor/shadcn-styles/LICENSE.md', import.meta.url), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2023 shadcn/);
  const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.ok(globals.includes("@import '../vendor/shadcn-styles/tailwind.css';"));
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.dependencies?.shadcn, undefined);
  assert.equal(manifest.devDependencies?.shadcn, undefined);
});
