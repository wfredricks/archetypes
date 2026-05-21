# METHODOLOGY.md

*How an archetype gets recognized, named, codified, and adopted under the
declarative-software discipline.*

---

## The archetype methodology

An archetype is **third-party code (or first-party code from a separate project)
brought into a target repo whole-cloth and adopted with full local ownership** —
*not* imported as a runtime dependency.

The methodology has four phases:

1. **Recognize.** A pattern shows up in three or more places. Not "any library you
   use" — only the patterns that keep recurring across unrelated projects, that you
   keep wanting to own, that you keep wanting to fork. The bar is *evidence of
   repeat use*, not aesthetic preference.

2. **Name.** Give the pattern a name in this registry. The name is the *pattern*,
   not the *library*. `simple-auth`, not `bangauth`. The library is one instance of
   the pattern; future libraries may satisfy the same contract under the same name.

3. **Codify.** Write the archetype's description, recipe, defects log, and
   composition (if applicable) into this registry. The description is what the
   pattern *is*; the recipe is *how to adopt it*; the defects log is *what to fix
   when you adopt it*; the composition is *what it's built from*.

4. **Adopt deliberately.** Each adoption is a one-time copy operation against the
   recipe. Provenance headers go on every adapted file. Documented modifications
   are the diff to re-apply on refresh. The adoption is logged in `ADOPTIONS.md`.

### Case study: `bangauth` → `simple-auth` → `solution-intelligence-identity`

The first archetype lifted into this registry is `simple-auth`. The pattern is
email-and-code passwordless authentication with monthly-rotating HMAC tokens; the
reference implementation is the `wfredricks/bangauth` library; the first adoption
is `solution-intelligence-identity` Stage 2a (2026-05-20). The adoption was driven
by `BUILD-STAGE-02A-PLAN.md` (a recipe-file build — see §"Recipe-file builds"
below) and produced both working code and findings that fed back into the
methodology. The same plan-build-findings loop ran again as Stage 2b (X-SI-Actor
retirement, 2026-05-20) and Stage 2c (graph-client scaffold + harness lift,
2026-05-21). Three stages, three findings files, one deepening understanding.

This registry was bootstrapped on **2026-05-21** to give that practice a home and a
vocabulary.

## Marking conventions

The audit trail *is* the methodology. An adopted file declares its provenance and
its modifications. There are three categories of markings.

### File-level: JSDoc / docstring headers

Every adapted source file carries a top-of-file JSDoc (or language-equivalent
comment block) declaring:

- The upstream repo URL
- The upstream commit hash (exact, not a tag — tags are mutable)
- The upstream source path
- The pattern being adopted (cite the archetype name in this registry)
- Maintenance ownership (who watches CVEs / refreshes from upstream)
- The list of modifications from upstream (this is the diff to re-apply on refresh)

Example (from `solution-intelligence-identity/src/auth/token.ts`):

```ts
/**
 * Adapted from bangauth — https://github.com/wfredricks/bangauth
 * Source commit: 3ae510649b2450c71099ab1e43d9350bc11d7087
 * Source path: src/token.ts (bangauth v0.1.1)
 *
 * Pattern: HMAC-SHA256 deterministic tokens with monthly key rotation.
 * Adapted for: SI/I identity service, v0.1.
 *
 * Maintenance ownership: SI core team. CVE watch on node:crypto.
 * Upstream refresh policy: review at every SI minor version bump.
 *
 * Modifications from upstream:
 *   - TokenPayload.constellationId renamed to TokenPayload.projectId
 *   - All other behavior preserved
 */
```

Files copied verbatim still get the header, with `Modifications from upstream: none —
copied verbatim`.

### Test-level: test headers

Adapted tests carry a header citing the upstream test path and any modifications
(e.g. assertion renames). When a test exercises behavior that the adaptation
changed, document it.

### Doc-level: `ARCHETYPE.md` / `ARCHETYPE.yaml` in the adopter

