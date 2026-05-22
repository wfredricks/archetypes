# solution-intel reference-impl

*Snapshot of the **solution-intel** archetype's complete reference
implementation. Adopters clone this tree, replace `@adopt:` markers
with their own values, and have a runnable substrate.*

🖇️ Provenance: lifted on 2026-05-22 from the **asi** adoption profile
(`wfredricks/archetypes-solution-intelligence`) at commit
`195096307965d7ccd1a5ddac5da1b09db6b77b60`. See `POINTER.md` for the
detailed manifest.

---

## What this is

A complete, end-to-end reference implementation of the `solution-intel`
composite archetype. Every adopter starts from a copy of this tree.

The substrate composes:

- **`identity/`** — passwordless email-and-code auth + 5-role grant
  ledger (derived from `simple-auth`)
- **`cli/`** — the operator command-line interface
- **`contract-loader/`** — parses LEFT-BOOKEND.md files into the SIG
  ontology and commits them to PolyGraph
- **`graph-client/`** — typed HTTP client for the SIG store
- **`agents/`** — pure-read agents that walk the SIG and emit findings
  (CompletenessAgent + BookendAuditAgent)
- **`scripts/`** — adoption-level ops scripts (seed, load, query,
  snapshot, writeback)
- **`graph-db`** — PolyGraph (Neo4j) at the adopter's Bolt endpoint
  hosting the SIG

Composition seams are identified by `@adopt:composes:*` markers in the
source. Run `grep -rn "@adopt:" .` to enumerate every customizable
value.

## Adopting

See the parent archetype's `ADOPTION-RECIPE.md` for the full
step-by-step adoption flow. The high-level shape:

1. Copy this `reference-impl/` directory into your adoption repo.
2. Replace `@adopt:` markers (literal `'@adopt:...'` strings in scripts,
   and `// @adopt:` comment markers in code) with adopter-specific values.
3. `npm install` at the root and in each subpackage; resolve any
   `@solution-intelligence/<pkg>` references to the adopter's preferred
   scope (the file-relative paths in subpackage `package.json` files
   should work as-is when the lift preserves the directory layout).
4. Seed the SIG with `npm run seed`.
5. Load the archetype contracts with `tsx scripts/load-contracts.ts`.
6. Drive the operator surface with the CLI (`<binary> contracts list`,
   `<binary> agents completeness run`, etc.).

The asi adoption (referenced under Provenance above) is the canonical
worked example. Its `ADOPTION-FINDINGS.md` records what the first
adopter learned.

## What's NOT in this tree

- `node_modules/`, `dist/`, `coverage/` — adopters generate these.
- `package-lock.json` at adopter scope — regenerated on first
  `npm install`.
- Adopter-specific environment configs (`.env`, secrets) — never
  committed.

## License

Apache-2.0. See `LICENSE`.
