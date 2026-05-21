# simple-ledger

*Append-only audit ledger with verifiable block chaining.*

> **STATUS: stub** — this archetype's name is reserved. Full description, recipe,
> defects log, and adopters log will be lifted when **Stage 3 (chainblocks → SI/G)
> ships**. The pattern is already in use (SI/I composes it via `src/audit.ts`)
> but no adoption has gone through the recipe-file build discipline yet.

---

## Description (preview)

An append-only audit ledger: each event is hashed into a block, blocks chain by
the previous block's hash, and the ledger is replayable from any point. State
mutation is forbidden — corrections happen by appending a compensating event.
Used as the audit-trail substrate beneath every state-changing operation in SI
services.

## Reference implementation

External pointer — see [`./reference-impl/POINTER.md`](./reference-impl/POINTER.md).

Canonical: [`wfredricks/chainblocks`](https://github.com/wfredricks/chainblocks).

## Trigger condition for full lift

When **Stage 3 (chainblocks → SI/G)** ships — i.e. the first formal adoption of
chainblocks under the recipe-file build discipline — this directory gets:

- Full `ARCHETYPE.md` (description, when-to-use, anti-triggers, composition,
  reference impl, recipe, defects, adopters)
- `ARCHETYPE.yaml`
- `ADOPTION-RECIPE.md`
- `DEFECTS.md` (seeded from the SI/I `src/audit.ts` integration findings)
- `ADOPTIONS.md` (initial entry: SI/G Stage 3)
