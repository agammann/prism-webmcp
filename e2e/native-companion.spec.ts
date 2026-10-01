import { test, expect, chromium, type BrowserContext, type Page, type CDPSession } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
type FixtureWindow = Window & { calls: number; registration: AbortController };
type NativeContext = { getTools(): Promise<{ inputSchema: string | Record<string, unknown> }[]> };
const fixture = `<!doctype html><html><head><title>Companion native fixture</title></head><body><main><p id="value">Value: ready</p></main><script>
window.calls = 0;
const schema = { type: 'object', properties: { value: { type: 'string' } }, additionalProperties: false };
window.registerFixture = async (unknown = false) => {
  window.registration?.abort(); window.registration = new AbortController();
  for (const tool of [
    { name: 'read_state', title: 'Read state', description: 'Read the visible value', inputSchema: schema, annotations: { readOnlyHint: true }, execute: () => { window.calls++; return { value: document.querySelector('#value').textContent }; } },
    { name: 'update_state', title: 'Update state', description: 'Update the visible value', inputSchema: schema, annotations: unknown ? {} : { readOnlyHint: false }, execute: input => { window.calls++; if (input.value === 'error') return { isError: true }; document.querySelector('#value').textContent = 'Value: ' + input.value; return { saved: true }; } },
  ]) await document.modelContext.registerTool(tool, { signal: window.registration.signal });
}; window.registerFixture();
</script></body></html>`;
type Session = { context: BrowserContext; target: Page; popup: Page; cdp: CDPSession; id: string; close(): Promise<void> };
async function open(baseURL: string, fixturePage = false, grant = true, enableNative = true): Promise<Session> {
  const context = await chromium.launchPersistentContext('', {
    executablePath: process.env.PRISM_COMPANION_BROWSER || chromium.executablePath(), headless: true,
    args: [enableNative ? '--enable-features=WebMCP' : '--disable-features=WebMCP', '--enable-unsafe-extension-debugging'], ignoreDefaultArgs: ['--disable-extensions'],
  });
  try {
    const cdp = await context.browser()!.newBrowserCDPSession();
    const { id } = await cdp.send('Extensions.loadUnpacked', { path: resolve('extension') });
    const target = await context.newPage();
    if (fixturePage) await target.route('**/__native-companion-fixture*', route => route.fulfill({ body: fixture, contentType: 'text/html' }));
    await target.goto(baseURL + (fixturePage ? '/__native-companion-fixture?private-query=omitted#private-fragment' : '/'));
    if (enableNative) {
      await target.waitForFunction(async () => typeof document.modelContext?.registerTool === 'function' && (await (document.modelContext as unknown as NativeContext).getTools()).length === (document.title === 'Companion native fixture' ? 2 : 5));
      expect(await target.evaluate(() => document.modelContext?.registerTool.toString())).toContain('[native code]');
    } else await expect(target.getByText('Manual mode:', { exact: false })).toBeVisible();
    const popup = await context.newPage();
    await target.bringToFront();
    if (grant) {
      const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
      const extensionCommands = cdp as unknown as { send(method: 'Extensions.triggerAction', input: { id: string; targetId: string }): Promise<void> };
      await extensionCommands.send('Extensions.triggerAction', { id, targetId: targetInfos.find((tab: { url: string }) => tab.url === target.url())!.targetId });
    }
    // Playwright 1.58 does not expose Chrome's type=other toolbar popup.
    // Render the same packaged popup document in a background tab after the real action grant.
    await popup.goto(`chrome-extension://${id}/popup.html`);
    if (grant) await expect(popup.locator('#tool-count')).toHaveText(!enableNative ? '0' : fixturePage ? '2' : '5');
    return { context, target, popup, cdp, id, close: () => context.close() };
  } catch (error) { await context.close(); throw error; }
}
async function download(popup: Page) {
  const pending = popup.waitForEvent('download'); await popup.locator('#download').click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function runRead(popup: Page, expected: string) {
  await popup.locator('#run-tool').selectOption('read_state');
  await popup.locator('#expected-text').fill(expected); await popup.locator('#run').click();
  await expect(popup.locator('#run-result')).toContainText('completed');
}
test('loaded companion discovers native Prism, confirms one write, reads it back, and imports its export', async ({ baseURL }) => {
  const session = await open(baseURL!); const { popup, target } = session;
  try {
    console.log(`Loaded companion browser: ${session.context.browser()!.version()}`);
    await popup.locator('#run-tool').selectOption('get_evaluation_context');
    await popup.locator('#expected-text').fill('commerce'); await popup.locator('#run').click();
    await expect(popup.locator('#run-result')).toContainText('Expected text matched');
    await popup.locator('#run-tool').selectOption('choose_evaluation_profile');
    await popup.locator('#tool-input').fill('{"profile":"editor"}');
    await popup.locator('#readback-tool').selectOption('get_evaluation_context');
    await popup.locator('#expected-text').fill('operations');
    await popup.locator('#run').click(); await expect(target.locator('#profile')).toHaveValue('commerce');
    await popup.locator('#tool-input').fill('{"profile":"operations"}');
    await expect(popup.locator('#mutation-confirm')).toBeHidden();
    await popup.locator('#run').click(); await popup.locator('#confirm-mutation').click();
    await expect(popup.locator('#run-result')).toContainText('Read-back matched');
    await expect(target.locator('#profile')).toHaveValue('operations');
    const snapshot = await download(popup);
    expect(snapshot.executions.filter((row: { tool: string }) => row.tool === 'choose_evaluation_profile')).toHaveLength(1);
    const evidence = snapshot.tools.find((tool: { name: string }) => tool.name === 'choose_evaluation_profile').evidence;
    expect(evidence).toEqual({ visibleStateChanged: true, readBackVerified: true });
    expect(snapshot.executions[0].input).toBeUndefined(); expect(snapshot.executions[0].output).toBeUndefined();
    await target.getByRole('button', { name: 'Runner snapshot', exact: true }).click();
    await target.getByLabel('Import snapshot file').setInputFiles({ name: 'companion.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
    await expect(target.getByTestId('report-context')).toContainText(baseURL!);
    await expect(target.getByText('Imported 5 tools.', { exact: false })).toBeVisible();
    const handoff = session.context.waitForEvent('page'); await popup.locator('#open-prism').click();
    const opened = await handoff; await opened.waitForURL(/prism-snapshot=|#report/u);
    await opened.waitForLoadState();
    await expect(opened.getByText('Imported 5 tools.', { exact: false })).toBeVisible();
    expect(new URL(opened.url()).hash).toBe('#report');
  } finally { await session.close(); }
});
test('native read assertions, mutation read-back, error outcomes and sanitized exports stay coherent', async ({ baseURL }) => {
  const session = await open(baseURL!, true); const { popup, target } = session;
  try {
    await runRead(popup, 'ready');
    expect((await download(popup)).tools.find((tool: { name: string }) => tool.name === 'read_state').evidence.readBackVerified).toBe(true);
    await popup.locator('#run-tool').selectOption('update_state');
    await popup.locator('#tool-input').fill('{"value":"saved"}');
    await popup.locator('#readback-tool').selectOption('read_state'); await popup.locator('#expected-text').fill('saved');
    await popup.locator('#run').click(); await popup.locator('#cancel-mutation').click();
    expect(await target.evaluate(() => (window as unknown as FixtureWindow).calls)).toBe(1);
    await popup.locator('#run').click(); await popup.locator('#confirm-mutation').click();
    await expect(popup.locator('#run-result')).toContainText('Read-back matched');
    expect(await target.evaluate(() => (window as unknown as FixtureWindow).calls)).toBe(3);
    await expect(target.locator('#value')).toHaveText('Value: saved');
    const passed = await download(popup);
    expect(passed.tools.find((tool: { name: string }) => tool.name === 'update_state').evidence).toEqual({ visibleStateChanged: true, readBackVerified: true });
    expect(passed.target).toBe(baseURL + '/__native-companion-fixture');
    for (const execution of passed.executions) for (const key of ['input', 'output', 'outputPreview', 'error', 'readBackExpectedText']) expect(execution[key]).toBeUndefined();
    await popup.locator('#run-tool').selectOption('update_state');
    await popup.locator('#tool-input').fill('{"value":"error"}');
    await popup.locator('#run').click(); await popup.locator('#confirm-mutation').click();
    await expect(popup.locator('#run-result')).toContainText('tool returned an error');
    const failed = await download(popup);
    expect(failed.executions.at(-1).status).toBe('failed');
    expect(failed.tools.find((tool: { name: string }) => tool.name === 'update_state').evidence).toEqual({ visibleStateChanged: false, readBackVerified: false });
    expect(await target.evaluate(() => (window as unknown as FixtureWindow).calls)).toBe(4);
  } finally { await session.close(); }
});
test('unknown annotations require review and a reclassified read is blocked before execution', async ({ baseURL }) => {
  const session = await open(baseURL!, true); const { popup, target } = session;
  try {
    await popup.locator('#run-tool').selectOption('read_state');
    await target.evaluate(async () => {
      const tools = await (document.modelContext as unknown as NativeContext).getTools();
      (window as unknown as FixtureWindow).registration.abort();
      const schema = typeof tools[0].inputSchema === 'string' ? JSON.parse(tools[0].inputSchema) : tools[0].inputSchema;
      await document.modelContext!.registerTool({ name: 'read_state', title: 'Unknown access', description: 'Unknown access', inputSchema: schema, execute: () => { (window as unknown as FixtureWindow).calls++; return {}; } });
    });
    await popup.locator('#run').click(); await expect(popup.locator('#run-result')).toContainText('no longer marked read-only');
    expect(await target.evaluate(() => (window as unknown as FixtureWindow).calls)).toBe(0);
    await popup.locator('#refresh').click(); await expect(popup.locator('#run')).toHaveText('Review mutation');
    await popup.locator('#run').click(); await expect(popup.locator('#mutation-confirm')).toBeVisible();
    expect(await target.evaluate(() => (window as unknown as FixtureWindow).calls)).toBe(0);
  } finally { await session.close(); }
});
test('same-URL navigation blocks a stale call and refreshing clears previous document evidence', async ({ baseURL }) => {
  const session = await open(baseURL!, true); const { popup, target } = session;
  try {
    await runRead(popup, 'ready');
    await target.reload(); await target.waitForFunction(async () => (await (document.modelContext as unknown as NativeContext).getTools()).length === 2);
    await popup.locator('#run').click(); await expect(popup.locator('#run-result')).toContainText('page changed');
    expect(await target.evaluate(() => (window as unknown as FixtureWindow).calls)).toBe(0);
    await popup.locator('#refresh').click(); await expect(popup.locator('#tool-count')).toHaveText('2');
    expect((await download(popup)).executions).toEqual([]);
  } finally { await session.close(); }
});
test('activeTab permission requires an extension action without broader host access', async ({ baseURL }) => {
  const session = await open(baseURL!, true, false); const { popup } = session;
  try {
    await expect(popup.locator('#page-title')).toContainText('companion icon');
    await expect(popup.locator('#tool-count')).toHaveText('0');
    await expect(popup.locator('#runner')).toBeHidden();
    const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
    expect(manifest.permissions).toEqual(['activeTab', 'scripting']); expect(manifest.host_permissions).toBeUndefined(); expect(manifest.background).toBeUndefined();
  } finally { await session.close(); }
});
test('a browser without WebMCP shows an unavailable companion while the manual dashboard works', async ({ baseURL }) => {
  const session = await open(baseURL!, false, true, false);
  try {
    await expect(session.popup.locator('#page-title')).toHaveText('WebMCP is unavailable on this page');
    await expect(session.popup.locator('#runner')).toBeHidden();
    await session.target.getByRole('button', { name: 'Run purpose-aware example' }).click();
    await expect(session.target.getByText('Example evaluation · synthetic evidence')).toBeVisible();
  } finally { await session.close(); }
});
test('the actual toolbar popup discovers tools and completes a confirmed native write', async ({ baseURL }, testInfo) => {
  // Invoke the action once: a second invocation can toggle an existing toolbar popup closed.
  const session = await open(baseURL!, false, false); const { cdp, target, id } = session;
  try {
    await session.popup.close(); await target.bringToFront();
    const before = new Set((await cdp.send('Target.getTargets')).targetInfos.map(info => info.targetId));
    const tabs = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
    const actions = cdp as unknown as { send(method: 'Extensions.triggerAction', input: { id: string; targetId: string }): Promise<void> };
    await actions.send('Extensions.triggerAction', { id, targetId: tabs.targetInfos.find(info => info.url === target.url())!.targetId });
    const toolbar = (await cdp.send('Target.getTargets')).targetInfos.find(info => info.type === 'other' && !before.has(info.targetId))!;
    expect(toolbar).toBeDefined();
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: toolbar.targetId, flatten: false });
    type Reply = { result: { value: unknown }; exceptionDetails?: unknown };
    const pending = new Map<number, { resolve(value: Reply): void; reject(error: Error): void }>();
    let messageId = 0;
    cdp.on('Target.receivedMessageFromTarget', event => {
      if (event.sessionId !== sessionId) return;
      const message = JSON.parse(event.message), waiting = pending.get(message.id);
      if (waiting) {
        pending.delete(message.id);
        if (message.error) waiting.reject(new Error(message.error.message));
        else waiting.resolve(message.result);
      }
    });
    async function send(method: string, params: Record<string, unknown> = {}) {
      const id = ++messageId;
      const reply = new Promise<Reply>((resolve, reject) => pending.set(id, { resolve, reject }));
      await cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) });
      return reply;
    }
    async function evaluate(expression: string) {
      const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      expect(reply.exceptionDetails).toBeUndefined(); return reply.result.value;
    }
    await send('Runtime.runIfWaitingForDebugger');
    await expect.poll(() => evaluate('document.querySelector("#tool-count")?.textContent')).toBe('5');
    expect(await evaluate('location.href')).toBe(`chrome-extension://${id}/popup.html`);
    await evaluate('document.querySelector("#run-tool").value="choose_evaluation_profile";document.querySelector("#run-tool").dispatchEvent(new Event("change"));document.querySelector("#tool-input").value=JSON.stringify({profile:"operations"});document.querySelector("#readback-tool").value="get_evaluation_context";document.querySelector("#expected-text").value="operations";document.querySelector("#run").click()');
    await expect(target.locator('#profile')).toHaveValue('commerce');
    expect(await evaluate('document.querySelector("#mutation-confirm").hidden')).toBe(false);
    await evaluate('document.querySelector("#confirm-mutation").click()');
    await expect.poll(() => evaluate('document.querySelector("#run-result").textContent')).toContain('Read-back matched');
    await expect(target.locator('#profile')).toHaveValue('operations');
    await testInfo.attach('toolbar-popup-result', { body: JSON.stringify({ browser: session.context.browser()!.version(), result: await evaluate('document.querySelector("#run-result").textContent') }), contentType: 'application/json' });
  } finally { await session.close(); }
});
