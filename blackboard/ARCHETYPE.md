# blackboard

*Opportunistic multi-agent coordination over a shared structured workspace. Hearsay-II's pattern, named for declarative software development.*

> **STATUS: stub — design-document-only.** The architectural pattern is named
> and described. No library or reference implementation exists yet. The
> first instance is planned for the `code-explorer` blackboard inside
> `solution-intel` (the dla-stores adoption is the first target). Adopters
> who reference `blackboard` today are referencing the *pattern*, not a
> running library.

---

## Description

A blackboard is a **shared, structured workspace** where multiple **Knowledge
Sources** (agents, human or machine) collaborate on a partially-specified
problem. Each Knowledge Source watches the workspace for patterns matching its
expertise, contributes its piece, and watches for changes from peers. A
**Control** component decides which Knowledge Source to invoke next based on
what is currently on the workspace and what each Knowledge Source could
contribute. Solutions emerge from cumulative contribution — no single agent has
the whole answer.

The canonical AI use of this pattern is Hearsay-II (Erman, Hayes-Roth, Lesser,
Reddy, 1980), where speech-understanding decomposed into independent
Knowledge Sources collaborating on a multi-level Blackboard. The pattern
applies generally to any problem where:

- Multiple kinds of expertise are required
- No single agent can solve the problem alone
- No fixed sequence of operations would correctly compose the experts in
  advance
- Partial solutions accumulate at multiple levels of abstraction
- Some judgments are uncertain and benefit from later revision

These are the conditions of legacy-modernization analysis (the `code-explorer`
case) — and many other Declarative Software Development tasks where a
constellation of specialist agents needs to coordinate without a central
planner.

## What this archetype provides

The Blackboard archetype provides the *substrate* — the workspace, the
notification fabric, the Knowledge Source registration surface, the proposal
lifecycle, and the Control. It does not provide any specific Knowledge Source;
those are domain-specific and live in the archetype that *adopts* this one.

Anticipated surfaces:

- **Workspace** — a structured graph store (`graph-db`) holding partial
  solutions at multiple abstraction levels (views)
- **Notification fabric** — an event substrate (`events-spine`) that emits
  workspace-mutation events to interested Knowledge Sources
- **Knowledge Source registry** — a surface for agents to register their
  subscriptions ("wake me when nodes of these labels appear/change"), declare
  their contributions, and report their confidence
- **Proposal lifecycle** — workspace nodes can be tagged `status: proposed`
  with a confidence score; the Control routes low-confidence proposals to
  reviewers (human or specialist agents) before they become `status: committed`
- **Control** — opportunistic scheduling: given the current workspace state
  and the registered Knowledge Sources' subscription preconditions, choose
  which Knowledge Source to invoke next
- **Audit ledger** — every workspace mutation, every Knowledge Source
  contribution, every proposal acceptance/rejection, recorded with provenance
  for traceability

## Composition

Anticipated (locked at first reference implementation):

- `graph-db` — the workspace storage
- `events-spine` — the notification fabric
- (possibly) `simple-auth` — for Knowledge Source identity in
  multi-operator environments

The composition will be locked at first reference implementation. The
pattern itself is described in `docs/THE-BLACKBOARD.md`.

## Transient vs. persistent blackboards

A Blackboard can be **transient** (lives for the duration of a single
problem-solving session, dies when the session ends — useful for
conversation-bound coordination among a constellation of agents) or
**persistent** (lives across sessions, accumulates over time — useful for
long-running understanding-building tasks like legacy-modernization
analysis). The archetype supports both modes; an adoption chooses which
based on the problem it solves.

The first target adoption (`code-explorer` inside `solution-intel`) is a
persistent blackboard — the legacy-modernization understanding accumulates
across sessions, never dies. Future adoptions for conversational
constellation coordination would use the transient mode.

## Documentation

- `docs/THE-BLACKBOARD.md` — the architectural pattern, the Hearsay-II
  lineage, the mapping onto SI's substrate, the proposed factoring
- Companion: `archetypes-solution-intelligence/.../docs/THE-ARCHAEOLOGIST.md`
  — the story of the Visitor, the first Knowledge Source that will run on
  the `code-explorer` blackboard

## Reference implementation

**None yet.** When the first blackboard library is built (anticipated as part
of `solution-intel`'s biz-deriver phase), this directory grows a
`reference-impl/` with the substrate code (graph-db wrapper + events-spine
wrapper + KS-registration + proposal lifecycle + Control). The
domain-specific Knowledge Sources (the Visitor, the Feature-Discoverer, etc.)
live in the adopting archetype, not in this one.

## Trigger condition for full lift

When the first library exists. This will be the substrate code for the
`code-explorer` blackboard — the smallest viable Blackboard implementation,
hosted as the substrate beneath `solution-intel`'s biz-deriver phase.

Until then, the name is reserved so future composite archetypes can refer
to `blackboard` without ambiguity, and the docs/ directory holds the design
work that will inform the first build.
