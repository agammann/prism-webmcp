import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSnapshot, getSampleSnapshot, makeCustomProfile, parseSnapshot, profiles } from '../lib/evaluator';

void test('empty snapshot receives no free outcome points', () => {
  const report = evaluateSnapshot(profiles.commerce, { tools: [] });
  assert.equal(report.score, 0);
  assert.equal(report.label, 'Incomplete');
});
void test('unknown annotation is neither read nor write nor proven', () => {
  const report = evaluateSnapshot(makeCustomProfile('read', 'read_state', 'Person confirms changes'), { tools: [{ name: 'read_state', description: 'Read', evidence: { readBackVerified: true } }] });
  assert.equal(report.readTools, 0); assert.equal(report.writeTools, 0); assert.equal(report.unknownTools, 1);
  assert.equal(report.journey[0].state, 'warn');
});
void test('missing runtime observations receive no credit', () => {
  const report = evaluateSnapshot(profiles.editor, { ...getSampleSnapshot('editor'), runtime: { webmcpAvailable: true } });
  assert.equal(report.dimensions.find(d => d.name === 'Runtime evidence')?.score, 33);
  assert.equal(report.label, 'Needs proof');
});
void test('read name without an assertion is not proof', () => {
  const sample = getSampleSnapshot('editor'); delete sample.tools[0].evidence;
  assert.equal(evaluateSnapshot(profiles.editor, sample).journey[0].state, 'warn');
});
void test('broken approval boundary prevents Strong even with otherwise full evidence', () => {
  const sample = getSampleSnapshot('editor'); sample.tools[0].evidence = { readBackVerified: true, humanConfirmationPreserved: false };
  const report = evaluateSnapshot(profiles.editor, sample);
  assert.equal(report.label, 'Incomplete'); assert.ok(report.findings.some(f => f.title === 'Approval boundary reported broken'));
});
void test('missing approval is explicitly unverified', () => {
  const sample = getSampleSnapshot('editor'); for (const tool of sample.tools) delete tool.evidence?.humanConfirmationPreserved;
  assert.equal(evaluateSnapshot(profiles.editor, sample).label, 'Needs proof');
});
void test('custom contract keeps supplied names and empty draft stays empty', () => {
  assert.deepEqual(makeCustomProfile('My task', 'read_x, read_x, write_x', 'Review').capabilities.map(c => c.candidates[0]), ['read_x', 'write_x']);
  assert.equal(makeCustomProfile('', '', '').capabilities.length, 0);
});
void test('sample objects are isolated across callers', () => {
  const sample = getSampleSnapshot('editor'); sample.tools.length = 0;
  assert.equal(getSampleSnapshot('editor').tools.length, 4);
});
for (const [label, value] of Object.entries({
  'false string': { tools: [{ name: 'a', description: '', evidence: { readBackVerified: 'false' } }] },
  'runtime number': { tools: [], runtime: { webmcpAvailable: 1 } },
  'contract number': { tools: [], contract: { intent: 3 } },
  'expected name object': { tools: [], contract: { expectedTools: [{}] } },
  'ambiguous names': { tools: [{ name: 'get-state', description: '' }, { name: 'get_state', description: '' }] },
  'future version': { schemaVersion: 2, tools: [] },
  'array root': [],
  'array schema': { tools: [{ name: 'a', description: '', inputSchema: [] }] },
})) void test(`rejects malformed snapshot: ${label}`, () => assert.throws(() => parseSnapshot(JSON.stringify(value))));
void test('accepts unknown runtime fields and nullable observations without inventing evidence', () => {
  const snapshot = parseSnapshot(JSON.stringify({ tools: [], runtime: { lifecycleCleanup: null, futureField: 'value' } }));
  assert.equal(evaluateSnapshot(profiles.commerce, snapshot).score, 0);
});
void test('rejects oversized snapshots', () => assert.throws(() => parseSnapshot(' '.repeat(1_000_001)), /limit/));
