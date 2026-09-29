# Prism WebMCP Companion

Collect a snapshot of WebMCP tools on a page you are developing or authorized to test. The companion has no background script, telemetry, account, or remote code. It requests only `activeTab` and `scripting`.

## Install

1. Download and extract [the companion ZIP](https://prism.alx21.chatgpt.site/prism-webmcp-companion.zip), or use this repository's `extension` directory.
2. Use a Chromium browser that exposes both `document.modelContext.getTools()` and `document.modelContext.executeTool()` on the target page. These experimental APIs are not available in every browser. The [WebMCP specification](https://webmachinelearning.github.io/webmcp/) describes the API this companion uses.
3. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Open your HTTP(S) page and click the companion icon. An unsupported browser or page gets an explicit unavailable message.

## Collect and evaluate

1. Choose a built-in profile or enter a Custom contract with the intended task, expected names, and human approval rule.
2. Refresh discovery when page state changes. Select a tool and provide an input JSON object.
3. For a read, enter expected text to check its result. For a write, choose a read-back tool and expected text. Matching is case-insensitive substring matching, not semantic validation.
4. A tool without an explicit read-only annotation requires **Review mutation**, then **Run mutation once**. Editing inputs invalidates that confirmation. Reclassification or navigation detected before execution stops the call.
5. Inspect the result and the actual target page. A completed call can still have missing outcome evidence or a failed assertion.
6. Choose **Open in Prism** for a compact snapshot, or **Download JSON** and import the file into Prism. Large snapshots require file import.

The popup retains results only while open. Navigation or a changed target resets its run history. Only the latest run for each tool contributes evidence, including failures. Human approval preservation and lifecycle cleanup remain unverified; extension confirmation is not evidence of an application's review policy.

## What the evidence means

DOM digests summarize page text and form state before and after a call. Password and hidden inputs are excluded. A digest difference can reflect unrelated UI changes. Read-back text can match the wrong field. Use these as prompts to inspect the intended outcome, not as proof by themselves.

The extension catches thrown errors and results with `isError: true`. Application-specific error formats require manual inspection. A page can mislabel its own tools; hints are declarations, not enforcement by the companion.

Exports retain descriptors, schemas, contract text, URL origin/path, timing, hashes, and outcomes. They omit raw inputs, outputs, errors, expected text, and URL query/fragment. Descriptors and paths may themselves contain sensitive information. Review JSON before sharing. See [PRIVACY.md](PRIVACY.md).

## Development

Plain JavaScript, HTML, and CSS; no extension build step. From the repository root, `pnpm test` runs unit tests, `pnpm test:e2e` checks popup behavior with stubbed browser transport, and `pnpm package:companion` regenerates the ZIP.

MIT licensed. See LICENSE.
