# Prism

**Inspect the evidence behind a WebMCP tool contract.**

[Use Prism](https://prism.alx21.chatgpt.site/) · [Download v1](https://github.com/agammann/prism-webmcp/releases/tag/v1.0.0)

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

Profiles are `commerce`, `operations`, `editor`, and `custom`. Extra input properties and unknown profiles are rejected. Tools stay registered across state changes and use the same actions as the UI. They withdraw on `pagehide` and reconnect after a cached `pageshow`. Registration failure is shown on the page; manual controls remain available. Agent activity records the last five tool names, modes, timestamps, and call status, without arguments or results.

WebMCP remains experimental. Chrome 154 requires the WebMCP feature flag, or `--enable-features=WebMCP` for automated runs. See [Chrome's WebMCP guide](https://developer.chrome.com/docs/ai/webmcp). Ordinary dashboard controls work when the API is unavailable.

## Run locally

Requires Node.js 24 or newer and pnpm 11.19.0. No database, account, hosted-model credential or environment file is required.

For the pinned v1 delivery, download `prism_1.0.0_source.zip` and `SHA256SUMS` from the [v1.0.0 release](https://github.com/agammann/prism-webmcp/releases/tag/v1.0.0). Verify the ZIP hash with `sha256sum` or PowerShell `Get-FileHash`, compare it with the matching line in SHA256SUMS, and extract into a new folder. From its `prism-1.0.0` directory, run `pnpm install --frozen-lockfile`, `pnpm build`, then `pnpm start`. Open the printed localhost URL. Keep that folder for rollback.

For source development:

```sh
git clone --branch v1.0.0 --depth 1 https://github.com/agammann/prism-webmcp.git
cd prism-webmcp
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed localhost URL. There is no provider credential or database to configure. The development server uses a local preview mode; production uses a Cloudflare Worker with response security headers.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm security:audit
pnpm verify:companion
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
pnpm exec playwright install chrome
pnpm test:webmcp
pnpm start
```

`pnpm start` serves the built Worker locally through Wrangler. Run the browser suites one at a time; each starts its own local Worker. `test:e2e` checks imports, stale reports, exports, custom agent actions, responsive layout, and popup regressions with stubbed transport. `test:webmcp` checks the five tools through native discovery and execution, input refusal, visible state, and back-forward cache restoration. Routing fixtures are static contract checks, not model evaluation results.

The loaded-extension suite uses real `activeTab`/`scripting` permissions and native WebMCP, with selected calls against Prism and a local fixture. See [companion development](extension/README.md#development) for its browser setup. CI runs all three suites against the built Worker and retains native JSON results. Most popup interactions use the same extension document in a background tab after the toolbar action grants permission. A separate check drives the actual toolbar popup through Chrome's protocol and confirms a write with read-back. Open in Prism imports the fictional snapshot into a temporary tab on the public dashboard, so that check also requires network access. No extension transport or WebMCP API is replaced in that suite.

Native dashboard execution is verified on Chrome 154, Edge 154, and Chrome for Testing 155.0.8059.12. Loaded companion execution is verified on Chrome for Testing 154.0.8037.92 and 155.0.8059.12. The adapter selects JSON-string input for Chrome 154 and object input for Chrome 155 before the first call; it never retries a mutation to detect the API version. Recheck experimental browser APIs when adopting newer builds.

Run `pnpm security:audit` when changing dependencies. CI retains the full dependency reports in its artifacts.

Save the original input snapshot and downloaded report before closing the tab or upgrading. If an imported file is invalid, correct a copy and rerun; the previous report stays available. Reload discards unsaved dashboard state and closing the companion discards its run history. [Stability, upgrade and rollback](docs/STABILITY.md) describes that supported recovery boundary.

For a reproducible problem, open a repository issue with the release, browser version, exact steps and a sanitized fixture. Do not include credentials or private descriptors.

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
