export type ProfileKey = 'commerce' | 'operations' | 'editor' | 'custom';

export type Capability = {
  id: string;
  label: string;
  description: string;
  candidates: string[];
};

export type EvaluationProfile = {
  label: string;
  intent: string;
  approvalRule: string;
  capabilities: Capability[];
};

export type ToolSnapshot = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  evidence?: {
    visibleStateChanged?: boolean;
    readBackVerified?: boolean;
    humanConfirmationPreserved?: boolean;
  };
};

export type RunnerSnapshot = {
  schemaVersion?: number;
  target?: string;
  capturedAt?: string;
  profile?: ProfileKey;
  contract?: {
    intent?: string;
    expectedTools?: string[];
    approvalRule?: string;
  };
  runtime?: {
    webmcpAvailable?: boolean;
    imperative?: boolean | null;
    topLevelPage?: boolean;
    lifecycleCleanup?: boolean | null;
    collectionMethod?: string;
  };
  tools: ToolSnapshot[];
};

export type EvaluationFinding = {
  state: 'pass' | 'warn' | 'fail';
  title: string;
  detail: string;
};

export type JourneyRow = {
  job: string;
  tool: string | null;
  state: 'pass' | 'warn' | 'fail';
  note: string;
};

export type EvaluationReport = {
  score: number;
  label: 'Strong' | 'Needs proof' | 'Incomplete';
  summary: string;
  toolsFound: number;
  readTools: number;
  writeTools: number;
  journey: JourneyRow[];
  findings: EvaluationFinding[];
  dimensions: {
    name: string;
    score: number;
    explanation: string;
  }[];
};

export const profiles: Record<ProfileKey, EvaluationProfile> = {
  commerce: {
    label: 'Commerce & checkout',
    intent: 'Help a shopper find, compare, and safely purchase a product.',
    approvalRule: 'The agent may prepare checkout, but purchase confirmation stays with the person.',
    capabilities: [
      { id: 'discover', label: 'Discover', description: 'Search or filter the product catalog.', candidates: ['search_products', 'find_products', 'browse_catalog'] },
      { id: 'understand', label: 'Understand', description: 'Read price, availability, variants, and policy.', candidates: ['get_product', 'get_product_details', 'compare_products'] },
      { id: 'change', label: 'Change page state', description: 'Add, remove, or update items in the visible cart.', candidates: ['manage_cart', 'update_cart', 'add_to_cart'] },
      { id: 'handoff', label: 'Hand off safely', description: 'Prepare checkout without silently completing payment.', candidates: ['begin_checkout', 'prepare_checkout', 'review_order'] },
    ],
  },
  operations: {
    label: 'Project operations',
    intent: 'Inspect work, update status, and hand decisions back to a person.',
    approvalRule: 'Assignments and status can change; irreversible closure requires an explicit review step.',
    capabilities: [
      { id: 'list', label: 'Find work', description: 'List work relevant to the current workspace.', candidates: ['list_work', 'list_tasks', 'search_work'] },
      { id: 'inspect', label: 'Inspect context', description: 'Read the full context of one work item.', candidates: ['get_work_item', 'get_task', 'inspect_task'] },
      { id: 'update', label: 'Update state', description: 'Change status or progress in the visible workspace.', candidates: ['update_status', 'update_task', 'set_progress'] },
      { id: 'review', label: 'Request review', description: 'Surface a decision or deliverable to a person.', candidates: ['request_review', 'request_human_input', 'submit_for_review'] },
    ],
  },
  editor: {
    label: 'Content editor',
    intent: 'Find content, propose edits, and preserve a visible review step.',
    approvalRule: 'Edits remain proposed or undoable until the person accepts them.',
    capabilities: [
      { id: 'read', label: 'Read document', description: 'Read the current document and selection.', candidates: ['get_document', 'get_current_document', 'read_document'] },
      { id: 'find', label: 'Find content', description: 'Locate a relevant section or passage.', candidates: ['find_section', 'search_document', 'find_text'] },
      { id: 'propose', label: 'Propose edit', description: 'Stage a visible, reviewable edit.', candidates: ['suggest_edit', 'propose_edit', 'stage_edit'] },
      { id: 'comment', label: 'Leave context', description: 'Add a comment without overwriting content.', candidates: ['add_comment', 'leave_comment', 'create_comment'] },
    ],
  },
  custom: {
    label: 'Custom contract',
    intent: 'Define the job, expected tools, side effects, and proof yourself.',
    approvalRule: 'The person defines which consequential step must remain review-gated.',
    capabilities: [
      { id: 'read', label: 'Read capability', description: 'Read the state needed for the task.', candidates: ['your_read_tool'] },
      { id: 'write', label: 'Write capability', description: 'Update the same state the person can see.', candidates: ['your_write_tool'] },
    ],
  },
};

