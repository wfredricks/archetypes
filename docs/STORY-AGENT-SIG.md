# The Junior Engineer and the SIG

*A story of how a sub-agent does productive work via a stable SIG API rather than tailored markdown recipes. Written 2026-05-21 by Bhai with Bill in the loop. Companion to METHODOLOGY.md; meant to be read by humans, then used to test whether the API design we choose actually serves the story.*

*Bill asked for this story as a forcing function: "Write a story of the agent using the SIG in this way and you will know." If the story holds together — if the agent gets enough to do the job, and the manager gets enough confidence the job is being done — the API surface is right. If the story stumbles, the API surface needs work.*

---

## I. The cast

**Bhai (the manager).** A personal twin running in the constellation, responsible for shipping work on Bill's behalf. Knows the system, the methodology, the SIG, the registry. Has authority to spawn sub-agents and accept their work or send it back.

**The junior engineer (the sub-agent).** A fresh sub-agent session spawned for one job. Sharp, capable, will execute literally what it's told. No prior context beyond what it's handed. Will fail silently if given too much to do at once. Will fail noisily if the instructions are ambiguous or contradictory. Will succeed if the instructions are bounded, specific, and verifiable.

**The SIG (the substrate).** A graph living in PolyGraph. Holds the contract for every archetype the registry knows about: principles, constraints, services, processes, data objects, hypotheses. Holds the build content for every build that's been or is being executed: build recipes, build phases, obligations, acceptance criteria. Holds the status of every build in flight: which phases have been done, which hypotheses have been verified, what evidence backs each.

**The SIG API (the stable interface).** An MCP server fronting the SIG. Stable surface; the agent calls named tools and gets typed responses. Doesn't change run to run.

## II. The setup

Bill says to Bhai: *"Build the chainblocks-as-simple-ledger reference implementation into SI/G. Get on it."*

Bhai understands the work. The chainblocks library exists. The simple-ledger archetype's contract has been loaded into the SIG (by Bhai, ahead of time — that's preparation work, not part of the sub-agent's task). The contract says what the build must satisfy. The SIG also carries a BuildRecipe — a sequence of BuildPhases, each with Obligations (things the agent must do) and AcceptanceCriteria (things the manager will check). The BuildRecipe was authored by Bhai during preparation; it's not the agent's job to invent it.

Bhai is now ready to hand the work to a junior engineer.

## III. The spawn

Bhai sends the junior engineer a short message — the same message that would go to any junior engineer for any build. It does not change run to run. It says:

> You have been spawned to build `simple-ledger` v0.1.0-pre into SI/G.
>
> Your contract and your work plan live in the SIG. Read them via the SIG API.
>
> Before you start, call `sig.contract("simple-ledger")` to receive the full contract: principles, constraints, services, processes, data objects, hypotheses. These are your laws. If you violate any, you have failed the work.
>
> Then call `sig.recipe("simple-ledger", "v0.1.0-pre")` to receive your build recipe — the ordered sequence of phases. For each phase, call `sig.phase("simple-ledger", "v0.1.0-pre", <phaseId>)` to receive the obligations and acceptance criteria of that phase.
>
> Execute phases in dependency order. After each phase, call `sig.report_status(<phaseId>, "done", <evidence>)`. If you cannot satisfy an obligation, call `sig.report_status(<phaseId>, "blocked", <reason>)` and stop. Do not improvise around the obligation; that is not your work.
>
> At the end of every phase, run the acceptance criteria. If a criterion fails, call `sig.report_status(<phaseId>, "criterion_failed", <which one, what evidence>)` and stop.
>
> After all phases are done, call `sig.report_hypotheses("simple-ledger")` — for each Hypothesis the contract declares, set its status (`held`, `partial`, `violated`, or `untested`) with evidence. This is how the right bookend writes itself.
>
> When everything is reported, Signal me. Hard cap: six hours of wall clock. If close to cap, prioritize phases that the recipe marks `priority: high`. If blocked, write a brief FINDINGS file and Signal me anyway.
>
> You are not to read markdown recipe files. You are to read the SIG. The SIG is your contract.

That's the message. ~300 words. It is the same for every job, with only the archetype name, version, and Signal-back path varying. The junior engineer can read it in two minutes.

