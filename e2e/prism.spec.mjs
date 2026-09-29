import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const snapshot = {
  schemaVersion: 1, target: 'https://workspace.example/task', profile: 'operations',
  contract: { intent: 'Read a shipment', expectedTools: ['get_shipment'], approvalRule: 'A person approves dispatch' },
  runtime: { webmcpAvailable: true, topLevelPage: true, lifecycleCleanup: null },
  tools: [{ name: 'get_shipment', description: 'Read shipment', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, evidence: { readBackVerified: true } }],
};
async function mockWebMCP(page, fail = false) {
  await page.addInitScript(({ fail }) => {
    window.prismTools = new Map(); window.registrationCount = 0;
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool, options) => {
      if (fail) throw new Error('Registration unavailable');
      window.registrationCount++; window.prismTools.set(tool.name, tool);
      options.signal.addEventListener('abort', () => { if (window.prismTools.get(tool.name) === tool) window.prismTools.delete(tool.name); });
    } } });
  }, { fail });
}
const call = (page, name, input = {}) => page.evaluate(async ({ name, input }) => window.prismTools.get(name).execute(input), { name, input });
async function importFile(page) {
  await expect(page.getByText('Checking browser support…', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Runner snapshot', exact: true }).click();
  await page.getByLabel('Import snapshot file').setInputFiles({ name: 'snapshot.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
}
test('import preserves custom contract and changing profile keeps JSON and marks report stale', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await mockWebMCP(page); await page.goto('/'); await importFile(page);
  await expect(page.locator('#custom-intent')).toHaveValue('Read a shipment');
  await expect(page.getByTestId('report-context')).toContainText('https://workspace.example/task');
  const original = await page.getByLabel('Runner snapshot JSON').inputValue();
  await page.locator('#profile').selectOption('editor');
  await expect(page.getByLabel('Runner snapshot JSON')).toHaveValue(original);
  await expect(page.getByText('Setup changed. Run evaluation to refresh this report.')).toBeVisible();
  expect((await call(page, 'get_latest_evaluation')).stale).toBe(true);
  await page.getByRole('button', { name: 'Evaluate runner snapshot', exact: true }).click();
  await expect(page.getByTestId('report-context')).toContainText('Find content, propose edits');
  expect((await call(page, 'get_latest_evaluation')).source).toBe('snapshot');
  expect(errors).toEqual([]);
});
test('agent reads real custom fields and evaluates actual snapshot without re-registering', async ({ page }) => {
  await mockWebMCP(page); await page.goto('/'); await importFile(page);
  const registrations = await page.evaluate(() => window.registrationCount);
  expect((await call(page, 'get_evaluation_context')).expectedCapabilities).toEqual(['get_shipment']);
  await page.locator('#custom-tools').fill('get_shipment, dispatch');
  const result = await call(page, 'evaluate_current_snapshot');
  expect(result.journey.find(row => row.job === 'dispatch').state).toBe('fail');
  expect(result.source).toBe('snapshot'); expect(result.stale).toBe(false);
  expect((await call(page, 'get_latest_evaluation')).score).toBe(result.score);
  expect(await page.evaluate(() => window.registrationCount)).toBe(registrations);
  await expect(page.getByText('1 expected capabilities missing')).toBeVisible();
  await expect(call(page, 'choose_evaluation_profile', { profile: 'editor', extra: true })).rejects.toThrow('Only profile');
  const sample = await call(page, 'run_sample_evaluation', { profile: 'custom' });
  expect(sample.source).toBe('sample'); expect(sample.contract.intent).toBe('Read a shipment');
  await expect(page.getByText('Example evaluation · synthetic evidence')).toBeVisible();
});
test('invalid JSON types never overwrite a previous report; export records stale provenance', async ({ page }) => {
  await page.goto('/'); await importFile(page);
  await page.getByLabel('Runner snapshot JSON').fill('{"tools":[],"contract":{"intent":2}}');
  await page.getByRole('button', { name: 'Evaluate runner snapshot', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('must be a string');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download report JSON' }).click();
  const download = await downloadPromise; const report = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(report.stale).toBe(true); expect(report.target).toBe(snapshot.target); expect(report.contract.intent).toBe(snapshot.contract.intent);
  await page.getByRole('button', { name: 'New evaluation' }).click();
  await expect(page.getByText('Example evaluation · synthetic evidence')).toBeVisible();
  await expect(page.getByText('Setup changed. Run evaluation to refresh this report.')).toHaveCount(0);
});
test('fragment import preserves contract and removes the fragment even when malformed', async ({ page }) => {
  await page.goto('/#prism-snapshot=' + Buffer.from(JSON.stringify(snapshot)).toString('base64url'));
  await expect(page.locator('#custom-tools')).toHaveValue('get_shipment'); expect(new URL(page.url()).hash).toBe('#report');
  await page.goto('/#prism-snapshot=invalid'); await page.reload();
  await expect(page.getByRole('alert')).toContainText('Companion import failed'); expect(new URL(page.url()).hash).toBe('#report');
});
test('registration failure keeps manual evaluation working', async ({ page }) => {
  await mockWebMCP(page, true); await page.goto('/');
  await expect(page.getByText('WebMCP registration failed.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Run purpose-aware example' }).click();
  await expect(page.getByText('Example evaluation · synthetic evidence')).toBeVisible();
});
test('desktop and mobile have no horizontal overflow and retain usable report controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText('Checking browser support…', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/prism-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await importFile(page); await expect(page.getByRole('button', { name: 'Download report JSON' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/prism-mobile.png', fullPage: true });
});
