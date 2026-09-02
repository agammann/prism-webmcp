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
      readOnlyHint: tool.annotations?.readOnlyHint === true,
      untrustedContentHint: tool.annotations?.untrustedContentHint === true,
    },
    origin: typeof tool.origin === 'string' ? tool.origin : undefined,
  };
}

export function applyExecutionEvidence(tools, executions) {
  return tools.map((tool) => {
    const relevant = executions.filter((execution) => execution.tool === tool.name && execution.status === 'passed');
    const mutationRuns = relevant.filter((execution) => execution.readOnly === false);
    const readRuns = relevant.filter((execution) => execution.readOnly === true);
    return {
      ...tool,
      evidence: {
        visibleStateChanged: mutationRuns.some((execution) => execution.visibleStateChanged === true),
        readBackVerified: mutationRuns.some((execution) => execution.readBackVerified === true) || readRuns.length > 0,
        humanConfirmationPreserved: false,
      },
    };
  });
}

export function buildSnapshot({ page, tools, executions, contract }) {
  const profile = PROFILE_KEYS.includes(contract.profile) ? contract.profile : 'custom';
  return {
    schemaVersion: 1,
    target: page.url,
    capturedAt: new Date().toISOString(),
    collector: {
      name: 'Prism WebMCP Companion',
      version: '0.1.0',
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
    executions: executions.map((execution) => {
      const exported = { ...execution };
      delete exported.outputPreview;
      return exported;
    }),
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