## IV. The first call

The junior engineer wakes up. It reads the spawn message. It calls:

```
sig.contract("simple-ledger")
```

The SIG API returns a typed response. Not raw Cypher; not freeform text; a structured object the engineer can iterate over. The structure looks roughly like:

```yaml
archetype: simple-ledger
kind: primitive
version: v0.1.0-pre
principles:
  - key: P1
    name: Append-only by construction
    driver: Tamper-evidence; auditor trust; no need for "delete" semantics in the storage layer.
    consequences:
      - No update or delete operations exist on the public API.
      - Mistakes are corrected by appending a correction record, not by mutation.
    alternative_considered: "Allow soft-delete via tombstones." Rejected because it
      reintroduces the same auditability question the archetype exists to remove.
  - key: P2
    name: Hash-chained blocks
    ...
constraints:
  - key: C1
    name: Block-write atomicity
    rationale: A partially-written block leaves the chain in an unverifiable state.
  ...
services:
  - key: S1
    name: appendBlock
    signature: "(payload: LedgerPayload) => Promise<BlockReceipt>"
    description: ...
  ...
processes:
  - key: Pr1
    name: ...
  ...
data_objects:
  - key: DO1
    name: LedgerBlock
    schema: { sequence, prevHash, payload, hash, timestamp }
  ...
hypotheses:
  - key: H1
    text: "The five Principles hold across the implementation."
    status: untested
  ...
```

The engineer reads this. It does not need to interpret prose; the schema is fixed. It knows now what laws govern its work. The contract is its **constant constraint surface** — anywhere in the work, if it's about to write code, it can check the code against P1, P2, ..., C1, C2, ..., and stop if there's a conflict.

The engineer caches the contract response. It does not call `sig.contract` again unless explicitly told to.

## V. The recipe

The engineer calls:

```
sig.recipe("simple-ledger", "v0.1.0-pre")
```

The SIG API returns the recipe envelope: an ordered list of phases.

```yaml
recipe_id: simple-ledger-v0.1.0-pre-2026-05-22
archetype: simple-ledger
version: v0.1.0-pre
wall_clock_target: 6h
phases:
  - id: A
    name: Branch and scaffold
    depends_on: []
    priority: high
  - id: B
    name: Core types
    depends_on: [A]
    priority: high
  - id: C
    name: appendBlock service implementation
    depends_on: [B]
    priority: high
  - id: D
    name: Hash-chain verification
    depends_on: [B, C]
    priority: high
  - id: E
    name: ...
```

The engineer can see the dependency graph at a glance. It knows to start with phase A. It does not need to invent the order; the order is in the SIG.

## VI. The first phase

The engineer calls:

```
sig.phase("simple-ledger", "v0.1.0-pre", "A")
```

The response:

```yaml
phase_id: A
name: Branch and scaffold
obligations:
  - id: A.1
    text: Check out main in solution-intelligence-graph, pull, create branch
      `stage-3-simple-ledger-v0.1.0-pre`.
  - id: A.2
    text: Create directory `src/ledger/`.
  - id: A.3
    text: Initialize the ledger sub-package with package.json, tsconfig.json,
      vitest.config.ts. Use the same layout patterns as `src/grants/`. Package
      scope `@<namespace>/ledger` where `<namespace>` is the SI/G adoption profile's
      namespace.
  - id: A.4
    text: Add provenance JSDoc header to every file created in this phase, citing
      `chainblocks` as the source archetype and the latest chainblocks release tag
      as the source commit.
acceptance_criteria:
  - id: A.AC1
    text: Branch `stage-3-simple-ledger-v0.1.0-pre` exists on the local clone.
  - id: A.AC2
    text: `src/ledger/package.json` exists with the correct package scope.
  - id: A.AC3
    text: `npx tsc --noEmit` runs clean in `src/ledger/`.
hard_constraints:
  - All constraints from the contract apply.
  - Use os.tmpdir(), not /tmp/.
  - No batched source-file writes; commit per logical unit.
notes:
  - Phase A is the lightest phase. If it takes more than 15 minutes, something
    is wrong — call sig.report_status with "blocked" and Signal back.
```

