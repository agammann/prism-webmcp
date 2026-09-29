import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExecutionEvidence, buildSnapshot, normalizeTool, parseJsonObject } from '../lib.js';
const tools = [{ name: 'update_record', description: 'Update.', annotations: { readOnlyHint: false } }];
test('preserves unknown annotation', () => assert.equal(normalizeTool({ name: 'x', inputSchema: '{"type":"object"}' }).annotations.readOnlyHint, undefined));
test('requires JSON objects', () => { assert.deepEqual(parseJsonObject('{"id":"1"}'), { id: '1' }); assert.throws(() => parseJsonObject('[]')); });
test('never combines separate partial runs', () => {
  const result = applyExecutionEvidence(tools, [
    { tool: 'update_record', readOnly: false, status: 'passed', visibleStateChanged: true, readBackVerified: false },
    { tool: 'update_record', readOnly: false, status: 'passed', visibleStateChanged: false, readBackVerified: true },
  ]);
  assert.deepEqual(result[0].evidence, { visibleStateChanged: false, readBackVerified: true });
});
test('latest failed run supersedes previous success', () => {
  const result = applyExecutionEvidence(tools, [
    { tool: 'update_record', readOnly: false, status: 'passed', visibleStateChanged: true, readBackVerified: true },
    { tool: 'update_record', status: 'failed' },
  ]);
  assert.deepEqual(result[0].evidence, { visibleStateChanged: false, readBackVerified: false });
});
test('successful call alone does not verify read outcome or approval', () => {
  const result = applyExecutionEvidence(tools, [{ tool: 'update_record', readOnly: true, status: 'passed' }]);
  assert.equal(result[0].evidence.readBackVerified, false);
  assert.equal(result[0].evidence.humanConfirmationPreserved, undefined);
});
test('exports a whitelist without input, output, error, query or fragment data', () => {
  const snapshot = buildSnapshot({ page: { supported: true, url: 'https://example.test/app?token=secret#private' }, tools,
    executions: [{ tool: 'update_record', readOnly: false, status: 'failed', input: { secret: 1 }, error: 'secret', outputPreview: 'secret', readBackExpectedText: 'secret' }],
    contract: { profile: 'custom', intent: 'Update', expectedTools: 'update_record', approvalRule: 'Review' } });
  assert.equal(snapshot.target, 'https://example.test/app');
  assert.equal(JSON.stringify(snapshot).includes('secret'), false);
  assert.deepEqual(snapshot.contract.expectedTools, ['update_record']);
});
