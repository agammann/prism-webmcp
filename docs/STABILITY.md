# Prism v1 stability contract

Prism v1 is a local JSON evidence dashboard and an optional unpacked Chromium companion. Its dashboard needs no account, key or database. Schema version 1 and the documented legacy inputs are retained. The five page tools use the same state transitions as the visible controls.

Evaluation is conditional on supplied evidence; a score does not certify a target's behavior. Built-in examples remain synthetic. State exists only in the open dashboard tab; preserve the original snapshot and downloaded report before closing it. Exported reports can be stale and do not replace the original snapshot.

The companion is installed from the exact release ZIP, loaded unpacked from a retained folder, and used only on authorized pages. It has no background worker, broader host permissions or automatic calls. Only the latest selected run contributes evidence. Navigation and popup closure discard run history. There is no recovery of unsaved tab or popup state.

Native WebMCP is experimental. The release CI checks the dashboard and loaded companion against pinned Chrome for Testing 154.0.8037.92 and 155.0.8059.12. Ordinary dashboard controls work without native WebMCP. A different browser revision needs its own compatibility check before relying on native execution.

Keep old source and extension folders when upgrading. Save snapshots and reports, stop the local preview, extract the new release into a new folder, verify checksums, install with the frozen lockfile and rebuild. Reload the unpacked extension from the new folder. To roll back, stop the new preview and run the retained old folder; restore the old unpacked extension folder. The dashboard has no persistent data migration.

The source is MIT licensed; dependencies keep their own licenses. Hosted delivery requires a separate check against the exact published source.