This is a complete, bounded work order. The engineer can read it in 60 seconds. Every obligation is concrete. Every acceptance criterion is verifiable. The phase is bounded enough that the engineer cannot drift far before checking back in.

The engineer does the work. It creates the branch. It creates the directory. It writes the package files with provenance headers. It runs `npx tsc --noEmit`. It is clean.

It calls:

```
sig.report_status("A", "done", {
  evidence: {
    branch: "stage-3-simple-ledger-v0.1.0-pre",
    files_created: ["src/ledger/package.json", "src/ledger/tsconfig.json", ...],
    typecheck: "passed",
    wall_clock_minutes: 8
  }
})
```

The SIG accepts the report. The BuildPhase node for A now carries `status: "done"`, `evidence: {...}`, `completedAt: <timestamp>`. Bhai, watching from the manager seat, can query the SIG and see Phase A complete in real time. Bhai does not need to read a FINDINGS file or a build log; the SIG is the build log.

## VII. The middle phases — the part that earns the methodology

The engineer continues. Phase B: core types. The phase obligation says "implement the `LedgerBlock`, `BlockReceipt`, and `LedgerPayload` types defined by DO1, DO2, DO3 in the contract." The engineer calls `sig.contract` *again* — no, it does not. The contract is cached. The engineer reads DO1, DO2, DO3 from the cached contract and implements the types.

This is the moment the API earns its keep. The DataObject definitions live in the contract; the engineer reads them from there. There is no parallel markdown document that could drift from the contract. The contract IS the source.

Phase C: the `appendBlock` service. The engineer reads S1 from the cached contract. The signature is fixed: `(payload: LedgerPayload) => Promise<BlockReceipt>`. The constraint C1 (block-write atomicity) is fixed. The engineer writes the service. While writing, it notices its draft would allow a partial write under a specific failure mode. It checks against C1. C1 is violated. It refactors. Now it writes atomically. It moves on.

This is the contract working as a guardrail. The engineer didn't need to be told "watch out for partial writes" in the phase description. The contract is loaded; the constraints are in cache; the engineer self-checks against them. The phase description can stay short because the constraints are doing the work.

Phase D: hash-chain verification. The engineer implements `verifyChain`. The phase acceptance criterion says "a chain of 100 randomly generated blocks verifies clean; tampering with one block in the middle is detected." The engineer writes the test. The test passes. Acceptance criterion met. Report status: done.

## VIII. The blocked moment

Phase F: emit ledger events on every append, to NATS, per Service S4 in the contract.

The engineer reads S4. The signature requires the event to include a `correlationId`. The engineer looks at the `appendBlock` service it just wrote — there is no place for a `correlationId` to enter. The contract says the event must carry one. The phase obligation says wire S4. But the signature for S1 from Phase C does not have a parameter for it.

The engineer pauses. The contract is internally inconsistent.

It calls:

```
sig.report_status("F", "blocked", {
  reason: "S4 (event emission) requires correlationId on every event, but
    S1 (appendBlock) has no parameter for correlationId. The two services
    cannot be reconciled by implementation alone. Either S1's signature must
    grow a correlationId parameter, or S4 must derive correlationId from the
    block sequence number (which is not 'correlation' in the usual sense).
    This is a contract-level inconsistency, not an implementation question.",
  proposed_resolutions: [
    "(a) Add correlationId to S1's signature, default null, propagate to S4.",
    "(b) Change S4 to make correlationId optional, omit when absent.",
    "(c) Define correlationId at the request-context level (out of scope for
         this build)."
  ]
})
```

The engineer Signals Bhai: "Phase F blocked on contract inconsistency between S1 and S4. See SIG status. Holding."

The engineer stops. It does not improvise around the inconsistency. It does not pick a resolution itself. The contract is the law; the law has a bug; only the manager can patch the law.

**This is the moment the methodology works.** The junior engineer's discipline is the SIG. When the SIG can't be satisfied, the work stops cleanly. The manager is informed with enough context (the proposed resolutions in the report) to decide quickly.

Bhai gets the Signal. Bhai opens the SIG, sees the blocked phase, reads the proposed resolutions. Bhai decides (a) — extend S1's signature. Bhai updates the contract in the SIG (one Cypher write, takes a minute). Bhai Signals the engineer: "Contract updated; S1 now carries correlationId. Re-read sig.contract and resume Phase F."

