# COMPOSITION.md

*How composite archetypes are built from other archetypes, and the YAML format that
makes the composition machine-readable.*

---

## What composition means

A **primitive** archetype stands alone: it has one pattern, one contract, one set of
adapters. Example: `simple-auth`. Email goes in, token comes out. No constituent
archetypes.

A **composite** archetype is built from other archetypes. The composite's contract is
the *integration* of its constituents' contracts; the composite's reference
implementation wires the constituents together with composition glue, configuration,
and any necessary translation layer.

Example (forward-looking; this archetype is built in a separate step after this
registry was bootstrapped):

```
events-spine  =  simple-pubsub
              +  simple-subscriber
              +  scribe
              +  mcp-proxy
```

`events-spine` is the *named composition* that downstream services consume; its
constituents are still individually citable archetypes. An adopter of `events-spine`
inherits the discipline of each constituent (their `DEFECTS.md`, their refresh
policies, their controls mappings) plus the composition's own discipline.

Composition is **first-class.** The methodology paper this registry will be cited
from is going to express solutions as expressions over the registry — and composite
archetypes are how those expressions stay small enough to read.

## Why composition matters

A flat registry caps at ~20 entries before it becomes unreadable. With composition,
the surface stays small: a few dozen primitives plus a few dozen named composites
cover most application shapes. The structure is recursive (a composite can compose
other composites), but in practice two layers is usually enough.

Composition also expresses *vocabulary at the right altitude*. Saying "this app is an
events-spine + simple-auth + simple-ledger + nl-chat-substrate" carries more
information than listing the dozen-plus primitives those four imply. Names matter.

## YAML format — `ARCHETYPE.yaml`

Every archetype's directory contains an `ARCHETYPE.yaml` with the following shape:

```yaml
name: <pattern-name>              # required; matches the directory name
kind: primitive | composite       # required
description: >
  <one-paragraph description of the pattern. Plain English. No marketing.>
composes:                         # required for kind: composite; omit or [] for primitive
  - <archetype-name>              # cite by registry name, not library name
  - <archetype-name>
reference_impl:
  in_tree: true | false           # true if reference implementation lives under reference-impl/
  pointer: <repo url or path>     # required when in_tree: false; cite the external repo
adopters:                         # zero-or-more lines describing real adoptions
  - <project-name> (<stage-or-tag>)
defects_known:                    # zero-or-more known defects (mirror DEFECTS.md)
  - <short description>
```

### Field semantics

- **`name`** — the registry name of the pattern. Lower-kebab-case. Must match the
  directory name. Stable: renaming an archetype is a breaking change for every
  adopter.

- **`kind`** — `primitive` if the archetype is self-contained, `composite` if it
  composes other archetypes. There is no third tier.

- **`description`** — a one-paragraph description in plain English. This is the
  one-liner adopters and reviewers see first. Be precise about what the pattern is,
  not what it could be.

- **`composes`** — for composite archetypes, the list of constituent archetypes by
  registry name. Order is informational, not significant. Required for composite;
  omit (or use `[]`) for primitive.

- **`reference_impl.in_tree`** — whether the canonical reference implementation lives
  inside this registry under `reference-impl/`. New archetypes built after this
  registry was bootstrapped (2026-05-21) default to in-tree. Pre-existing archetypes
  whose library already lived elsewhere keep an external pointer.

- **`reference_impl.pointer`** — when `in_tree: false`, the canonical external
  repository URL. When `in_tree: true`, this field is optional and may cite the
  path under `reference-impl/`.

- **`adopters`** — known projects that have adopted this archetype, with their stage
  or tag for traceability. Mirrors `ADOPTIONS.md` (which has more detail).

- **`defects_known`** — short summaries of known defects. Mirrors `DEFECTS.md` (which
  has more detail and remediation status).

## Example — `simple-auth` (primitive, external pointer)

```yaml
name: simple-auth
kind: primitive
description: >
  Email-code authentication: user enters email, receives short-lived code, posts
  code back, gets session token. Token verification via shared HMAC key store.
  State stored as append-only audit entries. Compose-ready primitive for any
  application needing passwordless email-based auth.
composes: []
reference_impl:
  in_tree: false
  pointer: https://github.com/wfredricks/bangauth
adopters:
  - solution-intelligence-identity (Stage 2a, v0.2.0-pre)
  - solution-intelligence-identity (Stage 2b, v0.2.0-pre — X-SI-Actor header retired)
defects_known:
  - X-SI-Actor header shortcut bypasses token verification (fixed in SI/I Stage 2b)
  - Unused createHmac import in adapters/memory-key-store.ts (caught by noUnusedLocals)
  - email.test.ts does not import email.ts — exercises template concepts via inline strings (coverage gap)
  - Naming collision: keys-memory.ts (production) and memory-key-store.ts (test fixture) both export class MemoryKeyStore
```

## Example — `events-spine` (composite, in-tree, forward-looking)

This is what `events-spine/ARCHETYPE.yaml` will look like after step (c) of this
week's build series populates the directory. It illustrates the composite form:

```yaml
name: events-spine
kind: composite
description: >
  Cross-service event substrate. A typed pub/sub bus (simple-pubsub) plus a
  consumer abstraction (simple-subscriber), an append-only audit scribe (scribe),
  and a tool-discovery layer (mcp-proxy). The events spine is what every
  service writes to and reads from when state changes need to be observed,
  replayed, or proxied through MCP tools.
composes:
  - simple-pubsub
  - simple-subscriber
  - scribe
  - mcp-proxy
reference_impl:
  in_tree: true
  pointer: ./reference-impl/
adopters: []
defects_known: []
```

Note that `events-spine`'s `defects_known` is empty at registry birth — the
composite has no adoption history yet — but each of its constituents has its own
`DEFECTS.md` that an adopter must walk. The composition does not erase the
constituents' obligations.

## Composition recipes

When an adopter lifts a composite archetype, the recipe must:

1. Lift each constituent's recipe in turn (or, if the composite ships an integrated
   reference implementation, lift the composite as one unit).
2. Apply the composition glue documented in the composite's `ADOPTION-RECIPE.md`
   (how the constituents wire together — type mappings, configuration handoffs,
   audit pass-through).
3. Run each constituent's defects-check (see `METHODOLOGY.md` §"Defects-fix
   discipline").
4. Log the adoption in the composite's `ADOPTIONS.md` AND in each constituent's
   `ADOPTIONS.md` (an adoption of `events-spine` is also an adoption of
   `simple-pubsub`, `simple-subscriber`, `scribe`, and `mcp-proxy`).

## Status

This file documents the intended composition mechanics. The first composite to land
in this registry will be `events-spine` (step c of the 2026-05-21 build series).
When it lands, the example above is the YAML it will ship with.

The format is pre-1.0; if early adoptions surface a missing field, this file gets
the update first, and the affected `ARCHETYPE.yaml` files follow.