const sampleTools: Record<Exclude<ProfileKey, 'custom'>, RunnerSnapshot> = {
  commerce: {
    target: 'https://shop.example',
    capturedAt: '2026-09-02T15:00:00.000Z',
    runtime: { imperative: true, topLevelPage: true, lifecycleCleanup: true },
    tools: [
      {
        name: 'search_products',
        description: 'Search the visible product catalog using a query and optional filters.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        evidence: { visibleStateChanged: true, readBackVerified: true },
      },
      {
        name: 'get_product',
        description: 'Read current price, availability, variants, and return policy for one product.',
        inputSchema: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        evidence: { readBackVerified: true },
      },
      {
        name: 'manage_cart',
        description: 'Add, remove, or change the quantity of an item in the shopper cart.',
        inputSchema: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'number' } }, required: ['productId', 'quantity'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        evidence: { visibleStateChanged: false, readBackVerified: false },
      },
      {
        name: 'begin_checkout',
        description: 'Prepare the current cart for checkout and open a visible order review without completing payment.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        evidence: { visibleStateChanged: true, readBackVerified: true, humanConfirmationPreserved: true },
      },
    ],
  },
  operations: {
    target: 'https://workspace.example',
    runtime: { imperative: true, topLevelPage: true, lifecycleCleanup: true },
    tools: [
      { name: 'list_work', description: 'List the work items visible in the current workspace.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, evidence: { readBackVerified: true } },
      { name: 'get_work_item', description: 'Read the full context and current status of one work item.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, evidence: { readBackVerified: true } },
      { name: 'update_status', description: 'Update a work item status and reflect the change in the visible board.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } }, required: ['id', 'status'], additionalProperties: false }, annotations: { readOnlyHint: false }, evidence: { visibleStateChanged: true, readBackVerified: true } },
      { name: 'request_review', description: 'Create a visible review request for the selected work item.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false }, evidence: { visibleStateChanged: true, readBackVerified: true, humanConfirmationPreserved: true } },
    ],
  },
  editor: {
    target: 'https://editor.example',
    runtime: { imperative: true, topLevelPage: true, lifecycleCleanup: true },
    tools: [
      { name: 'get_document', description: 'Read the current document title, content, and selected text.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, evidence: { readBackVerified: true } },
      { name: 'find_section', description: 'Find a section in the current document using a text query.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, evidence: { readBackVerified: true } },
      { name: 'suggest_edit', description: 'Stage a visible proposed edit for a person to review and accept.', inputSchema: { type: 'object', properties: { sectionId: { type: 'string' }, replacement: { type: 'string' } }, required: ['sectionId', 'replacement'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, evidence: { visibleStateChanged: true, readBackVerified: true, humanConfirmationPreserved: true } },
      { name: 'add_comment', description: 'Add a visible comment to a document section without changing its text.', inputSchema: { type: 'object', properties: { sectionId: { type: 'string' }, comment: { type: 'string' } }, required: ['sectionId', 'comment'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, evidence: { visibleStateChanged: true, readBackVerified: true } },
    ],
  },
};

export function getSampleSnapshot(profile: ProfileKey): RunnerSnapshot {
  if (profile === 'custom') {
    return {
      target: 'https://your-site.example',
      runtime: { imperative: true, topLevelPage: true, lifecycleCleanup: true },
      tools: [
        { name: 'your_read_tool', description: 'Read the current task context from the visible page.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, evidence: { readBackVerified: true } },
        { name: 'your_write_tool', description: 'Update the visible task state and return the state revision.', inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false }, annotations: { readOnlyHint: false }, evidence: { visibleStateChanged: true, readBackVerified: true } },
      ],
    };
  }
  return sampleTools[profile];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function findCapabilityTool(capability: Capability, tools: ToolSnapshot[]) {
  const candidates = capability.candidates.map(normalize);
  return tools.find((tool) => candidates.includes(normalize(tool.name))) ?? null;
}

function validSchema(tool: ToolSnapshot) {
  return tool.inputSchema?.type === 'object' && tool.inputSchema?.additionalProperties === false;
}

export function evaluateSnapshot(profile: EvaluationProfile, snapshot: RunnerSnapshot): EvaluationReport {
  const tools = Array.isArray(snapshot.tools) ? snapshot.tools : [];
  const journey: JourneyRow[] = profile.capabilities.map((capability) => {
    const tool = findCapabilityTool(capability, tools);
    if (!tool) return { job: capability.label, tool: null, state: 'fail', note: 'No declared tool covers this job.' };
    const isWrite = tool.annotations?.readOnlyHint === false;
    const weakProof = isWrite && (!tool.evidence?.visibleStateChanged || !tool.evidence?.readBackVerified);
    return {
      job: capability.label,
      tool: tool.name,
      state: weakProof ? 'warn' : 'pass',
      note: weakProof ? 'Tool exists, but the runner could not verify its visible state change.' : 'Capability and evidence align.',
    };
  });

  const coverage = Math.round((journey.filter((row) => row.state !== 'fail').length / Math.max(journey.length, 1)) * 100);
  const schemas = tools.length ? Math.round((tools.filter(validSchema).length / tools.length) * 100) : 0;
  const annotated = tools.length ? Math.round((tools.filter((tool) => typeof tool.annotations?.readOnlyHint === 'boolean').length / tools.length) * 100) : 0;
  const writeTools = tools.filter((tool) => tool.annotations?.readOnlyHint === false);
  const proof = writeTools.length
    ? Math.round((writeTools.filter((tool) => tool.evidence?.visibleStateChanged && tool.evidence?.readBackVerified).length / writeTools.length) * 100)
    : 100;
  const discovery = snapshot.runtime?.webmcpAvailable ?? snapshot.runtime?.imperative;
  const runtimeChecks = [discovery, snapshot.runtime?.topLevelPage, snapshot.runtime?.lifecycleCleanup];
  const knownRuntimeChecks = runtimeChecks.filter((value): value is boolean => typeof value === 'boolean');
  const runtime = knownRuntimeChecks.length ? Math.round((knownRuntimeChecks.filter(Boolean).length / knownRuntimeChecks.length) * 100) : 0;
  const score = Math.round(coverage * 0.35 + schemas * 0.15 + annotated * 0.15 + proof * 0.25 + runtime * 0.1);

  const findings: EvaluationFinding[] = [];
  findings.push({
    state: discovery && snapshot.runtime?.topLevelPage ? 'pass' : 'fail',
    title: discovery && snapshot.runtime?.topLevelPage ? 'Live tools were discovered on the top-level page' : 'Compatible top-level discovery was not proven',
    detail: `${tools.length} WebMCP tool${tools.length === 1 ? '' : 's'} in the runner snapshot`,
  });
  const weakWrite = writeTools.find((tool) => !tool.evidence?.visibleStateChanged || !tool.evidence?.readBackVerified);
  findings.push(weakWrite
    ? { state: 'warn', title: `${weakWrite.name} does not prove visible state changed`, detail: 'Return a state revision and verify the same change through the page or a read-back tool.' }
    : { state: 'pass', title: 'Mutations have visible, read-back evidence', detail: `${writeTools.length} write tool${writeTools.length === 1 ? '' : 's'} verified` });
  findings.push({
    state: annotated === 100 ? 'pass' : 'warn',
    title: annotated === 100 ? 'Read and write tools are distinguishable' : 'Some tools omit read/write annotations',
    detail: `${tools.length - writeTools.length} read · ${writeTools.length} write`,
  });
  const missing = journey.filter((row) => row.state === 'fail');
  if (missing.length) findings.push({ state: 'fail', title: `${missing.length} declared journey step${missing.length === 1 ? ' is' : 's are'} uncovered`, detail: missing.map((row) => row.job).join(', ') });

  const label = score >= 90 ? 'Strong' : score >= 65 ? 'Needs proof' : 'Incomplete';
  const summary = score >= 90
    ? 'The tool contract covers the declared journey with verifiable, visible outcomes.'
    : missing.length
      ? 'The implementation is structurally valid, but it does not cover the full job you declared.'
      : 'The tool set covers the declared journey. At least one action still needs stronger behavioral evidence.';

  return {
    score,
    label,
    summary,
    toolsFound: tools.length,
    readTools: tools.length - writeTools.length,
    writeTools: writeTools.length,
    journey,
    findings,
    dimensions: [
      { name: 'Purpose coverage', score: coverage, explanation: 'Does each declared user-journey step have a suitable tool?' },
      { name: 'Contract quality', score: Math.round((schemas + annotated) / 2), explanation: 'Are schemas narrow and side effects honestly annotated?' },
      { name: 'Observable proof', score: proof, explanation: 'Do mutations change the same visible state and survive read-back?' },
      { name: 'Runtime hygiene', score: runtime, explanation: 'Are tools imperative, top-level, and lifecycle-owned?' },
    ],
  };
}

export function parseSnapshot(value: string): RunnerSnapshot {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('Snapshot must be a JSON object.');
  const snapshot = parsed as Partial<RunnerSnapshot>;
  if (!Array.isArray(snapshot.tools)) throw new Error('Snapshot must contain a tools array.');
  for (const tool of snapshot.tools) {
    if (!tool || typeof tool.name !== 'string' || typeof tool.description !== 'string') {
      throw new Error('Every tool needs a string name and description.');
    }
  }
  if (snapshot.profile && !Object.hasOwn(profiles, snapshot.profile)) throw new Error('Snapshot profile is not recognized.');
  if (snapshot.contract?.expectedTools && !Array.isArray(snapshot.contract.expectedTools)) throw new Error('Snapshot contract expectedTools must be an array.');
  return snapshot as RunnerSnapshot;
}

export function makeCustomProfile(intent: string, expectedNames: string, approvalRule: string): EvaluationProfile {
  const names = expectedNames.split(',').map((name) => name.trim()).filter(Boolean);
  return {
    label: 'Custom contract',
    intent: intent.trim() || profiles.custom.intent,
    approvalRule: approvalRule.trim() || profiles.custom.approvalRule,
    capabilities: (names.length ? names : ['your_read_tool', 'your_write_tool']).map((name, index) => ({
      id: `custom-${index}`,
      label: name.replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase()),
      description: `User-declared capability expected from ${name}.`,
      candidates: [name],
    })),
  };
}