The engineer re-calls `sig.contract` (one of the few times it does, after a manager update). It sees S1's new signature. It checks the work it did in Phase C — that work needs a small revision now. It revises C, runs tests, reports done. It resumes F. F passes. It reports done.

This whole round-trip — engineer blocks, manager fixes contract, engineer resumes — took maybe ten minutes of Bhai's foreground time. No new markdown was written. No tailored instructions. The SIG carries the contract change; the API gives the engineer the new contract.

## IX. The hypothesis writeback

Every phase done. The engineer's last task: write back hypothesis status.

It calls:

```
sig.report_hypotheses("simple-ledger", [
  { key: "H1", status: "held", evidence: "All five principles verified by tests T1-T5 in tests/principles.test.ts." },
  { key: "H2", status: "held", evidence: "All seven constraints enforced by typescript types or runtime checks; coverage in tests/constraints.test.ts." },
  { key: "H3", status: "held", evidence: "All twelve services exposed with documented signatures." },
  { key: "H4", status: "partial", evidence: "DO1-DO4 round-trip cleanly; DO5 (LedgerStats) has no round-trip test because it is a query-only view." },
  { key: "H5", status: "held", evidence: "Hash-chain verification detects every tampered block in tests/hash-chain.test.ts." },
  { key: "H6", status: "untested", evidence: "Stage 3 (graph adopting simple-ledger) has not yet adopted this archetype." },
  { key: "H7", status: "held", evidence: "Wall clock: 4h 22m, under 6h target." }
])
```

The SIG accepts. Every Hypothesis node in `simple-ledger`'s Contract subgraph now carries status, evidence, and verifiedAt. The right bookend exists, in the graph, as queryable state.

The engineer Signals Bhai: *"simple-ledger v0.1.0-pre done. All phases reported. Hypotheses written back: 5 held, 1 partial, 1 untested. https://github.com/wfredricks/solution-intelligence-graph/releases/tag/v0.3.0-pre."*

The engineer's session ends.

## X. What Bhai sees

Bhai queries the SIG. One query gets the full picture: the contract; the recipe; every phase with its status, evidence, completedAt; every hypothesis with its status and evidence. The right bookend renders from this query in seconds. No FINDINGS file to read; no markdown to parse. The state is in the graph.

