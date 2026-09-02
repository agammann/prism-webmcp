import { PROFILE_DEFAULTS, buildSnapshot, normalizeTool, parseJsonObject, toBase64Url } from './lib.js';

const PRISM_URL = 'https://prism.alx21.chatgpt.site/';

const state = {
  tab: null,
  page: { supported: false, url: '', title: '' },
  tools: [],
  executions: [],
  pendingMutation: null,
};

const element = (id) => document.getElementById(id);
const nodes = {
  refresh: element('refresh'),
  pageTitle: element('page-title'),
  pageUrl: element('page-url'),
  statusDot: element('status-dot'),
  toolCount: element('tool-count'),
  profile: element('profile'),
  customContract: element('custom-contract'),
  intent: element('intent'),
  expectedTools: element('expected-tools'),
  approvalRule: element('approval-rule'),
  contractSummary: element('contract-summary'),
  toolList: element('tool-list'),
  runner: element('runner'),
  runTool: element('run-tool'),
  toolMeta: element('tool-meta'),
  toolInput: element('tool-input'),
  readbackFields: element('readback-fields'),
  readbackTool: element('readback-tool'),
  readbackInput: element('readback-input'),
  expectedText: element('expected-text'),
  run: element('run'),
  mutationConfirm: element('mutation-confirm'),
  cancelMutation: element('cancel-mutation'),
  confirmMutation: element('confirm-mutation'),
  runResult: element('run-result'),
  openPrism: element('open-prism'),
  download: element('download'),
};

function contractFromForm() {
  const defaults = PROFILE_DEFAULTS[nodes.profile.value];
  return {
    profile: nodes.profile.value,
    intent: nodes.profile.value === 'custom' ? nodes.intent.value : defaults.intent,
    expectedTools: nodes.profile.value === 'custom' ? nodes.expectedTools.value : defaults.expectedTools.join(', '),
    approvalRule: nodes.profile.value === 'custom' ? nodes.approvalRule.value : defaults.approvalRule,
  };
}

function updateContract() {
  const defaults = PROFILE_DEFAULTS[nodes.profile.value];
  const custom = nodes.profile.value === 'custom';
  nodes.customContract.hidden = !custom;
  if (custom && !nodes.intent.value) {
    nodes.intent.value = defaults.intent;
    nodes.expectedTools.value = defaults.expectedTools.join(', ');
    nodes.approvalRule.value = defaults.approvalRule;
  }
  nodes.contractSummary.textContent = custom ? 'Your declared job and expected tool names will drive the Prism score.' : `${defaults.intent} Human boundary: ${defaults.approvalRule}`;
}

function showResult(message, tone = 'ok') {
  nodes.runResult.hidden = false;
  nodes.runResult.className = `result ${tone === 'ok' ? '' : tone}`.trim();
  nodes.runResult.textContent = message;
}

function selectedTool() {
  return state.tools.find((tool) => tool.name === nodes.runTool.value) || null;
}

function renderTools() {
  nodes.toolCount.textContent = state.tools.length ? `${state.tools.length}` : '0';
  nodes.toolList.replaceChildren();
  if (!state.tools.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = state.page.supported ? 'No tools are exposed in the current page state.' : 'This page does not expose document.modelContext yet.';
    nodes.toolList.append(empty);
    nodes.runner.hidden = true;
    return;
  }

  for (const tool of state.tools) {
    const item = document.createElement('article');
    item.className = 'tool';
    const name = document.createElement('strong');
    name.textContent = tool.name;
    const badges = document.createElement('div');
    badges.className = 'badges';
    const access = document.createElement('span');
    access.className = `badge ${tool.annotations.readOnlyHint ? 'read' : 'write'}`;
    access.textContent = tool.annotations.readOnlyHint ? 'read' : 'write';
    badges.append(access);
    if (tool.annotations.untrustedContentHint) {
      const untrusted = document.createElement('span');
      untrusted.className = 'badge untrusted';
      untrusted.textContent = 'untrusted';
      badges.append(untrusted);
    }
    const description = document.createElement('p');
    description.textContent = tool.description || 'No description supplied.';
    item.append(name, badges, description);
    nodes.toolList.append(item);
  }

  nodes.runTool.replaceChildren(...state.tools.map((tool) => new Option(tool.name, tool.name)));
  const reads = state.tools.filter((tool) => tool.annotations.readOnlyHint);
  nodes.readbackTool.replaceChildren(new Option('Choose a read tool…', ''), ...reads.map((tool) => new Option(tool.name, tool.name)));
  nodes.runner.hidden = false;
  updateRunner();
}

