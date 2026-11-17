# Security and privacy

Report a reproducible security problem privately through the repository's security reporting feature where available, or contact the maintainer before sharing private snapshots or credentials. Include the release and environment. Keep tool inputs and outputs out of public reports unless sanitized.

The companion grants only activeTab and scripting after its toolbar action. Snapshots still include descriptors, schemas and URL paths: review exports before sharing. Its confirmation boundary cannot establish the target application's human approval policy.


## Dependency checks

Run `pnpm security:audit` when changing dependencies. CI retains the full dependency reports in its artifacts.

Source 1.0.2 uses Vite 8.3.7 with patched Rolldown for
[GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7).
The former Vite 8.3.6/Rolldown 1.2.16 falls within the maintainer's affected range
even if registry audit findings are zero. The advisory concerns development
servers explicitly exposed to the network, not the deployed Worker. Retain the
default localhost development binding unless network access is intentional.

## Bounded brace tooling

Transitive `braces` imports resolve to the repository-maintained
`@agammann/bounded-braces` package in `vendor/bounded-braces`. It preserves the
upstream MIT license and ordinary glob behavior, while rejecting excessive
brace/parenthesis nesting and cyclic direct AST values before stack exhaustion.
The 64-level safety bound cannot be disabled by caller options. The package
README documents its origin and maintenance requirements. The regular test
command verifies real tooling dependency edges and adversarial inputs.
