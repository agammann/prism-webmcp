import test from 'node:test';
import assert from 'node:assert/strict';

import { applyExecutionEvidence, buildSnapshot, normalizeTool, parseJsonObject } from '../lib.js';

test('normalizes a stringified schema and conservative write annotation', () => {
  const tool = normalizeTool({ name: 'update_record', description: 'Update a record.', inputSchema: '{"type":"object"}' });
  assert.equal(tool.inputSchema.type, 'object');
  assert.equal(tool.annotations.readOnlyHint, false);
});

test('requires JSON objects for tool input', () => {
  assert.deepEqual(parseJsonObject('{"id":"1"}'), { id: '1' });
  assert.throws(() => parseJsonObject('[]'), /must be a JSON object/u);
});

test('aggregates mutation and read-back evidence without claiming human approval', () => {
  const tools = [{ name: 'update_record', description: 'Update.', annotations: { readOnlyHint: false } }];
  const result = applyExecutionEvidence(tools, [{ tool: 'update_record', readOnly: false, status: 'passed', visibleStateChanged: true, readBackVerified: true }]);
  assert.deepEqual(result[0].evidence, { visibleStateChanged: true, readBackVerified: true, humanConfirmationPreserved: false });
});

test('builds a purpose-aware snapshot and strips output previews', () => {
  const snapshot = buildSnapshot({
    page: { supported: true, url: 'https://example.test/app' },
    tools: [{ name: 'read_state', description: 'Read.', annotations: { readOnlyHint: true } }],
    executions: [{ tool: 'read_state', readOnly: true, status: 'passed', outputPreview: 'private result' }],
    contract: { profile: 'custom', intent: 'Read state.', expectedTools: 'read_state', approvalRule: 'Writes need approval.' },
  });
  assert.equal(snapshot.profile, 'custom');
  assert.deepEqual(snapshot.contract.expectedTools, ['read_state']);
  assert.equal('outputPreview' in snapshot.executions[0], false);
});