function updateRunner() {
  const tool = selectedTool();
  if (!tool) return;
  const readOnly = tool.annotations.readOnlyHint;
  nodes.toolMeta.textContent = `${readOnly ? 'Read-only' : 'Mutating'} · ${tool.origin || state.page.url} · ${Object.keys(tool.inputSchema?.properties || {}).length} input field(s)`;
  nodes.readbackFields.hidden = readOnly;
  nodes.run.textContent = readOnly ? 'Run read-only check' : 'Review mutation';
  nodes.mutationConfirm.hidden = true;
  state.pendingMutation = null;
}

async function inspectPage() {
  nodes.statusDot.className = 'dot pending';
  nodes.pageTitle.textContent = 'Inspecting this tab…';
  nodes.pageUrl.textContent = '';
  nodes.toolCount.textContent = '—';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/u.test(tab.url || '')) throw new Error('Open an http(s) page, then click the extension again.');
    state.tab = tab;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      world: 'MAIN',
      func: async () => {
        const context = document.modelContext;
        if (!context || typeof context.getTools !== 'function') {
          return { supported: false, url: location.href, title: document.title, tools: [] };
        }
        const registered = await context.getTools();
        const tools = registered.map((tool) => {
          let schema = tool.inputSchema;
          if (typeof schema === 'string') {
            try { schema = JSON.parse(schema); } catch { schema = { type: 'object' }; }
          }
          return {
            name: tool.name,
            title: tool.title,
            description: tool.description,
            inputSchema: schema,
            annotations: tool.annotations ? {
              readOnlyHint: tool.annotations.readOnlyHint,
              untrustedContentHint: tool.annotations.untrustedContentHint,
            } : {},
            origin: tool.origin,
          };
        });
        return { supported: true, url: location.href, title: document.title, tools };
      },
    });
    state.page = { supported: result.supported, url: result.url, title: result.title };
    state.tools = (result.tools || []).map(normalizeTool);
    nodes.pageTitle.textContent = result.supported ? (result.title || 'Untitled WebMCP page') : 'WebMCP is unavailable on this page';
    nodes.pageUrl.textContent = result.url;
    nodes.statusDot.className = result.supported ? 'dot ok' : 'dot error';
    renderTools();
  } catch (error) {
    state.page = { supported: false, url: state.tab?.url || '', title: '' };
    state.tools = [];
    nodes.pageTitle.textContent = error instanceof Error ? error.message : 'Could not inspect this tab.';
    nodes.statusDot.className = 'dot error';
    renderTools();
  }
}

