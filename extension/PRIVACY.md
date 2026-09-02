# Privacy

Prism WebMCP Companion has no analytics, advertising, telemetry, account system, remote code, or background data collection.

It runs only after the user clicks the extension while an http(s) tab is active. Live tool discovery and execution happen inside that tab through Chrome's scripting and WebMCP APIs. Snapshot generation happens locally in the popup.

Exports contain the target URL, declared evaluation contract, tool descriptors, test inputs, timestamps, timing, output length and hash, and before/after visible-state hashes. Exports intentionally omit page text and raw tool outputs. Opening a compact snapshot in the hosted Prism dashboard places that snapshot in the URL fragment, which browsers do not send to the server as part of the HTTP request.

