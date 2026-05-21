# solution-intel

*The flagship composite archetype. The Solution Intelligence substrate every project adopts first to host its own SIG and run the declarative-SDD loop.*

---

## Status: stub (lifted-when-feature-complete)

**This archetype is named in advance.** The reference implementation (the `wfredricks/solution-intelligence-*` repo family) is still being built. The archetype description on this page will be completed when SI is feature-complete enough to describe as a coherent composite.

**Trigger condition for full lift:**

- `solution-intelligence-identity` — ✅ shipped at `v0.2.0-pre` (Stage 2a + 2b)
- `solution-intelligence-cli` — ✅ shipped at `v0.2.1-pre` (Stages 2a + 2b + 2c)
- `solution-intelligence-graph-client` — ✅ scaffolded at `v0.1.0-pre` (Stage 2c)
- `solution-intelligence-graph` — ⏳ pending Stage 3 (chainblocks → simple-ledger → SI/G)
- Events substrate adopted into SI — ⏳ pending events-spine Stage 2d
- (Future) `solution-intelligence-agents` — ⏳ first agent: Completeness Agent
- (Future) Orchestrator that composes archetypes — ⏳ post-Stage-3

When the first five rows are green, the full lift happens. Estimated 2-3 weeks at current pace.

---

## Description (sketch)

`solution-intel` is the **declarative Solution Intelligence substrate**. Every project that wants to use the declarative-SDD methodology adopts `solution-intel` first. The adoption instantiates a project-local SI: an identity service, a graph store hosting the project's SIG, a CLI for operator workflows, an event substrate, an audit ledger, and (eventually) agents that operate on the SIG.

After adopting `solution-intel`, the project's other archetype adoptions (events-spine, simple-auth, blackboard, etc.) express their contracts as nodes in the project's SIG. The orchestrator (eventually) reads the SIG to compose, verify, and operate.

**`solution-intel` is what every project should want to do first.** It is the substrate that makes the rest of the registry meaningful.

## Composes (sketch — finalized at full lift)

```yaml
composes:
  - simple-auth          # identity, via bangauth
  - simple-ledger        # audit, via chainblocks (Stage 3)
  - events-spine         # eventing (Stage 2d adoption)
  - graph-db             # graph substrate, via polygraph
  - nl-chat-substrate    # NL interface over the SIG
  # Plus solution-intel-specific composition glue:
  #   - cli shell pattern (TBD if this becomes its own archetype)
  #   - graph-client/server split convention
  #   - workspace/config convention
  #   - orchestrator (TBD — its own archetype eventually)
```

The composition is non-trivial. `solution-intel` is the largest composite archetype the registry will likely ever contain.

## When to use

- Any project that intends to operate within the declarative-SDD methodology.
- Any project that needs a Solution Intelligence Graph as its specification artifact.
- Any project that will adopt other archetypes from this registry — they expect a `solution-intel` substrate to host their contracts.

## When NOT to use

- One-off scripts where the overhead of a SIG exceeds the work being done.
- Research code where no archetype-pattern is being applied.
- Projects committed to a different methodology where the SIG framing is incompatible.

## Reference implementation

The canonical reference lives **in-tree** as of 2026-05-21 under `./reference-impl/`. Three of the four substrate pieces are present; the fourth (the graph server) lands at Stage 3.

### Reference-implementation status

| Piece | Status | Path |
|---|---|---|
| `identity` (SI/I) | ✅ in-tree (snapshot of `wfredricks/solution-intelligence-identity` @ 0.2.0-pre) | `./reference-impl/identity/` |
| `cli` (SI CLI) | ✅ in-tree (snapshot of `wfredricks/solution-intelligence-cli` @ 0.2.1-pre) | `./reference-impl/cli/` |
| `graph-client` (SI/G-client) | ✅ in-tree (snapshot of `wfredricks/solution-intelligence-graph-client` @ 0.1.0-pre; scaffold-only) | `./reference-impl/graph-client/` |
| `graph` (SI/G server) | ⏳ pending Stage 3 (chainblocks → simple-ledger → SI/G) | not yet present |

The original `wfredricks/solution-intelligence-*` repos remain as historical artifacts; the in-tree copy is the canonical reference going forward. See `./reference-impl/POINTER.md` for the one-line note.

Each copied subdirectory carries `// @adopt:` markers at every identity-and-deployment value (namespace, project id, default port, service name, audit-log path, CLI binary name, credentials directory, project config path, default endpoint env var, etc.) and at every composition site (identity, audit-ledger, eventing, graph). Adopters work the marker list before declaring the adoption done; the marker comments stay as historical documentation of each choice.

At full lift, a complete `ADOPTION-RECIPE.md` will describe how to derive `./reference-impl/` into a new project. The recipe will be substantially more involved than the simple-auth or events-spine recipes because `solution-intel` is the substrate adoption, not a single-purpose pattern. A sketch is in `./ADOPTION-RECIPE.md` (Task 1 of the SIG-first pivot).

## The recursive moment

When `solution-intel` is fully lifted, **the archetypes registry itself will adopt it.** The registry will instantiate its own SI, load the existing archetype contracts (events-spine's, simple-auth's bookend pair, etc.) as graph nodes in the registry's SIG, and become the first project running on its own substrate.

This is the SIG + SDD + DSD closed loop in concrete form. The substrate hosts the registry that contains the substrate's archetype description. The bootstrapping happened once; from then on, the substrate is self-hosting.

## What lives here now (stub state)

- `ARCHETYPE.md` (this file — sketch)
- `ARCHETYPE.yaml` (sketch metadata; finalized at full lift)
- `reference-impl/POINTER.md` (pointer to the SI repo family)
- No DEFECTS.md / ADOPTIONS.md yet — those land at full lift
- No ADOPTION-RECIPE.md yet — that is the largest piece of work, deferred to full lift

## Cross-references

- **DSD-PRFAQ:** `docs/DSD-PRFAQ.md` — declarative-SDD framing; mentions `solution-intel` as the flagship
- **METHODOLOGY:** `METHODOLOGY.md` §Bookends, §Reference language, §SIG↔archetype tracing
- **The closed loop:** the substrate adopts itself once feature-complete

🖇️ *Stub archetype description. Named in advance to give the registry a destination. Full lift when SI is feature-complete.*
