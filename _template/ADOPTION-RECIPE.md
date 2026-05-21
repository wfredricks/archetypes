# <archetype-name> — Adoption Recipe

*The mechanical steps to derive this archetype into a new project. A sub-agent or
human executor can run this top-to-bottom and produce a working adoption.*

> **TODO:** fill out every section below. Be concrete enough that an executor never
> has to guess — every file path, every command, every test name is named.

---

## Source pinning

> **TODO:** declare the upstream source.
>
> - **Repo:** `<url>`
> - **Commit:** `<full sha>`
> - **Tag (optional):** `<tag or "none — pin to commit">`
> - **Local path (for executors):** `<absolute path>`

## Destination

> **TODO:** declare where the adoption lands in the target repo. Subdirectory, peer
> repo, in-tree, or pure-pointer.

## Files to drop entirely (NOT copied)

> **TODO:** list bangauth-style "do not copy" files with reasons. Every adoption
> has some — the library inevitably has surface area the adopter doesn't want.

## Files copied verbatim

> **TODO:** table of (source path, destination path). Every file in this list gets
> only the provenance header added; no behavioral changes.

## Files copied with modifications

> **TODO:** per-file documentation of every modification. The combined list IS the
> recipe to re-apply on refresh. Be explicit:
>
> - File: `<path>`
> - Modifications:
>   1. <named change 1>
>   2. <named change 2>

## New files (not from upstream)

> **TODO:** files the adoption adds that upstream does not have. Schemas, types,
> integration glue, additional handlers.

## Package / build / config modifications

> **TODO:** `package.json` (or equivalent) changes. Dependencies added or dropped.
> Build config changes. Lint exclusions.

## Adopter's ownership artifact

> **TODO:** the adopter writes an `ARCHETYPE.md` at its project root declaring the
> adoption. Provide the template here.

## Executor phases

> **TODO:** ordered phase list (A, B, C, ...). Each phase has a numbered step list.
> Each step is one command or one file write. Mirror the bangauth → SI/I
> `ARCHETYPE-COPY-PLAN.md` pattern.
>
> ### Phase A: Setup
> 1. ...
>
> ### Phase B: Vendor the archetype
> 2. ...

## Hard constraints

> **TODO:** the non-negotiables for executors. At minimum:
>
> - Do NOT modify the upstream repo.
> - Do NOT skip provenance headers.
> - Do NOT batch source files into one write.
> - Do NOT use `/tmp/` for staging.
> - Surface content-filter blocks explicitly.

## Defects-fix obligation

> **TODO:** reference `./DEFECTS.md` and require executors to walk the list before
> declaring the adoption done. Either fix what applies, or document the knowing
> acceptance in the adopter's `ARCHETYPE.md`.

## Time budget

> **TODO:** target wall-clock. Soft + hard caps.

## Output expected at the end

> **TODO:** the deliverables checklist the executor verifies before stopping.