Every adopting project carries an `ARCHETYPE.md` (and ideally an `ARCHETYPE.yaml`)
at the project root declaring:

- Which archetypes it has adopted (cite this registry by name)
- What library instance(s) it was sourced from
- The commit pin
- The adoption date and stage
- The list of file-level modifications (the recipe to re-apply on refresh)
- The refresh policy and emergency-refresh triggers
- Intended controls satisfied (NIST 800-53 or whatever compliance framework applies)

The adopter's `ARCHETYPE.md` is the *project-local* twin of this registry's
description. They cross-reference each other.

### What does NOT get marked

- **Referenced concepts.** If your code *talks about* a pattern (e.g. mentions
  "events spine" in a comment, imports a type with the name `EventEnvelope`) but
  did not *derive content from* the archetype, no marking is required. Markings
  follow code lineage, not vocabulary.
- **Standard-library or well-known runtime APIs.** No one tags `node:crypto` as an
  archetype.
- **Generic dependencies.** Stuff you `npm install` and use unmodified. That's a
  dependency, not an archetype.

## Anti-triggers — when NOT to archetype

Not every pattern belongs in this registry. Resist the temptation to archetype:

1. **Implementation-value libraries.** If a library's whole value is its
   implementation (e.g. a CSS framework, a query optimizer, a video codec), you
   want it as a dependency. The cost of forking is the cost of maintaining the
   implementation forever. Archetype the *contract*, dependency the *engine*.

2. **Large surface area without a clear contract.** If you can't describe the
   pattern in three paragraphs, it's not an archetype yet. Either narrow it (lift
   a sub-pattern) or wait for clarity.

3. **Fast-moving upstreams without an AI substrate.** Archetypes assume you can
   afford to refresh — re-copy + re-apply modifications — at every upstream
   release. Without AI-assisted code work, that's prohibitive. With AI, it's
   roughly the cost of `npm update`.

4. **Patterns you're using once.** Repeat use is the trigger. Use it twice; talk
   about it. Use it three times; archetype it.

5. **Patterns whose upstream you already control end-to-end.** If you own the
   library, the project, and the team, just use it directly. Archetype is for
   crossing ownership boundaries with sovereignty.

## Defects-fix discipline

The archetype is born once, but its quality compounds across adoptions.

**Every adoption inherits an obligation:** before declaring the adoption done,
walk the upstream defects log (`DEFECTS.md` in this registry) and fix what
applies, OR document why this adoption knowingly accepts the defect.

**Every adoption discovers new defects.** The recipe-file build pattern
(`BUILD-STAGE-NN-PLAN.md` + `BUILD-STAGE-NN-FINDINGS.md`) is how those surface.
The findings file from each stage must list every defect encountered during
adoption (typos, dead code, unclear behavior, missing guard rails, etc.). Each
new defect either gets fixed locally (and noted) or gets escalated to the
upstream library and noted as outstanding.

**Defects flow back into the registry.** When the next adoption starts, the
registry's `DEFECTS.md` is the up-to-date list. The methodology only works if
adopters maintain this discipline. Skipping the defects log breaks the
compounding-quality property.

Example (lifted from `solution-intelligence-identity` Stage 2a findings):

- Unused `createHmac` import in `bangauth/src/adapters/memory-key-store.ts` —
  caught by SI/I's `noUnusedLocals`; removed locally; flagged for upstream patch.
- Naming collision: bangauth had two files both exporting `MemoryKeyStore`
  (`keys-memory.ts` production, `memory-key-store.ts` test fixture). The Stage 2a
  recipe initially called to drop the test-fixture file; the executor kept both
  on the floor because the test fixture is load-bearing for `token.test.ts`.
  Flagged for upstream rename.
- `bangauth/src/__tests__/email.test.ts` does not actually import `email.ts`
  (real coverage gap: the test exercises *template concepts* via inline strings).
  Flagged for upstream patch.

