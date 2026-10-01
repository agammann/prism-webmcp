export const PROFILE_KEYS = ['commerce', 'operations', 'editor', 'custom'];

export const PROFILE_DEFAULTS = {
  commerce: {
    label: 'Commerce & checkout',
    intent: 'Help a shopper find, compare, and safely purchase a product.',
    expectedTools: ['search_products', 'get_product', 'manage_cart', 'begin_checkout'],
    approvalRule: 'The agent may prepare checkout, but purchase confirmation stays with the person.',
  },
  operations: {
    label: 'Project operations',
    intent: 'Inspect work, update status, and hand decisions back to a person.',
    expectedTools: ['list_work', 'get_work_item', 'update_status', 'request_review'],
    approvalRule: 'Irreversible closure requires an explicit human review step.',
  },
  editor: {
    label: 'Content editor',
    intent: 'Find content, propose edits, and preserve a visible review step.',
    expectedTools: ['get_document', 'find_section', 'suggest_edit', 'add_comment'],
    approvalRule: 'Edits remain proposed or undoable until the person accepts them.',
  },
  custom: {
    label: 'Custom contract',
    intent: 'Inspect the current state and safely complete the declared job.',
    expectedTools: ['your_read_tool', 'your_write_tool'],
    approvalRule: 'Consequential actions remain visible and human-confirmed.',
  },
};

export function parseJsonObject(value, label = 'Input') {
  const parsed = JSON.parse(value || '{}');
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
}

export function normalizeTool(tool) {
  let inputSchema = tool.inputSchema;
  if (typeof inputSchema === 'string') {
    try {
      inputSchema = JSON.parse(inputSchema);
    } catch {
      inputSchema = { type: 'object', description: 'The browser returned a non-JSON schema string.' };
    }
  }

  return {
    name: String(tool.name || ''),
    title: typeof tool.title === 'string' ? tool.title : undefined,
    description: String(tool.description || ''),
    inputSchema: inputSchema && typeof inputSchema === 'object' ? inputSchema : { type: 'object' },
    annotations: {
      readOnlyHint: typeof tool.annotations?.readOnlyHint === 'boolean' ? tool.annotations.readOnlyHint : undefined,
      untrustedContentHint: typeof tool.annotations?.untrustedContentHint === 'boolean' ? tool.annotations.untrustedContentHint : undefined,
    },
    origin: typeof tool.origin === 'string' ? tool.origin : undefined,
  };
}

export function applyExecutionEvidence(tools, executions) {
  return tools.map((tool) => {
    // Only the latest run belongs to the current result; never combine partial successes.
    const latest = executions.findLast(execution => execution.tool === tool.name);
    const passed = latest?.status === 'passed';
    return {
      ...tool,
      evidence: latest ? {
        visibleStateChanged: passed && latest.readOnly === false && latest.visibleStateChanged === true,
        readBackVerified: passed && latest.readBackVerified === true,
      } : {},
    };
  });
}

export function buildSnapshot({ page, tools, executions, contract }) {
  const profile = PROFILE_KEYS.includes(contract.profile) ? contract.profile : 'custom';
  return {
    schemaVersion: 1,
    target: (() => { const url = new URL(page.url); return url.origin + url.pathname; })(),
    capturedAt: new Date().toISOString(),
    collector: {
      name: 'Prism WebMCP Companion',
      version: '0.2.1',
      mode: 'browser-mediated',
    },
    profile,
    contract: {
      intent: contract.intent.trim(),
      expectedTools: contract.expectedTools.split(',').map((name) => name.trim()).filter(Boolean),
      approvalRule: contract.approvalRule.trim(),
    },
    runtime: {
      webmcpAvailable: page.supported === true,
      topLevelPage: true,
      lifecycleCleanup: null,
      collectionMethod: 'document.modelContext.getTools',
    },
    tools: applyExecutionEvidence(tools, executions).map(({ origin, ...tool }) => ({ ...tool, origin })),
    executions: executions.map(execution => ({
      tool: execution.tool, readOnly: execution.readOnly, status: execution.status,
      startedAt: execution.startedAt, durationMs: execution.durationMs,
      outputHash: execution.outputHash, outputLength: execution.outputLength,
      visibleStateChanged: execution.visibleStateChanged,
      beforeStateHash: execution.beforeStateHash, afterStateHash: execution.afterStateHash,
      readBackTool: execution.readBackTool, readBackVerified: execution.readBackVerified,
    })),
    limitations: [
      'Tool lifecycle ownership is not exposed by getTools() and is therefore unverified.',
      'Visible-state evidence is a privacy-preserving DOM digest, not a semantic assertion.',
      'Human-approval preservation must be verified in the target application, not inferred from the extension confirmation.',
    ],
  };
}

export function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
