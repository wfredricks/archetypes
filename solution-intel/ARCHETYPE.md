# solution-intel

*The flagship composite archetype. The Solution Intelligence substrate every project adopts first to host its own SIG and run the declarative-SDD loop.*

---

## Status: draft

**Graduated from `stub` → `draft` on 2026-05-22.** The first non-substrate surface (agents) shipped at `v0.1.0-pre` via the asi adoption; the archetype now carries enough reference-impl shape to be drafted, but not enough to be lifted to `released`. The full-lift threshold is unchanged — it requires Stage 3 (SI/G server) plus the orchestrator.

**Trigger conditions:**

- `solution-intelligence-identity` — ✅ shipped at `v0.2.0-pre` (Stage 2a + 2b)
- `solution-intelligence-cli` — ✅ shipped at `v0.2.1-pre` (Stages 2a + 2b + 2c)
- `solution-intelligence-graph-client` — ✅ scaffolded at `v0.1.0-pre` (Stage 2c)
- Events substrate adopted into SI — ✅ events-spine Stage 2d shipped 2026-05-21
- `solution-intelligence-agents` — ✅ shipped at `v0.1.0-pre` (Phase 1b, 2026-05-22): CompletenessAgent + BookendAuditAgent
- `solution-intelligence-graph` — ⏳ pending Stage 3 (chainblocks → simple-ledger → SI/G)
- (Future) Orchestrator that composes archetypes — ⏳ post-Stage-3

When `solution-intelligence-graph` lands the archetype graduates from `draft` → `released` (and the orchestrator follows on its own cadence).

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

## Agents (draft surface)

As of v0.1.0-pre the archetype ships two pure-read agents in
`./reference-impl/agents/`. Both observe the SIG and emit reports;
neither mutates the graph.

### CompletenessAgent

Walks the SIG for one namespace and emits findings about gaps.
Operators should run it at least weekly during active development.

| Rule id | Severity | When it fires |
|---|---|---|
| `completeness:hypothesis-open` | info | Hypothesis `status='open'` (expected pre-adoption) |
| `completeness:hypothesis-partial` | warn | Hypothesis `status='partial'` (incomplete evidence) |
| `completeness:hypothesis-violated` | error | Hypothesis `status='violated'` |
| `completeness:hypothesis-stale` | warn | `status='held'` but `verifiedAt` is null OR > 90 days old |
| `completeness:contract-no-hypotheses` | warn | Contract has zero `DECLARES_HYPOTHESIS` edges |
| `completeness:dataobject-orphan` | info | DataObject has no incoming `OWNS` / `PRODUCES` edge |
| `completeness:service-no-process` | info | Service exists with no associated Process |

### BookendAuditAgent

For a given archetype, regenerates the right-bookend snapshot from
current SIG state and diffs it against the committed
`RIGHT-BOOKEND-snapshot-*.md` in the `archetypes` repo. Reports drift;
does NOT commit a refreshed snapshot.

| Rule id | Severity | When it fires |
|---|---|---|
| `bookend-audit:missing-snapshot` | error | No `RIGHT-BOOKEND-snapshot-*.md` for this archetype |
| `bookend-audit:hypothesis-added` | warn | Hypothesis in SIG but not in committed snapshot |
| `bookend-audit:hypothesis-removed` | error | Hypothesis in committed snapshot but not in SIG |
| `bookend-audit:status-drift` | warn | Status differs between SIG and committed snapshot |
| `bookend-audit:verifiedAt-drift` | info | `verifiedAt` differs |
| `bookend-audit:in-sync` | info | Committed snapshot matches SIG perfectly |

Adopters wire both agents into their CLI's `agents` command group
(see the asi reference adoption's `cli/src/commands/agents.ts` for the
shape). Bookend-audit can also run from CI on a schedule to catch
out-of-band SIG writes.

## When to use

- Any project that intends to operate within the declarative-SDD methodology.
- Any project that needs a Solution Intelligence Graph as its specification artifact.
- Any project that will adopt other archetypes from this registry — they expect a `solution-intel` substrate to host their contracts.
- Any project that wants automated SIG-walk reports from its first day of operation.

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
| `agents` (SI agents) | ✅ in-tree (snapshot of `wfredricks/archetypes-solution-intelligence/agents/` @ 0.1.0-pre; Phase 1b, 2026-05-22) | `./reference-impl/agents/` |
| `graph` (SI/G server) | ⏳ pending Stage 3 (chainblocks → simple-ledger → SI/G) | not yet present |

The original `wfredricks/solution-intelligence-*` repos remain as historical artifacts; the in-tree copy is the canonical reference going forward. See `./reference-impl/POINTER.md` for the one-line note.

Each copied subdirectory carries `// @adopt:` markers at every identity-and-deployment value (namespace, project id, default port, service name, audit-log path, CLI binary name, credentials directory, project config path, default endpoint env var, etc.) and at every composition site (identity, audit-ledger, eventing, graph). Adopters work the marker list before declaring the adoption done; the marker comments stay as historical documentation of each choice.

At full lift, a complete `ADOPTION-RECIPE.md` will describe how to derive `./reference-impl/` into a new project. The recipe will be substantially more involved than the simple-auth or events-spine recipes because `solution-intel` is the substrate adoption, not a single-purpose pattern. A sketch is in `./ADOPTION-RECIPE.md` (Task 1 of the SIG-first pivot).

## The recursive moment

When `solution-intel` is fully lifted, **the archetypes registry itself will adopt it.** The registry will instantiate its own SI, load the existing archetype contracts (events-spine's, simple-auth's bookend pair, etc.) as graph nodes in the registry's SIG, and become the first project running on its own substrate.

This is the SIG + SDD + DSD closed loop in concrete form. The substrate hosts the registry that contains the substrate's archetype description. The bootstrapping happened once; from then on, the substrate is self-hosting.

## What lives here now (draft state)

- `ARCHETYPE.md` (this file — sketch with agents drafted)
- `ARCHETYPE.yaml` (sketch metadata; finalized at full lift)
- `reference-impl/POINTER.md` (pointer to the SI repo family)
- `reference-impl/{identity, cli, graph-client, agents}/` — four of five substrate pieces in-tree
- No DEFECTS.md / ADOPTIONS.md yet — those land at full lift
- `ADOPTION-RECIPE.md` sketch; full recipe deferred to full lift

## Cross-references

- **DSD-PRFAQ:** `docs/DSD-PRFAQ.md` — declarative-SDD framing; mentions `solution-intel` as the flagship
- **METHODOLOGY:** `METHODOLOGY.md` §Bookends, §Reference language, §SIG↔archetype tracing
- **The closed loop:** the substrate adopts itself once feature-complete

🖇️ *Stub archetype description. Named in advance to give the registry a destination. Full lift when SI is feature-complete.*
