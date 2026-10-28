# shadcn stylesheet

This is the unchanged `dist/tailwind.css` from the official npm package
`shadcn@4.21.0`, distributed under the adjacent MIT license.

- Upstream: https://github.com/shadcn-ui/ui/tree/main/packages/shadcn
- Package: https://registry.npmjs.org/shadcn/-/shadcn-4.21.0.tgz
- SHA-256 (`tailwind.css`): `bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a`

The application needs these styles, not the scaffolding CLI. Keeping this exact
stylesheet asset locally removes the CLI's unrelated MCP/Express/deepmerge dependency
chain without changing the generated components or stylesheet. At remediation
time the npm audit suggested deepmerge 4.3.2, but the official registry's latest
was 4.3.1 and GHSA-gcqx-w48m-w2h4 reported no patched release.

Maintainers own updates to this stylesheet: compare future official versions,
preserve the license, update the integrity test, and verify generated CSS and
browser behavior. If component scaffolding is needed again, deliberately select
a CLI version with a clean dependency audit in a separate maintenance change;
do not reinstall the unpatched CLI or suppress its advisory.