async function hashText(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function executeSelected(readOnly) {
  const tool = selectedTool();
  if (!tool || !state.tab?.id) return;
  let input;
  let readbackInput;
  try {
    input = parseJsonObject(nodes.toolInput.value, 'Tool input');
    readbackInput = nodes.readbackTool.value ? parseJsonObject(nodes.readbackInput.value, 'Read-back input') : {};
  } catch (error) {
    showResult(error.message, 'error');
    return;
  }

  showResult(`Running ${tool.name}… Keep this popup open.`, 'running');
  nodes.run.disabled = true;
  nodes.confirmMutation.disabled = true;
  const startedAt = new Date().toISOString();
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id, frameIds: [0] },
      world: 'MAIN',
      args: [tool.name, input, readOnly ? '' : nodes.readbackTool.value, readbackInput, nodes.expectedText.value],
      func: async (toolName, toolInput, readbackName, verificationInput, expectedText) => {
        const context = document.modelContext;
        if (!context || typeof context.getTools !== 'function' || typeof context.executeTool !== 'function') {
          throw new Error('This browser does not expose the WebMCP discovery and execution APIs on the page.');
        }

        const stableVisibleState = () => {
          const controls = [...document.querySelectorAll('input, textarea, select')].map((node) => {
            if (node instanceof HTMLSelectElement) return `${node.name}:${node.selectedIndex}:${node.value}`;
            if (node instanceof HTMLInputElement && (node.type === 'checkbox' || node.type === 'radio')) return `${node.name}:${node.checked}`;
            return `${node.name}:${node.value}`;
          });
          return JSON.stringify({
            text: (document.body?.innerText || '').replace(/\s+/gu, ' ').trim(),
            controls,
            url: location.href,
            title: document.title,
          });
        };
        const digest = async (value) => {
          if (globalThis.crypto?.subtle) {
            const bytes = new TextEncoder().encode(value);
            const hash = await crypto.subtle.digest('SHA-256', bytes);
            return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
          }
          let hash = 2166136261;
          for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
          return `fnv1a-${(hash >>> 0).toString(16)}`;
        };
        const waitForPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 80))));
        const tools = await context.getTools();
        const selected = tools.find((candidate) => candidate.name === toolName);
        if (!selected) throw new Error(`Tool ${toolName} is no longer exposed in this page state.`);
        const beforeHash = await digest(stableVisibleState());
        const output = await context.executeTool(selected, toolInput);
        await waitForPaint();
        const afterHash = await digest(stableVisibleState());
        let readback = null;
        if (readbackName) {
          const currentTools = await context.getTools();
          const readTool = currentTools.find((candidate) => candidate.name === readbackName);
          if (!readTool) throw new Error(`Read-back tool ${readbackName} is no longer exposed.`);
          const readOutput = await context.executeTool(readTool, verificationInput);
          const readText = typeof readOutput === 'string' ? readOutput : JSON.stringify(readOutput);
          readback = {
            tool: readbackName,
            output: readText,
            expectedText,
            verified: Boolean(expectedText) && readText.toLocaleLowerCase().includes(expectedText.toLocaleLowerCase()),
          };
        }
        return {
          output: typeof output === 'string' ? output : JSON.stringify(output),
          beforeHash,
          afterHash,
          visibleStateChanged: beforeHash !== afterHash,
          readback,
        };
      },
    });
    const output = result.output || '';
    const execution = {
      tool: tool.name,
      readOnly,
      status: 'passed',
      startedAt,
      durationMs: Math.max(0, Date.now() - Date.parse(startedAt)),
      input,
      outputHash: await hashText(output),
      outputLength: output.length,
      outputPreview: output.slice(0, 900),
      visibleStateChanged: result.visibleStateChanged,
      beforeStateHash: result.beforeHash,
      afterStateHash: result.afterHash,
      readBackTool: result.readback?.tool || null,
      readBackVerified: result.readback?.verified === true,
      readBackExpectedText: result.readback?.expectedText || null,
    };
    state.executions.push(execution);
    const evidence = readOnly
      ? 'Read completed.'
      : `Visible state ${result.visibleStateChanged ? 'changed' : 'did not change'}. Read-back ${result.readback?.verified ? 'matched' : 'was not verified'}.`;
    showResult(`${tool.name} passed in ${execution.durationMs} ms. ${evidence}\n\nOutput preview:\n${output.slice(0, 900) || '(empty result)'}`);
    await inspectPage();
  } catch (error) {
    state.executions.push({
      tool: tool.name,
      readOnly,
      status: 'failed',
      startedAt,
      durationMs: Math.max(0, Date.now() - Date.parse(startedAt)),
      input,
      error: error instanceof Error ? error.message : String(error),
    });
    showResult(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    nodes.run.disabled = false;
    nodes.confirmMutation.disabled = false;
    nodes.mutationConfirm.hidden = true;
    state.pendingMutation = null;
  }
}

function prepareRun() {
  const tool = selectedTool();
  if (!tool) return;
  if (tool.annotations.readOnlyHint) {
    void executeSelected(true);
    return;
  }
  try {
    parseJsonObject(nodes.toolInput.value, 'Tool input');
  } catch (error) {
    showResult(error.message, 'error');
    return;
  }
  state.pendingMutation = tool.name;
  nodes.mutationConfirm.hidden = false;
  showResult(`Ready to call ${tool.name}. A separate confirmation is required because it is not marked read-only.`, 'running');
}

function makeSnapshot() {
  if (!state.page.url) throw new Error('Inspect a page before exporting a snapshot.');
  return buildSnapshot({ page: state.page, tools: state.tools, executions: state.executions, contract: contractFromForm() });
}

async function openInPrism() {
  try {
    const json = JSON.stringify(makeSnapshot());
    const encoded = toBase64Url(json);
    if (encoded.length > 50000) throw new Error('This snapshot is too large for URL handoff. Download the JSON and paste it into Prism instead.');
    await chrome.tabs.create({ url: `${PRISM_URL}#prism-snapshot=${encoded}` });
  } catch (error) {
    showResult(error.message, 'error');
  }
}

function downloadSnapshot() {
  try {
    const json = JSON.stringify(makeSnapshot(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prism-webmcp-${new URL(state.page.url).hostname}-${new Date().toISOString().replaceAll(':', '-')}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showResult(error.message, 'error');
  }
}

nodes.profile.addEventListener('change', updateContract);
nodes.refresh.addEventListener('click', inspectPage);
nodes.runTool.addEventListener('change', updateRunner);
nodes.run.addEventListener('click', prepareRun);
nodes.cancelMutation.addEventListener('click', () => {
  state.pendingMutation = null;
  nodes.mutationConfirm.hidden = true;
  showResult('Mutation cancelled. No tool was called.', 'running');
});
nodes.confirmMutation.addEventListener('click', () => {
  if (state.pendingMutation === selectedTool()?.name) void executeSelected(false);
});
nodes.openPrism.addEventListener('click', openInPrism);
nodes.download.addEventListener('click', downloadSnapshot);

updateContract();
void inspectPage();

