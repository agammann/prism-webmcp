# Prism — WebMCP Challenge submission copy

## Tagline

Tell Prism what a WebMCP is for, then test whether its tools actually deliver.

## Inspiration

WebMCP evaluation can become a checklist of surface-level signals: did the page register tools, do they have schemas, and can the browser call them? Those checks matter, but they do not answer the product question. A commerce tool set, an editor, and a project workspace need different capabilities and different human-approval boundaries.

Prism starts with the job to be done. It evaluates whether a WebMCP implementation covers that journey, whether mutations affect the same state a person sees, and whether consequential decisions remain visible and human-controlled.

## What it does

Prism combines a purpose-aware evaluation dashboard with an open-source, local-first browser companion.

A person selects Commerce, Project Operations, Content Editor, or defines a Custom contract. That contract states the intent, expected capabilities, and the action that must remain human-approved. The browser companion then runs on the target page, discovers its live WebMCP tools, executes only selected checks, and records schemas, annotations, timing, and privacy-preserving before-and-after evidence.

Prism maps that evidence to four dimensions:

- purpose coverage;
- contract quality;
- observable mutation proof; and
- runtime hygiene.

Every score includes journey-level evidence and a repair that can be tested again. A weak cart mutation, for example, does not merely lose points: Prism explains that the runner could not verify the visible state change and recommends returning a state revision plus a read-back check.

Prism is itself a WebMCP app. Its four page-side tools let an agent read the selected contract, switch profiles, run a deterministic evaluation, and read the same score and evidence shown to the person.

## How we built it

The dashboard is React and TypeScript on Vinext, deployed through ChatGPT Sites. Its scoring engine consumes a versioned runner snapshot and keeps the report deterministic and interpretable.

The Manifest V3 companion uses the active page's `document.modelContext.getTools()` and `document.modelContext.executeTool()` APIs. It runs in the target origin because a hosted iframe or HTTP request cannot truthfully inspect another page's WebMCP tools. It hashes visible before-and-after state, supports an explicit read-back check, and exports only evidence metadata—not page text or tool output.

The dashboard registers `get_evaluation_context`, `choose_evaluation_profile`, `run_sample_evaluation`, and `get_latest_evaluation` with narrow object schemas, annotations, validation, and lifecycle cancellation. The mutation tools update the same React state rendered in the visible interface.

## Challenges we ran into

The hardest design constraint was the browser execution boundary. Cross-origin discovery would have been convenient, but it would also have been misleading. Separating collection from evaluation made the architecture more honest and gave us a useful privacy boundary.

Behavioral evidence also needed careful calibration. A DOM digest proves that something visible changed, but not that the semantic change was correct. Prism therefore distinguishes visible-state evidence from stronger tool read-back evidence and does not claim either one proves the target application's human-approval policy.

## Accomplishments that we're proud of

- Purpose-specific contracts prevent irrelevant tool count from dominating the score.
- Every deduction is tied to visible evidence and an actionable repair.
- The companion is local-first, minimal-permission, and requires a fresh confirmation for mutation checks.
- Prism's own WebMCP mutations and reads agree with its visible UI.
- The dashboard, companion, source, tests, and judge guide form one coherent open-source release.

## What we learned

WebMCP quality is not just API design. It is the relationship among intent, page state, agent authority, and the evidence available to a person. The most useful evaluator is therefore not a universal pass/fail scanner; it is a repeatable contract between the product team and the experience they intend to ship.

## What's next

Next, Prism can add reusable contract packs, richer assertions for semantic read-back, shareable evaluation histories, and CI adapters that compare a new snapshot with a reviewed baseline. The same model could support accessibility audits, agent regression testing, and organization-specific approval policies.

## Built with

WebMCP, React, TypeScript, Vinext, Vite, Cloudflare Workers, Manifest V3, Node.js, Codex, and ChatGPT Sites.

