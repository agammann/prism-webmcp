# Prism

**Inspect the evidence behind a WebMCP tool contract.**

[Use Prism](https://prism.alx21.chatgpt.site/) · [Download the companion](https://prism.alx21.chatgpt.site/prism-webmcp-companion.zip)

Prism is a free, browser-based tool for comparing the capabilities you expect with a snapshot of a page's WebMCP tools. It shows missing tool names, incomplete schemas and annotations, missing outcome evidence, and an unverified human approval boundary. Use it to decide what to test or repair next.

No account or API key is needed. The dashboard evaluates JSON locally. It does not visit the target URL, run tools on another site, or independently certify that a task was completed. The optional companion lets you collect evidence in a compatible browser.

## Try it

1. Open Prism and run a built-in Commerce, Operations, or Editor example. Examples always remain labeled **synthetic evidence**.
2. Select **Runner snapshot** to paste JSON, or import a JSON file. A file or companion-link import restores its declared contract; pasted JSON is evaluated against the contract currently selected in the form.
3. Use **Custom contract** for your actual task, tool names, and human approval rule. Changing a profile preserves imported JSON. Changes to the setup mark the previous report stale.
4. Choose **Evaluate runner snapshot** and review every finding. The report identifies its source, target, exact contract, and supplied timestamp.
5. Choose **Download report JSON** to save the report, including provenance and whether it is stale. Keep your original snapshot separately for reruns.

State lives in the open tab and is lost on reload or close. **New evaluation** clears the current draft and restores the Commerce example. No evaluation history is stored by Prism.

## Collect a snapshot

[Install and use the companion](extension/README.md) on a page you are developing or authorized to test. It requires the browser to expose `document.modelContext.getTools()` and `executeTool()`; the dashboard itself works without WebMCP support.

The companion discovers tools in the active page, executes only selected calls, and exports a snapshot. Every tool not explicitly read-only requires a fresh confirmation. Supply expected text to check a read result, or a read-back tool plus expected text to check a mutation. The latest run for each tool is used; separate partial successes are never combined.

**A completed call is not a completed task.** A DOM digest can change because a status indicator changed. A substring assertion can match irrelevant text. Independently inspect the intended outcome. The companion does not prove lifecycle cleanup or the target application's human approval boundary.

Exports omit raw inputs, outputs, error text, assertion text, and URL query/fragment. Descriptors, schemas, contract text, URL path, timestamps, hashes, and outcomes remain; review them before sharing. [Privacy details](extension/PRIVACY.md).

## Snapshot format

```json
{
  "schemaVersion": 1,
  "target": "https://your-app.example/workspace",
  "profile": "custom",
  "contract": {
    "intent": "Read the current work item",
    "expectedTools": ["get_work_item"],
    "approvalRule": "A person approves closing the item"
  },
  "runtime": {
    "webmcpAvailable": true,
    "topLevelPage": true,
    "lifecycleCleanup": null
  },
  "tools": [{
    "name": "get_work_item",
    "description": "Read the selected work item",
    "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false },
    "annotations": { "readOnlyHint": true },
    "evidence": { "readBackVerified": true }
  }]
}
```

Evidence flags must be actual booleans. Omit unobserved evidence; do not set it to `true` merely because a call returned. `false` means a negative observation, particularly for `humanConfirmationPreserved`. Runtime observations may be `null` when unknown. Schema version 1 and legacy snapshots without a version are accepted, up to 500 tools and 1 MB of text. Duplicate or ambiguously normalized names are rejected.

## How scoring works

| Dimension | Weight | What receives credit |
| --- | ---: | --- |
| Name coverage | 30% | Each expected name or built-in alias is present |
| Schema shape | 10% | Object input schemas with `additionalProperties: false` |
| Read/write annotations | 10% | Explicit boolean `readOnlyHint` |
| Reported outcomes | 25% | Reads: an assertion; writes: visible change and read-back from the same run |
| Runtime evidence | 10% | Discovery, top-level page, and lifecycle observations |
| Approval evidence | 15% | A reported preserved human boundary, with no reported violations |

Missing evidence earns no credit. Unknown annotations are counted separately from reads and writes. **Strong** requires every rubric condition, not just a high numeric score. Even a Strong report is only as trustworthy as its input: name matching is not semantic verification, schema shape is not full schema validation, and booleans are not independently checked by the dashboard.

## Use with an agent

In a browser implementing the [WebMCP document API](https://webmachinelearning.github.io/webmcp/), Prism registers five tools with lifecycle cleanup:

| Tool | Input | Behavior |
| --- | --- | --- |
| `get_evaluation_context` | `{}` | Reads the current draft, including actual custom fields and source |
| `choose_evaluation_profile` | `{"profile":"custom"}` | Changes the draft; preserves JSON and marks the previous report stale |
| `run_sample_evaluation` | `{"profile":"editor"}` | Evaluates a synthetic example; `custom` uses the current custom fields |
| `evaluate_current_snapshot` | `{}` | Evaluates entered JSON in Runner snapshot mode using the visible contract |
| `get_latest_evaluation` | `{}` | Reads report, provenance, exact contract, findings, and stale flag |

Profiles are `commerce`, `operations`, `editor`, and `custom`. Extra input properties and unknown profiles are rejected. Tools stay registered across state changes and use the same actions as the UI. Registration failure is shown on the page; manual controls remain available. Agent activity records the last five tool names, modes, timestamps, and call status, without arguments or results.

## Run locally

Requires Node.js 24 or newer and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed localhost URL. There is no provider credential or database to configure. The development server uses a local preview mode; production uses a Cloudflare Worker with response security headers.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm start
```

`pnpm start` serves the built Worker locally through Wrangler. CI installs Chromium with its Linux dependencies and runs the same checks. Unit tests exercise parsing, scoring, companion evidence, and security headers. Browser tests exercise import, stale reports, exports, custom agent actions, responsive layout, and the actual companion popup/injected code with stubbed Chrome transport and WebMCP. These stubs do not establish browser compatibility; separately test your chosen browser's native APIs. Routing fixtures are static contract checks, not model evaluation results.

To rebuild the companion download after changes: `pnpm package:companion`. `pnpm verify:companion` confirms that the ZIP matches the extension sources.

## Repository map

- `app/`: dashboard and metadata
- `lib/evaluator.ts`: snapshot validation and evidence rubric
- `components/webmcp-provider.tsx`: stable page-side tool registration
- `extension/`: Manifest V3 companion, privacy guide, and unit tests
- `test/` and `e2e/`: evaluator and browser regression tests
- `worker.ts`: production security-header wrapper
- `.github/workflows/ci.yml`: build and verification

MIT licensed. See [LICENSE](LICENSE).