Each of these becomes an entry in `simple-auth/DEFECTS.md` for the next adopter to
inherit.

## Recipe-file builds

The `BUILD-STAGE-NN-PLAN.md` → executor → `BUILD-STAGE-NN-FINDINGS.md` pattern is
itself an archetype-grade discipline (one that will likely get its own slot in this
registry eventually). It is the mechanical loop adoptions run inside:

1. **PLAN.md** is the load-bearing recipe. Every file action is concrete and
   deterministic. No design decisions at execute time — those were made when the
   plan was written. The plan cites this registry (the archetype it's adopting
   and the recipe).

2. **The executor** (a sub-agent under OpenClaw or a human following the plan)
   runs the recipe literally. Where the recipe drifts from reality, the executor
   makes a *judgment call* (one-line, low-stakes) and surfaces it in findings.

3. **FINDINGS.md** captures what shipped, what worked smoothly, what surprised,
   wall-clock per phase, recommendations for the next stage, and a
   hard-constraints compliance check.

Three findings files from the SI runtime case study (Stages 2a, 2b, 2c) are the
working examples. Their lessons feed back here, into `METHODOLOGY.md` and into
the per-archetype `DEFECTS.md` files.

The recipe-file build is not the only way to adopt an archetype — small adoptions
can be done conversationally — but it is the way to adopt one *reliably and
inspectably at human-of-record scale*. When in doubt, write the recipe.

## Maintenance discipline

Archetypes only work if their owners maintain them.

- **Refresh policy.** Every adopter declares a refresh policy in its
  `ARCHETYPE.md` (e.g. "review upstream at every minor version bump"). Without a
  policy, the archetype rots.
- **Emergency-refresh triggers.** Critical CVEs, security advisories, or
  upstream features that materially change the archetype's value. Adopters watch
  for these.
- **Maintenance ownership.** Every adopter names a maintainer. "We" doesn't
  scale; "@username" does.
- **Refresh procedure.** Pin new upstream commit → whole-cloth re-copy to a
  staging directory → re-apply documented modifications → diff against current
  → adopt or reject each change → replace → run tests → bump version. Documented
  in this registry per-archetype in `ADOPTION-RECIPE.md`.

Skipping maintenance is the failure mode that turns a clean archetype into dead
code. The methodology is non-negotiable on this point.

## Bookends

Every archetype — native or lifted — gets a **pair of bookend artifacts** that bracket the work.

### What a bookend is

A bookend is a structured commitment-or-comparison document. The **left bookend** is written *before* the build and captures intent, scope, principles, constraints, services, hypotheses. The **right bookend** is written *after* the build (or after the first adoption) and compares each hypothesis from the left bookend against what actually happened.

Bookends are the discipline that forces the writer to commit to a hypothesis before discovering whether reality agrees. They are the structural counterpart to story-papers: where stories make the *picture* visible, bookends make the *commitments* visible.

### Two files per archetype

- **`LEFT-BOOKEND.md`** — the spec. Principles, Constraints, Services, Processes, DataObjects, Compositions, hypotheses to test.
- **`RIGHT-BOOKEND.md`** — the comparison. One pass per hypothesis: held, partially held, violated. Surprises (things not in the left bookend that emerged). Updates the right bookend triggers.

For native archetypes, both bookends are written in sequence: left before code, right after first adoption.

For lifts (archetypes adopted into the registry after the work was already done), the bookends are **retroactive**. The right bookend is grounded in artifacts (FINDINGS, build plans, git history); the left bookend is reconstructed from those artifacts and is honest about what could and could not be recovered. See `simple-auth/LEFT-BOOKEND.md` for the first example.

### Companion: story-papers

For archetypes that warrant it, a **`STORY.md`** sits beside the bookends — a story-paper that frames the archetype as a lived experience. `events-spine/STORY.md` is the first example (the market-square + newspaper-reporter framing). Stories are optional; bookends are mandatory.

