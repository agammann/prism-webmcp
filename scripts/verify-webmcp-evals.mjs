import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../components/webmcp-provider.tsx', import.meta.url), 'utf8');
const fixtures = JSON.parse(await readFile(new URL('../evals/webmcp-routing.json', import.meta.url), 'utf8'));
const registeredTools = new Set([...source.matchAll(/name:\s*'([a-z][a-z0-9_]*)'/gu)].map((match) => match[1]));
const ids = new Set();

assert.equal(fixtures.schemaVersion, 1);
assert.ok(Array.isArray(fixtures.cases) && fixtures.cases.length >= 4, 'Expected at least four routing cases.');

for (const fixture of fixtures.cases) {
  assert.ok(!ids.has(fixture.id), `Duplicate routing case: ${fixture.id}`);
  ids.add(fixture.id);
  assert.ok(registeredTools.has(fixture.expectedTool), `${fixture.id} references an unregistered tool.`);
  assert.equal(typeof fixture.prompt, 'string');
  assert.ok(fixture.prompt.length >= 20, `${fixture.id} needs a meaningful natural-language prompt.`);
  assert.ok(fixture.expectedArguments && !Array.isArray(fixture.expectedArguments), `${fixture.id} arguments must be an object.`);
  assert.ok(fixture.expectedMode === 'read' || fixture.expectedMode === 'write');
}

const unsupported = fixtures.cases.find((fixture) => fixture.id === 'reject-unsupported-profile');
assert.equal(unsupported?.expectedArguments.profile, 'banking');
assert.match(source, /profile must be commerce, operations, editor, or custom\./u);

console.log(`Verified ${fixtures.cases.length} WebMCP intent-to-tool fixtures against ${registeredTools.size} registered tools.`);
