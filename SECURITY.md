# Security and dependency status

Report a reproducible security problem privately through the repository's security reporting feature where available, or contact the maintainer before sharing private snapshots or credentials. Include the release and environment. Keep tool inputs and outputs out of public reports unless sanitized.

## Accepted unpatched dependency

The v1 release applies the available source-map-js 1.2.2, tinypool 2.1.2 and sharp 0.35.5 updates. Its full dependency audit still reports one high-severity advisory: braces 3.0.3, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Prism's observed finding is classified `dev:false`: Vinext is a production dependency. The same installed package also appears through shadcn and ts-morph build tooling. That classification is retained; the finding is not dismissed as development-only or claimed harmless.

At release preparation, the reviewed primary advisory contains no fixed version and the registry's latest release is 3.0.3. The audit feed suggests >=3.0.4, which is not published. The maintainer accepted this specific remaining finding after all available patches were installed.

`pnpm security:audit` saves the full raw audit and checks only that exact version, advisory, severity, classification and three dependency paths against fresh primary advisory and registry metadata. Additional or changed findings, malformed metadata, or a possible patch becoming available fail the policy. An unfiltered `pnpm audit --json` still exits 1 for the accepted finding. A passing policy does not mean an audit with no findings.

The companion grants only activeTab and scripting after its toolbar action. Snapshots still include descriptors, schemas and URL paths: review exports before sharing. Its confirmation boundary cannot establish the target application's human approval policy.
