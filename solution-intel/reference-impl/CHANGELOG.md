# Changelog (reference-impl template)

This CHANGELOG tracks releases of the **solution-intel** archetype's
reference implementation. Adopter copies replace this file with their
own adoption-level changelog.

## [Unreleased]

## [2026-05-22b] — Phase 1c lift

- **Added** `contract-loader/` package (new). Parses LEFT-BOOKEND.md
  files into the SIG ontology and commits them to PolyGraph. Surface:
  `parseBookend`, `commitContract`, `verifyContract`, `listContracts`,
  `showContract`.
- **Harmonized** `Hypothesis.verifiedAt` storage type. Canonical wire
  type at the contract-loader boundary is now ISO-8601 string; writers
  coerce via `coerceVerifiedAtForWrite`, readers normalize via
  `normalizeVerifiedAtForRead`. Downstream layers see `string | null`.
- **Re-lifted** `cli/`. Adds `cli/src/commands/contracts.ts` and
  `cli/src/commands/agents.ts` command groups; `cli.ts` registers them.
  F1 status+verifiedAt render in `contracts show` confirmed.
- **Re-lifted** `identity/`. F4 fix lifted directly: `tsconfig.eslint.json`
  pins `compilerOptions.rootDir = "."`; `token.test.ts` carries the
  one-line narrowing guard.
- **Lifted** `scripts/`. Eight ops scripts (seed, load, query, snapshot,
  agent runner, two writebacks, verify). All adopter values converted
  to `'@adopt:...'` placeholder literals.
- **Lifted** workspace metadata (root `package.json`, README, LICENSE,
  this CHANGELOG) as template versions. The asi adoption's
  ADOPTION-FINDINGS remains canonical-by-reference in
  `solution-intel/ARCHETYPE.md`.

## [2026-05-22] — Phase 1b agents lift

- Initial lift of `agents/` (CompletenessAgent + BookendAuditAgent).

## [2026-05-21] — Initial reference-impl

- Initial in-tree snapshot of `identity/`, `cli/`, `graph-client/` with
  `@adopt:` markers inserted.
