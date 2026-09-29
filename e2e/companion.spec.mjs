import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
// Actual popup code and injected page code, with only Chrome transport and WebMCP stubbed.
async function openCompanion(page) {
  await page.route('**/__companion/**', async route => {
    const file = new URL(route.request().url()).pathname.split('/').at(-1);
    if (!['popup.html', 'popup.js', 'lib.js', 'popup.css'].includes(file)) return route.abort();
    await route.fulfill({ body: await readFile(new URL(`../extension/${file}`, import.meta.url)), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' });
  });
  await page.addInitScript(() => {
    window.callCount = 0; window.changedHint = false; window.errorResult = false; window.navigated = false;
    const descriptors = () => [
      { name: 'read_state', description: 'Read state', annotations: { readOnlyHint: !window.changedHint }, inputSchema: { type: 'object' } },
      { name: 'update_state', description: 'Update state', annotations: { readOnlyHint: false }, inputSchema: { type: 'object' } },
    ];
    Object.defineProperty(document, 'modelContext', { value: {
      getTools: async () => descriptors(),
      executeTool: async (tool) => { window.callCount++; if (window.errorResult) return JSON.stringify({ isError: true }); if (tool.name === 'update_state') document.querySelector('#page-title').textContent = 'Updated state'; return '{"status":"ready"}'; },
    } });
    window.chrome = {
      tabs: { query: async () => [{ id: 1, url: location.href }], create: async ({ url }) => { window.exportedUrl = url; } },
      scripting: { executeScript: async ({ func, args }) => {
        const result = await func(...(args || []));
        if (!args && window.navigated) result.documentKey += ':new';
        return [{ result }];
      } },
    };
  });
  await page.goto('/__companion/popup.html');
  await expect(page.locator('#tool-count')).toHaveText('2');
}
async function exported(page) {
  await page.locator('#open-prism').click();
  const url = await page.evaluate(() => window.exportedUrl);
  return JSON.parse(Buffer.from(url.split('#prism-snapshot=')[1], 'base64url').toString());
}
test('companion requires fresh confirmation, executes once, and exports one coherent outcome', async ({ page }) => {
  await openCompanion(page);
  await page.locator('#run-tool').selectOption('update_state');
  await page.locator('#readback-tool').selectOption('read_state'); await page.locator('#expected-text').fill('ready');
  await page.locator('#run').click(); expect(await page.evaluate(() => window.callCount)).toBe(0);
  await page.locator('#tool-input').fill('{"value":1}'); await expect(page.locator('#mutation-confirm')).toBeHidden();
  await page.locator('#run').click(); await page.locator('#confirm-mutation').click();
  await expect(page.locator('#run-result')).toContainText('completed');
  expect(await page.evaluate(() => window.callCount)).toBe(2);
  const snapshot = await exported(page); const evidence = snapshot.tools.find(t => t.name === 'update_state').evidence;
  expect(evidence.visibleStateChanged).toBe(true); expect(evidence.readBackVerified).toBe(true); expect(evidence.humanConfirmationPreserved).toBeUndefined();
  expect(snapshot.executions[0].input).toBeUndefined();
  await page.evaluate(() => { window.navigated = true; }); await page.locator('#refresh').click();
  await expect(page.locator('#tool-count')).toHaveText('2'); expect((await exported(page)).executions).toHaveLength(0);
});
test('companion detects changed read annotation before calling and rejects error results', async ({ page }) => {
  await openCompanion(page); await page.evaluate(() => { window.changedHint = true; });
  await page.locator('#run').click(); await expect(page.locator('#run-result')).toContainText('no longer marked read-only');
  expect(await page.evaluate(() => window.callCount)).toBe(0);
  await page.evaluate(() => { window.changedHint = false; window.errorResult = true; });
  await page.locator('#run').click(); await expect(page.locator('#run-result')).toContainText('returned an error result');
  expect((await exported(page)).executions.at(-1).status).toBe('failed');
});
test('read evidence requires expected text and an actual matching result', async ({ page }) => {
  await openCompanion(page); await page.locator('#expected-text').fill('ready'); await page.locator('#run').click();
  await expect(page.locator('#run-result')).toContainText('Expected text matched');
  expect((await exported(page)).tools[0].evidence.readBackVerified).toBe(true);
});
