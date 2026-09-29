# Privacy

The companion runs after you click its icon on an HTTP(S) tab. It discovers and executes selected tools inside that tab through browser scripting and WebMCP APIs. It has no background collector, analytics, account, storage permission, or remote code.

The popup temporarily holds inputs, results, and errors in memory so you can inspect a call. Closing it clears that memory. A changed page resets execution history.

Exports include the target URL's origin and path, declared contract, tool names/descriptions/schemas/annotations, timestamps, timing, hashes, output length, and outcome flags. They omit raw inputs, outputs, error text, expected assertion text, and URL query/fragment. Descriptions, schemas, contracts, and URL paths can still contain private information; inspect the exported JSON before sharing it. Hashes are fingerprints, not encryption or anonymization guarantees.

**Open in Prism** puts the snapshot in a URL fragment. The fragment is not part of the HTTP request to the host, but browser history, extensions, and the dashboard's page code can access it. Prism removes that fragment after reading it, including invalid imports. Hosting still receives ordinary requests for the app and assets. Use **Download JSON** and file import if you prefer to avoid fragment handoff.

The dashboard evaluates snapshots in tab memory and does not upload or persist them. Reports are saved only when you download them. A downloaded report contains the selected contract, target, findings, and provenance; review it before sharing.
