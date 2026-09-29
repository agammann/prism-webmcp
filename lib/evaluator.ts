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
  unknownTools: number;
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
  return structuredClone(sampleTools[profile]);
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
  const tools = snapshot.tools;
  const hasProof = (tool: ToolSnapshot) => tool.annotations?.readOnlyHint === true
    ? tool.evidence?.readBackVerified === true
    : tool.annotations?.readOnlyHint === false && tool.evidence?.visibleStateChanged === true && tool.evidence?.readBackVerified === true;
  const journey: JourneyRow[] = profile.capabilities.map((capability) => {
    const tool = findCapabilityTool(capability, tools);
    if (!tool) return { job: capability.label, tool: null, state: 'fail', note: 'No matching tool name. Declare custom names if your implementation uses different names.' };
    return { job: capability.label, tool: tool.name, state: hasProof(tool) ? 'pass' : 'warn', note: hasProof(tool)
      ? 'Name matches; the snapshot reports outcome evidence. Semantic correctness is not independently verified.'
      : 'Name matches, but outcome evidence or a read/write annotation is missing.' };
  });
  const percent = (count: number, total: number) => total ? Math.round(count / total * 100) : 0;
  const coverage = percent(journey.filter(row => row.state !== 'fail').length, journey.length);
  const schemas = percent(tools.filter(validSchema).length, tools.length);
  const annotated = percent(tools.filter(tool => typeof tool.annotations?.readOnlyHint === 'boolean').length, tools.length);
  const reads = tools.filter(tool => tool.annotations?.readOnlyHint === true);
  const writes = tools.filter(tool => tool.annotations?.readOnlyHint === false);
  const unknown = tools.length - reads.length - writes.length;
  const proof = percent(tools.filter(hasProof).length, tools.length);
  const discovery = snapshot.runtime?.webmcpAvailable ?? snapshot.runtime?.imperative;
  const runtime = percent([discovery, snapshot.runtime?.topLevelPage, snapshot.runtime?.lifecycleCleanup].filter(value => value === true).length, 3);
  // A reported boundary on any tool is only supporting evidence, never an independent safety certification.
  const approvalFailed = tools.some(tool => tool.evidence?.humanConfirmationPreserved === false);
  const approvalReported = !approvalFailed && tools.some(tool => tool.evidence?.humanConfirmationPreserved === true);
  const approval = approvalReported ? 100 : 0;
  const score = Math.round(coverage * .3 + schemas * .1 + annotated * .1 + proof * .25 + runtime * .1 + approval * .15);
  const missing = journey.filter(row => row.state === 'fail');
  const findings: EvaluationFinding[] = [
    { state: discovery === true && snapshot.runtime?.topLevelPage === true ? 'pass' : 'warn', title: 'Discovery evidence', detail: `${tools.length} tools supplied. Discovery and top-level status ${discovery === true && snapshot.runtime?.topLevelPage === true ? 'are reported' : 'are not fully reported'}.` },
    { state: proof === 100 ? 'pass' : 'warn', title: 'Outcome evidence', detail: `${tools.filter(hasProof).length} of ${tools.length} tools have reported outcome evidence. Reads require an assertion; writes require a visible change and read-back from the same run.` },
    { state: annotated === 100 ? 'pass' : 'warn', title: 'Read/write annotations', detail: `${reads.length} read · ${writes.length} write · ${unknown} unknown. Unknown tools are not assumed read-only.` },
    { state: schemas === 100 ? 'pass' : 'warn', title: 'Schema shape', detail: `${tools.filter(validSchema).length} of ${tools.length} schemas declare object inputs and reject extra properties. This is a shape check, not full JSON Schema validation.` },
    { state: approvalFailed ? 'fail' : approvalReported ? 'pass' : 'warn', title: approvalFailed ? 'Approval boundary reported broken' : approvalReported ? 'Approval boundary evidence supplied' : 'Approval boundary unverified', detail: `${profile.approvalRule} Prism cannot infer this from a tool name or the companion confirmation.` },
    { state: runtime === 100 ? 'pass' : 'warn', title: 'Runtime evidence', detail: 'Discovery, top-level registration, and lifecycle cleanup each need an explicit positive observation; missing observations receive no credit.' },
  ];
  if (missing.length) findings.push({ state: 'fail', title: `${missing.length} expected capabilities missing`, detail: missing.map(row => row.job).join(', ') });
  const complete = coverage === 100 && schemas === 100 && annotated === 100 && proof === 100 && runtime === 100 && approvalReported;
  return {
    score, label: complete ? 'Strong' : missing.length || !tools.length || approvalFailed ? 'Incomplete' : 'Needs proof',
    summary: complete ? 'All rubric signals are present in the supplied evidence. Independently verify the task outcome and approval boundary before relying on this result.' : 'Review the missing or unverified signals below. A matching name and a successful call alone do not prove the intended task was completed.',
    toolsFound: tools.length, readTools: reads.length, writeTools: writes.length, unknownTools: unknown, journey, findings,
    dimensions: [
      { name: 'Name coverage', score: coverage, explanation: '30% weight. Expected names or preset aliases present; not semantic task verification.' },
      { name: 'Contract shape', score: Math.round((schemas + annotated) / 2), explanation: '20% weight. Object schema, no extra properties, explicit read/write hints.' },
      { name: 'Reported outcomes', score: proof, explanation: '25% weight. Read assertions or visible mutation plus read-back evidence.' },
      { name: 'Runtime evidence', score: runtime, explanation: '10% weight. Discovery, top-level page, and lifecycle observations.' },
      { name: 'Approval evidence', score: approval, explanation: '15% weight. A reported preserved human boundary, with no reported violations.' },
    ],
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function optionalStrings(value: Record<string, unknown>, keys: string[], label: string) {
  for (const key of keys) if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error(`${label}.${key} must be a string.`);
}
function optionalBooleans(value: Record<string, unknown>, keys: string[], label: string, nullable = false) {
  for (const key of keys) if (value[key] !== undefined && !(nullable && value[key] === null) && typeof value[key] !== 'boolean') throw new Error(`${label}.${key} must be a boolean${nullable ? ' or null' : ''}.`);
}
export function parseSnapshot(value: string): RunnerSnapshot {
  if (value.length > 1_000_000) throw new Error('Snapshot exceeds the 1 MB text limit.');
  const snapshot = record(JSON.parse(value) as unknown, 'Snapshot');
  if (snapshot.schemaVersion !== undefined && snapshot.schemaVersion !== 1) throw new Error('Only snapshot schemaVersion 1 is supported.');
  optionalStrings(snapshot, ['target', 'capturedAt', 'profile'], 'Snapshot');
  if (snapshot.profile !== undefined && !Object.hasOwn(profiles, snapshot.profile as string)) throw new Error('Snapshot profile is not recognized.');
  if (!Array.isArray(snapshot.tools) || snapshot.tools.length > 500) throw new Error('Snapshot must contain a tools array with at most 500 tools.');
  const names = new Set<string>();
  for (const entry of snapshot.tools) {
    const tool = record(entry, 'Tool');
    if (typeof tool.name !== 'string' || !tool.name.trim() || typeof tool.description !== 'string') throw new Error('Every tool needs a non-empty string name and string description.');
    const name = normalize(tool.name);
    if (names.has(name)) throw new Error(`Duplicate or ambiguous tool name: ${tool.name}`);
    names.add(name);
    optionalStrings(tool, ['title'], 'Tool');
    if (tool.inputSchema !== undefined) record(tool.inputSchema, 'Tool inputSchema');
    if (tool.annotations !== undefined) optionalBooleans(record(tool.annotations, 'Tool annotations'), ['readOnlyHint', 'untrustedContentHint'], 'Annotations');
    if (tool.evidence !== undefined) optionalBooleans(record(tool.evidence, 'Tool evidence'), ['visibleStateChanged', 'readBackVerified', 'humanConfirmationPreserved'], 'Evidence');
  }
  if (snapshot.runtime !== undefined) {
    const runtime = record(snapshot.runtime, 'Runtime');
    optionalBooleans(runtime, ['webmcpAvailable', 'imperative', 'topLevelPage', 'lifecycleCleanup'], 'Runtime', true);
    optionalStrings(runtime, ['collectionMethod'], 'Runtime');
  }
  if (snapshot.contract !== undefined) {
    const contract = record(snapshot.contract, 'Contract');
    optionalStrings(contract, ['intent', 'approvalRule'], 'Contract');
    if (contract.expectedTools !== undefined && (!Array.isArray(contract.expectedTools) || contract.expectedTools.length > 500 || contract.expectedTools.some(name => typeof name !== 'string' || !name.trim()))) throw new Error('Contract expectedTools must contain at most 500 non-empty strings.');
  }
  return snapshot as RunnerSnapshot;
}

export function makeCustomProfile(intent: string, expectedNames: string, approvalRule: string): EvaluationProfile {
  const names = [...new Set(expectedNames.split(',').map(name => name.trim()).filter(Boolean))];
  return {
    label: 'Custom contract', intent: intent.trim(), approvalRule: approvalRule.trim(),
    capabilities: names.map((name, index) => ({ id: `custom-${index}`, label: name, description: `Expected tool: ${name}`, candidates: [name] })),
  };
}