Stories surface insights bookends miss. The events-spine STORY surfaced four SIG ontology gaps (posture, contract direction, workflow cadence, temporal coupling) that the structural framing of a left bookend alone would not have made visible. The story / bookend pair complements: the story renders the architecture as lived experience; the bookend captures the commitments.

### Lifecycle: native vs. lift

**Native archetype lifecycle** (the canonical discipline):

1. STORY.md — if a metaphor or lived-experience framing pays its rent
2. LEFT-BOOKEND.md — spec; principles, constraints, services, hypotheses
3. BUILD-RECIPE.md — mechanical recipe for the sub-agent
4. Reference implementation — sub-agent execution against the recipe
5. First adoption (a real consuming project, e.g. SI/I)
6. RIGHT-BOOKEND.md — compare hypotheses against reality
7. DEFECTS.md update — fold defects discovered during adoption back

**Lift lifecycle** (for archetypes recognized post-hoc):

1. Identify the upstream library (existing reference implementation)
2. Identify the first adoption (existing consuming project)
3. ARCHETYPE.md, ARCHETYPE.yaml, ADOPTION-RECIPE.md, DEFECTS.md, ADOPTIONS.md (registry boilerplate)
4. **Retroactive bookends** — right bookend grounded in artifacts; left bookend reconstructed and honest about gaps
5. DEFECTS.md back-fill — review any FINDINGS files from the prior work for defects that belong in DEFECTS.md

### What bookends are NOT

- They are not summaries of FINDINGS files. FINDINGS files report what a sub-agent did; bookends report what an archetype IS and DID.
- They are not pitches or PR. They are honest about deferred items, surprises, violated principles, and untested hypotheses.
- They are not optional. Native archetypes that ship without bookends are *not following the methodology*; that is a regression to be corrected.
- They are not static. The right bookend may trigger updates to the left bookend (or to the archetype itself); both are living documents until the archetype is retired.

### Cost of skipping the discipline

If an archetype is built without a left bookend, the right bookend has no anchor for comparison. We saw this with simple-auth: the lift was done without a formal left bookend; the retroactive reconstruction lost the *alternatives considered* (what was almost chosen and why it was rejected) and the *scope-of-deferred* commitments (which deferrals were planned vs. emerged during the work). Future native archetypes pay this cost zero. Skipping the discipline pays the cost forever.

---

## Reference language

Every archetype in this registry has a **reference-language implementation** —
the canonical form against which all other-language translations are verified.

**The reference language is TypeScript.**

### Why TypeScript

The reference language must accommodate idioms from any major target language so
translations can map cleanly in either direction. TypeScript covers all three
paradigms a real registry will need to translate to:

