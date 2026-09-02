# Prism judge guide

## Links

- Live application: https://prism.alx21.chatgpt.site/
- Browser companion: https://prism.alx21.chatgpt.site/prism-webmcp-companion.zip

## Five-minute evaluation

Open Prism in ChatGPT's in-app browser. The page should expose four WebMCP tools.

1. Call `get_evaluation_context` with `{}` to read the selected purpose, expected capabilities, and human-approval boundary.
2. Call `choose_evaluation_profile` with `{ "profile": "operations" }`. Confirm that the visible UI switches to Project Operations.
3. Call `run_sample_evaluation` with `{ "profile": "operations" }`. The visible score should become `100` with the label `Strong`.
4. Call `get_latest_evaluation` with `{}`. Its score, journey rows, and findings should match the page.
5. Switch to Commerce in the UI. The sample scores `88` because `manage_cart` lacks verified visible-state and read-back evidence. The finding explains the exact repair.
6. Switch to Custom contract to define a different job, expected tool names, and human-only boundary.

## Companion evaluation

The downloadable Manifest V3 extension runs in the target page's origin. It discovers `document.modelContext.getTools()`, invokes selected tools through `document.modelContext.executeTool()`, hashes visible before-and-after state, optionally performs a read-back call, and exports the evidence to Prism.

The extension requires a fresh confirmation for every tool not marked `readOnlyHint: true`. Its exported snapshot excludes page text and tool output.

## Verified release evidence

- Anonymous production access returns HTTP 200.
- Prism exposes four page-side WebMCP tools.
- The WebMCP `choose_evaluation_profile` mutation changes the same visible UI state.
- `run_sample_evaluation` and `get_latest_evaluation` return the same visible score and findings.
- The extension tests, TypeScript check, lint, and production build pass.

