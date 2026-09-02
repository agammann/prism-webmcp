# Prism WebMCP Companion

An open-source Manifest V3 extension for purpose-aware WebMCP testing. It discovers the live tools exposed by the active page, lets a developer run deterministic calls, captures privacy-preserving behavioral evidence, and hands the resulting snapshot to Prism.

## Install locally

1. Use a Chrome build where `document.modelContext` is enabled (for example, an eligible origin-trial or preview configuration).
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this `extension` directory.
5. Open a WebMCP-enabled page and click **Prism WebMCP Companion**.

The extension requests only `activeTab` and `scripting`. Clicking its toolbar icon grants temporary access to the current tab; it does not run persistently on every site.

## What it checks

- The exact tool set exposed in the current page state via `document.modelContext.getTools()`.
- Tool descriptions, JSON Schemas, origins, and `readOnlyHint` / `untrustedContentHint` annotations.
- Direct calls via the browser-mediated `document.modelContext.executeTool()` API.
- Before/after hashes of visible page state for mutation evidence.
- Optional read-back calls with a developer-supplied expected substring.
- A declared Commerce, Operations, Editor, or Custom evaluation contract.

## Safety and privacy boundary

- Every tool not explicitly marked `readOnlyHint: true` requires a fresh, one-call confirmation.
- The snapshot omits page text and tool output. It records SHA-256 hashes, lengths, timing, inputs, and pass/fail evidence.
- The extension confirmation proves only that the developer approved a test call. It does **not** prove that the target application preserves its own human-only approval boundary.
- A generic DOM digest can prove that visible state changed, but not that the semantic change was correct. Use an explicit read-back tool and expected text for stronger evidence.
- Tool lifecycle cleanup is not exposed by `getTools()` and is reported as unverified.

## Development

The extension uses browser-native JavaScript, HTML, and CSS, so there is no build step. Pure snapshot logic lives in `lib.js` and is covered by the repository's Node test suite.

## License

MIT. See the included `LICENSE` file.