- **Functional** (idiomatic in Haskell, OCaml, F#, modern JS, parts of Rust)
- **Object-oriented** (Java, C#, Python, Ruby, parts of Swift)
- **Procedural** (Go, C, older Fortran/Pascal lineages, parts of Rust)

TypeScript can express each of these patterns natively. Picking Python would have
biased the registry toward dynamic-OOP; picking Go would have biased toward
procedural-with-light-OOP; picking Haskell would have biased toward pure-functional.
TypeScript is multi-paradigm by design, and *the reference language's paradigm
biases bleed into every translation*.

The choice is reversible at significant cost. If a future archetype proves
TypeScript can't express its pattern cleanly, that archetype's reference can
be an exception; we don't re-base the whole registry.

### What "reference-language implementation" means

For each archetype:

1. The reference-impl in TypeScript IS the canonical specification.
2. Tests for the archetype run against the TypeScript reference and must pass.
3. Translations into other languages (Go, Python, Rust, Java, etc.) are
   *transpositions* of the reference, verified against translated test suites.
4. The archetype's `ARCHETYPE.yaml` may eventually declare
   `reference_language: typescript` and list `available_translations`.

### How the orchestrator uses this

The DSD orchestrator (when built) operates as a **graph compiler** in three passes:

1. **SIG-to-composition pass** (deterministic graph traversal): identify
   archetypes via SIG trace edges (see next section), compute the composition
   graph from `composes:` declarations.
2. **Composition-to-reference-language pass** (LLM + sub-agents): derive each
   archetype's TypeScript reference-impl into the target project; generate
   integration glue between archetypes; verify against contract test suites.
3. **Reference-language-to-target-language pass** (LLM, optional): transpose
   from TypeScript to Go, Python, Rust, etc.; verify against translated tests.

Each pass has a clear contract and is independently verifiable. The reference
language is the trusted intermediate; the target language is a transposition.

---

## SIG ↔ archetype tracing

DSD does not stand alone (see DSD-PRFAQ.md §Terminology). It pairs with **SIG**
(Solution Intelligence Graph) and **SDD** (SIG-Driven Development) in a closed
loop. This section defines the graph schema that bridges them.

When a SIG describes a solution and the orchestrator needs to compose its
substrate from this registry, the orchestrator traverses **trace edges** from
SIG nodes to Archetype nodes. The edges declare *which archetype realizes which
part of the SIG.*

### Trace-edge ontology

Four edge types from SIG nodes to Archetype nodes:

| Edge type | SIG node label | Semantics |
|---|---|---|
| `REALIZED_BY` | `Capability` | The capability's runtime behavior is provided by this archetype. |
| `SATISFIED_BY` | `Requirement` | The requirement is met by adopting this archetype. |
| `EXPOSED_BY` | `Interface` | The interface to external systems is exposed by this archetype. |
| `INFORMED_BY` | `Theme` | The theme's design constraints shape the choice of this archetype. |

Plus the existing intra-registry edge type:

| Edge type | Source | Target | Semantics |
|---|---|---|---|
| `COMPOSES` | `Archetype` | `Archetype` | The source composite archetype is built from the target primitive(s). See `COMPOSITION.md`. |
| `ADOPTED_IN` | `Archetype` | `Project` | An adoption record. Equivalent to `ADOPTIONS.md` entries in graph form. |

### Why this is in METHODOLOGY.md and not in the SIG paper

The trace edges are a contract between two methodologies. The SIG paper defines
SIG's internal ontology (Capability, Requirement, Evidence, etc.); this registry
defines what an Archetype node is. The *bridge* between them — the trace edges —
deserves to live in the registry because the registry is what gets traversed when
the orchestrator does the SIG-to-composition pass.

The SIG paper will reference back to this section when it discusses the closed
loop.

### What this enables

Once SIG nodes have trace edges to Archetype nodes, the orchestrator's first pass
is a deterministic graph query:

1. Walk the SIG, collect all archetypes referenced by trace edges.
2. For each composite archetype, expand its `composes:` declaration into the full
   primitive set.
3. Emit the composition graph.

No LLM judgment is required in this pass. The LLM's contribution begins in pass 2
(generating integration glue between archetype boundaries) and pass 3 (target-
language transposition, if requested).

This is what makes the orchestrator a *graph compiler* rather than an oracle.

---

## Why archetype at all

The AI-assisted-coding era flipped the convenience-vs-control tradeoff. Pre-AI,
the cost of forking and maintaining your own copy of a library was prohibitive,
so you took the dependency. Post-AI, the cost of *refreshing* a forked archetype
— re-copy + re-apply documented modifications — is comparable to the cost of
`npm update`. The historical trade is no longer the right trade for
security-critical or sovereignty-critical components.

Archetypes give you:

- **ATO / FedRAMP scope reduction.** Each runtime dependency expands the
  supply-chain attestation surface. Archetypes collapse that into your own code
  with documented provenance.
- **Sovereignty.** Identity, audit, ledger, graph, message-bus — these are the
  parts you should not be inheriting someone else's roadmap for.
- **Composable vocabulary.** Once patterns have names, solutions get expressed
  as "compose these archetypes." That is the substrate the declarative-software
  methodology will run on.

The cost is the discipline. This file is the discipline.