Bhai sees: 9 phases done, 0 blocked at completion, 5 hypotheses held, 1 partial (explained), 1 untested (correctly — no adopter yet). Wall clock 4h 22m, under target. The single mid-build block (Phase F's contract inconsistency) is recorded in the SIG's status history; future readers can see when the contract was patched and why.

Bhai writes a short summary to Bill: *"simple-ledger shipped. One contract inconsistency caught during build; patched in 10 minutes. 5h total foreground for the day. See SIG for full state."*

That's the whole report. Two sentences. Bill can ask the SIG for any detail.

## XI. What the story tested

Writing this, three things became clear that I'd been carrying without articulating:

### 1. The API surface I proposed (in the prior message) is roughly right but missing one thing

The calls — `contract`, `recipe`, `phase`, `report_status`, `report_hypotheses` — match how the story unfolds. The engineer uses each at the right moment.

**What the story added that I hadn't named:** `sig.report_status` needs to accept *structured evidence* (file paths, test results, wall-clock, etc.), not just a status string. The engineer's reports in §VI and §VIII carry evidence-as-data, not evidence-as-prose. Future tools (Bhai querying the SIG, the orchestrator, audit replays) need the evidence to be queryable, not just readable.

### 2. The constraints layer of the contract is the engineer's guardrail, separate from the phase obligations

§VII showed this. The phase description didn't tell the engineer "watch out for partial writes." Constraint C1 in the cached contract did. The engineer checks every draft against the constraint cache; the phase descriptions stay terse because the cross-cutting constraints are doing the heavy lifting.

**This separates two failure modes the recipe-file pattern conflated:**
- *Wrong work* (phase obligations describe the wrong thing) — caught by the manager during recipe authoring
- *Off-contract work* (the implementation drifts from a principle or constraint) — caught by the engineer during self-checks

Recipes conflated these by putting everything in the same file. Splitting contract (constant) from recipe (per-build) splits the failure modes.

### 3. The blocked moment is the methodology's load-bearing test

§VIII is the part of the story I worry most about. In recipe-driven builds, the engineer encountering a contradiction often improvises around it — picks a resolution that seems sensible, ships it, and we discover the drift in FINDINGS. The new pattern explicitly forbids this: the engineer reports `blocked` with proposed resolutions, stops, and waits.

**For this to work, the SIG must be patchable on the spot by the manager.** Bhai needs to be able to update the contract with one Cypher write while the engineer is paused. The SIG API needs a write surface for the manager (different from the engineer's `report_status` write) that's fast enough to use mid-spawn.

**If contract patches require ceremony — a PR, a review, a tag — the engineer's pause becomes a multi-hour block.** That kills the speed. The API needs to let Bhai patch live without breaking the audit trail. Probably: a `sig.patch_contract(...)` call that writes a patch as a new node linked to the existing contract, preserving history. Patch is auditable; speed is preserved.

### 4. Where this leaves recipe authoring

The phases and obligations are still authored — by Bhai, ahead of time, when the contract is loaded. That's not different from today; it's where the recipe content currently lives in markdown.

**The change is the artifact.** Bhai authors phases as graph nodes (via a helper tool that takes a contract and proposes phases, or hand-writes them, or imports an old markdown recipe and converts it). The phases live in the SIG, not in `BUILD-STAGE-NN-PLAN.md`. The engineer never sees a markdown plan; only the SIG via the API.

So "tailored work" still happens (Bhai authors phases per archetype). But "tailored instructions" no longer happen (the spawn message is constant; phase content is in the graph).

## XII. Where the story might fail

Three risks worth naming:

1. **Bhai might be tempted to under-author phases.** If the API makes it easy to update phases mid-build, Bhai might ship under-specified phases and rely on the patch loop. That's bad — every patch is friction. The discipline that matters: author phases as completely as a markdown recipe would, before spawn. The patch is for genuine contract inconsistencies, not for plan-incompleteness.

2. **The engineer might not actually consult the constraint cache.** §VII assumed the engineer self-checks every draft against the constraints. In practice, sub-agents may forget. Mitigation: the spawn message can include a one-line reminder ("Before each commit, check your draft against the contract's constraints"). And: phase acceptance criteria can include constraint-coverage assertions ("AC: appendBlock test verifies C1, C2, C3").

3. **The SIG might become a bottleneck.** Every phase call hits the SIG; every report hits the SIG. If the SIG is slow or unreachable, builds stall. Mitigation: the engineer caches the contract response (per the story), so the only round-trips during execution are phase reads + status writes. That's tens of calls per build, not thousands. Should be fine.

## XIII. Conclusion

The story holds together. The API surface (`contract`, `recipe`, `phase`, `report_status`, `report_hypotheses`, plus the manager-side `patch_contract`) does the work. The engineer reads the SIG, executes, reports, blocks-cleanly-when-needed. The manager reads status from the SIG, patches contracts when needed, gets a queryable right bookend at the end.

The recipe-file artifact is gone from the engineer's world entirely. The build content still exists — but it lives in the SIG, accessed through a stable API, never re-typed per spawn.

**The story passes its own test.** What I now know that I didn't before:

- The API surface I proposed (semantic, not Cypher-pass-through) is right.
- It needs one addition: structured evidence in `report_status`.
- It needs a manager-side patch tool (`patch_contract`) that preserves audit trail.
- The contract's constraints are first-class guardrails, separate from phase obligations.
- The blocked-with-proposed-resolutions reporting shape is load-bearing.

These are concrete enough to design the API against. Tonight's work, if we're doing it, is: extend the SIG ontology with BuildRecipe / BuildPhase / Obligation / AcceptanceCriterion / PatchEvent nodes; build the SIG API as an MCP server; migrate the events-spine and Stage 2d recipes into the SIG; spawn Stage 3 as the first run against the new architecture.

🖇️ *Story written 2026-05-21 ~17:24 EDT. Tested its own design. Companion to METHODOLOGY.md.*
