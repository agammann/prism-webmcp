import { test, expect, type Page } from '@playwright/test';
type NativeTool = { name: string; title: string; inputSchema: string | Record<string, unknown>; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean } };
type NativeContext = { registerTool: unknown; getTools(): Promise<NativeTool[]>; executeTool(tool: NativeTool, input: string | Record<string, unknown>): Promise<unknown> };
type ToolResult = { nativeError?: string; profile: string; expectedCapabilities: string[]; source: string; stale: boolean; score: number; contract: { intent: string }; journey: { job: string; state: string }[] };
const names = ['choose_evaluation_profile', 'evaluate_current_snapshot', 'get_evaluation_context', 'get_latest_evaluation', 'run_sample_evaluation'];
export const snapshot = {
  schemaVersion: 1, target: 'https://workspace.example/task', profile: 'custom',
  contract: { intent: 'Read a shipment', expectedTools: ['get_shipment'], approvalRule: 'A person approves dispatch' },
  runtime: { webmcpAvailable: true, topLevelPage: true, lifecycleCleanup: null },
  tools: [{ name: 'get_shipment', description: 'Read shipment', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, evidence: { readBackVerified: true } }],
};
async function toolNames(page: Page) {
  return page.evaluate(async () => (await (document.modelContext as unknown as NativeContext).getTools()).map(tool => tool.name).sort());
}
async function ready(page: Page) {
  await expect.poll(() => toolNames(page)).toEqual(names);
  await expect(page.getByText('WebMCP ready: five tools connected to the visible evaluation.', { exact: true })).toBeVisible();
}
async function call(page: Page, name: string, input: Record<string, unknown> = {}) {
  return page.evaluate(async ({ name, input }) => {
    const context = document.modelContext as unknown as NativeContext;
    const tool = (await context.getTools()).find(tool => tool.name === name)!;
    const major = Number(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
    try {
      const result = await context.executeTool(tool, major < 155 ? JSON.stringify(input) : input);
      return typeof result === 'string' ? JSON.parse(result) : result;
    } catch (error) { return { nativeError: (error as Error).message }; }
  }, { name, input }) as Promise<ToolResult>;
}
test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page); });
test('native discovery exposes five titled contracts and reads the visible report', async ({ page, browser }) => {
  console.log(`Native WebMCP browser: ${browser.version()}`);
  expect(await page.evaluate(() => document.modelContext?.registerTool.toString())).toContain('[native code]');
  const tools = await page.evaluate(async () => (document.modelContext as unknown as NativeContext).getTools());
  for (const tool of tools) {
    expect(tool.title.trim()).not.toBe('');
    const schema = typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema;
    expect(schema.additionalProperties).toBe(false);
    expect(tool.annotations.readOnlyHint).toBe(tool.name.startsWith('get_'));
    expect(tool.annotations.untrustedContentHint).toBe(true);
  }
  expect((await call(page, 'get_evaluation_context')).profile).toBe('commerce');
  expect((await call(page, 'get_latest_evaluation')).source).toBe('sample');
});
test('all five native tools preserve imported JSON and stale provenance across human and agent changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Runner snapshot', exact: true }).click();
  await page.getByLabel('Import snapshot file').setInputFiles({ name: 'snapshot.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
  const original = await page.getByLabel('Runner snapshot JSON').inputValue();
  expect((await call(page, 'get_evaluation_context')).expectedCapabilities).toEqual(['get_shipment']);
  await call(page, 'choose_evaluation_profile', { profile: 'editor' });
  await expect(page.locator('#profile')).toHaveValue('editor');
  await expect(page.getByLabel('Runner snapshot JSON')).toHaveValue(original);
  expect((await call(page, 'get_latest_evaluation')).stale).toBe(true);
  await call(page, 'choose_evaluation_profile', { profile: 'custom' });
  await page.locator('#custom-tools').fill('get_shipment, dispatch');
  const result = await call(page, 'evaluate_current_snapshot');
  expect(result.journey.find(row => row.job === 'dispatch')!.state).toBe('fail');
  expect(result.stale).toBe(false);
  await expect(page.getByText('1 expected capabilities missing')).toBeVisible();
  expect((await call(page, 'get_latest_evaluation')).score).toBe(result.score);
  const sample = await call(page, 'run_sample_evaluation', { profile: 'custom' });
  expect(sample.contract.intent).toBe('Read a shipment');
  expect(sample.source).toBe('sample');
  await expect(page.getByText('Example evaluation · synthetic evidence')).toBeVisible();
  await ready(page);
});
test('invalid inputs and malformed snapshots cannot replace the previous report', async ({ page }) => {
  const before = await call(page, 'get_latest_evaluation');
  for (const [name, input] of [['choose_evaluation_profile', { profile: 'bogus' }], ['run_sample_evaluation', { profile: 'editor', extra: true }], ['get_latest_evaluation', { extra: true }], ['evaluate_current_snapshot', {}]] as const) {
    expect((await call(page, name, input)).nativeError).toBeTruthy();
  }
  expect(await call(page, 'get_latest_evaluation')).toEqual(before);
  await page.getByRole('button', { name: 'Runner snapshot', exact: true }).click();
  await page.getByLabel('Runner snapshot JSON').fill('{"tools":[],"contract":{"intent":2}}');
  expect((await call(page, 'evaluate_current_snapshot')).nativeError).toBeTruthy();
  const after = await call(page, 'get_latest_evaluation');
  expect(after.score).toBe(before.score); expect(after.stale).toBe(true);
});
test('native tools withdraw on pagehide and restore the current evaluation from the back-forward cache', async ({ page }) => {
  await call(page, 'choose_evaluation_profile', { profile: 'operations' });
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  expect(await toolNames(page)).toEqual([]);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await ready(page);
  await page.evaluate(() => { window.addEventListener('pageshow', event => { (window as unknown as { prismRestored: boolean }).prismRestored = event.persisted; }); });
  await page.goto('/favicon.svg');
  await page.goBack({ waitUntil: 'commit' });
  await ready(page);
  expect((await call(page, 'get_evaluation_context')).profile).toBe('operations');
  if (!process.env.PRISM_WEBMCP_URL) expect(await page.evaluate(() => (window as unknown as { prismRestored: boolean }).prismRestored)).toBe(true);
});
