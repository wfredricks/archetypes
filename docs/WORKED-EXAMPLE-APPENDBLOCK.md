# Worked Example — `appendBlock` from `simple-ledger`

*A concrete worked example of the SIG content needed to drive an engineer to write good code for ONE Service. Companion to STORY-AGENT-SIG.md (macro) and STORY-AGENT-VERIFY.md (micro). Written 2026-05-21 by Bhai with Bill in the loop.*

*Purpose: test whether the SIG content we've been designing is actually sufficient to produce good code. If reading this YAML and walking through the flow gives an engineer everything they need, the design holds. If something is missing, it surfaces here.*

*Target Service: `appendBlock` from the `simple-ledger` archetype. Picked because it's small enough to render fully, real enough to exercise pre/postconditions and constraints, and forward-looking (we'll actually use this when we build simple-ledger).*

---

## Part 1 — The SIG content (rendered as YAML)

This is the SIG state that would exist *before* an engineer is spawned to build `appendBlock`. Bhai authored all of this during preparation. None of it is per-spawn; all of it is per-archetype, durable in the graph.

### The Solution and Contract anchors

```yaml
# Already in the graph today
- node: Solution
  namespace: asi
  name: Archetypes
  # ...full asi adoption profile

# To be created when simple-ledger contract gets loaded
- node: Contract
  contractId: simple-ledger-v0.1.0-pre
  archetypeName: simple-ledger
  archetypeKind: primitive
  archetypeVersion: v0.1.0-pre
  sourceBookend: archetypes/simple-ledger/LEFT-BOOKEND.md
  loadedAt: <timestamp>
  namespace: asi  # for cleanup-scoping

# Edge: anchor the Contract to the Solution
- edge: HAS_CONTRACT
  from: (Solution {namespace: "asi"})
  to: (Contract {contractId: "simple-ledger-v0.1.0-pre"})
```

### The Service node — `appendBlock`

```yaml
- node: Service
  key: S1
  name: appendBlock
  signature: "(payload: LedgerPayload) => Promise<BlockReceipt>"
  description: |
    Append a new block to the ledger. The block carries a payload (caller-defined),
    a sequence number (auto-assigned, monotonically increasing), a hash of the prior
    block (the chain link), and its own hash.
  preconditions:
    - id: S1.PRE.1
      text: payload is a valid LedgerPayload (matches DO1 schema).
      verify: |
        Type-check at compile time (TypeScript will catch wrong shapes).
        Runtime guard in appendBlock: throw InvalidPayload if payload fails the
        DO1 schema validator.
    - id: S1.PRE.2
      text: The ledger is initialized (a genesis block exists).
      verify: |
        Read the most recent block's sequence number. If no blocks exist, throw
        LedgerNotInitialized. The genesis-block setup is a separate operation
        (Service S0, not covered in this example).
  postconditions:
    - id: S1.POST.1
      text: Returned BlockReceipt.sequence equals previous block's sequence + 1.
      verify: |
        Unit test: append a block; capture the returned sequence; append another;
        assert the second is exactly one greater than the first.
    - id: S1.POST.2
      text: |
        Returned BlockReceipt.hash equals SHA256(prevHash || canonicalize(payload) || sequence).
      verify: |
        Unit test: compute the expected SHA256 against the canonical concatenation
        directly; compare to the returned hash. Use a fixed payload + a known
        prevHash so the expected hash is deterministic.
    - id: S1.POST.3
      text: After the call, the underlying store contains the new block at sequence N.
      verify: |
        Unit test: append a block; immediately read the block at the returned
        sequence; assert deep-equal to what was appended (payload, hash, prevHash,
        sequence all match).

# Edges anchoring this Service to the Contract
- edge: DECLARES_SERVICE
  from: (Contract {contractId: "simple-ledger-v0.1.0-pre"})
  to: (Service {key: "S1"})

# Edges declaring scope and realization
- edge: REALIZES
  from: (Service {key: "S1"})
  to: (DataObject {key: "DO1"})  # LedgerBlock
- edge: REALIZES
  from: (Service {key: "S1"})
  to: (DataObject {key: "DO2"})  # BlockReceipt
```

### The DataObjects S1 realizes

```yaml
- node: DataObject
  key: DO1
  name: LedgerBlock
  description: |
    A single block in the ledger chain. Immutable once written.
  schemaHint: |
    interface LedgerBlock {
      sequence: number;
      prevHash: string;
      payload: LedgerPayload;
      hash: string;
      timestamp: string;  // ISO 8601
    }

- node: DataObject
  key: DO2
  name: BlockReceipt
  description: |
    The receipt returned to the caller after a successful appendBlock.
    Carries the sequence and hash for the caller's reference; does not include
    the full block (caller can read it back via the store if needed).
  schemaHint: |
    interface BlockReceipt {
      sequence: number;
      hash: string;
      appendedAt: string;  // ISO 8601
    }
```

### The Constraints that scope to S1

```yaml
- node: Constraint
  key: C1
  name: Block-write atomicity
  rationale: |
    A partially-written block leaves the chain in an unverifiable state.
    Auditors cannot trust a ledger that can be observed mid-write.
  check_rule: |
    Any Service that writes a block MUST be atomic. Concretely:
    The test suite for the Service MUST include a fault-injection case:
    simulate a write that fails mid-stream. Verify the ledger contains either
    the full new block OR the prior state — never a partial block.
    Use vitest's vi.mocked() to make the underlying file-write throw after
    the first byte is written.
  check_severity: block

- node: Constraint
  key: C3
  name: No payload mutation
  rationale: |
    The ledger is a record of what was submitted. If we mutate payloads on the
    way in, the ledger is a record of what we decided to keep, not what was
    submitted. That breaks the audit guarantee.
  check_rule: |
    The test suite for any Service that accepts a payload MUST include:
    pass in a payload object; after the call, deep-equal compare the payload
    object to a snapshot captured before the call. Must be identical (no fields
    added, removed, or mutated). Use structuredClone() to capture the snapshot.
  check_severity: block

# Edges declaring scope (which Services each Constraint applies to)
- edge: CONSTRAINS
  from: (Constraint {key: "C1"})
  to: (Service {key: "S1"})
  # Also to: (Service {key: "S2"}) — appendBatch, same constraint applies
- edge: CONSTRAINS
  from: (Constraint {key: "C3"})
  to: (Service {key: "S1"})
```

### A relevant Principle

```yaml
- node: Principle
  key: P1
  name: Append-only by construction
  driver: |
    Tamper-evidence; auditor trust; no need for "delete" semantics in the
    storage layer.
  consequences:
    - No update or delete operations exist on the public API.
    - Mistakes are corrected by appending a correction record, not by mutation.
  alternativeConsidered: |
    Allow soft-delete via tombstones. Rejected because it reintroduces the same
    auditability question the archetype exists to remove.
  check_rule: |
    The public API surface of simple-ledger MUST NOT include any operation
    that mutates or removes existing blocks. Verify via static analysis of
    the exported symbols: only append-style operations should be exported.
    If a candidate adopter needs "correction," they emit a correction-block
    via the existing append operation.
  check_severity: block

# Edge: P1 is a cross-cutting principle for the whole archetype
# (no CONSTRAINS edge to specific services — it applies to all)
```

### The BuildPhase that covers `appendBlock` implementation

```yaml
- node: BuildPhase
  phaseId: C
  name: Implement appendBlock service
  recipeId: simple-ledger-v0.1.0-pre-2026-05-22
  dependsOn: [B]  # depends on Phase B (core types)
  priority: high
  status: open

- node: BuildRecipe
  recipeId: simple-ledger-v0.1.0-pre-2026-05-22
  archetype: simple-ledger
  version: v0.1.0-pre
  wallClockTarget: 6h
  createdBy: Bhai
  createdAt: <timestamp>

# Edges
- edge: HAS_RECIPE
  from: (Contract {contractId: "simple-ledger-v0.1.0-pre"})
  to: (BuildRecipe {recipeId: "simple-ledger-v0.1.0-pre-2026-05-22"})
- edge: HAS_PHASE
  from: (BuildRecipe {recipeId: "simple-ledger-v0.1.0-pre-2026-05-22"})
  to: (BuildPhase {phaseId: "C"})
```

### The Obligations the engineer must satisfy for Phase C

```yaml
- node: Obligation
  id: C.1
  text: |
    Create src/ledger/appendBlock.ts implementing the appendBlock function with
    the signature declared in Service S1.
  status: open

- node: Obligation
  id: C.2
  text: |
    Implement runtime payload validation per S1.PRE.1 — throw InvalidPayload if
    the input does not match the LedgerPayload schema.
  status: open

- node: Obligation
  id: C.3
  text: |
    Implement ledger-initialization guard per S1.PRE.2 — throw LedgerNotInitialized
    if no genesis block exists.
  status: open

- node: Obligation
  id: C.4
  text: |
    Implement atomic block-write per Constraint C1 — write to a temp file, fsync,
    then rename. The implementation MUST NOT use a direct stream write that could
    fail mid-stream.
  status: open

- node: Obligation
  id: C.5
  text: |
    Add provenance JSDoc header to src/ledger/appendBlock.ts per METHODOLOGY.md.
    Citation: simple-ledger archetype, contract simple-ledger-v0.1.0-pre.
  status: open

# Edges
- edge: HAS_OBLIGATION
  from: (BuildPhase {phaseId: "C"})
  to: (Obligation {id: "C.1"})
# (... similar HAS_OBLIGATION edges for C.2 through C.5)
```

### The AcceptanceCriteria that verify Phase C

```yaml
- node: AcceptanceCriterion
  id: AC-C-1
  text: appendBlock function is exported from src/ledger/appendBlock.ts with the declared signature.
  evidence_type: typecheck
  verification_method: |
    Run `npx tsc --noEmit` in the ledger package. Must compile.
    Run `grep -E "export.*appendBlock" src/ledger/appendBlock.ts` — must match.
  status: open

- node: AcceptanceCriterion
  id: AC-C-2
  text: appendBlock returns a BlockReceipt with correct sequence and hash; underlying store contains the new block.
  evidence_type: unit_test
  verification_method: |
    File: tests/unit/appendBlock-postconditions.test.ts
    Tests required:
      - "appendBlock returns sequence = prev + 1" (verifies S1.POST.1)
      - "appendBlock returns hash = SHA256(prevHash || canonicalize(payload) || sequence)" (verifies S1.POST.2)
      - "Underlying store contains the new block after appendBlock returns" (verifies S1.POST.3)
    Run: `npm test -- tests/unit/appendBlock-postconditions.test.ts`
    All three tests must pass.
  status: open

- node: AcceptanceCriterion
  id: AC-C-3
  text: Fault-injected mid-write does not leave a partial block.
  evidence_type: unit_test
  verification_method: |
    File: tests/unit/appendBlock-atomicity.test.ts
    Test required:
      - "When file-write throws mid-stream, ledger returns prior state, not partial"
    Use vi.mocked() on the file-write per C1.check_rule.
    Run: `npm test -- tests/unit/appendBlock-atomicity.test.ts`
    Test must pass.
  status: open

- node: AcceptanceCriterion
  id: AC-C-4
  text: Caller's payload object is not mutated during appendBlock.
  evidence_type: unit_test
  verification_method: |
    File: tests/unit/appendBlock-no-payload-mutation.test.ts
    Test required:
      - "Payload object is deep-equal to pre-call snapshot after appendBlock"
    Use structuredClone() per C3.check_rule.
    Run: `npm test -- tests/unit/appendBlock-no-payload-mutation.test.ts`
    Test must pass.
  status: open

- node: AcceptanceCriterion
  id: AC-C-5
  text: appendBlock obeys the append-only principle (no update or delete exposed).
  evidence_type: static_analysis
  verification_method: |
    Run `grep -E "(update|delete|remove|mutate).*Block" src/ledger/*.ts` —
    must return no matches. The exported surface should only include append-style
    operations.
  status: open

# Edges declaring what each AcceptanceCriterion verifies
- edge: VERIFIES
  from: (AcceptanceCriterion {id: "AC-C-1"})
  to: (Service {key: "S1"})

- edge: VERIFIES
  from: (AcceptanceCriterion {id: "AC-C-2"})
  to: (Service {key: "S1"})
- edge: VERIFIES_POSTCONDITION
  from: (AcceptanceCriterion {id: "AC-C-2"})
  to: "S1.POST.1"  # references postcondition by id; can be a properties on Service node OR separate Postcondition nodes
- edge: VERIFIES_POSTCONDITION
  from: (AcceptanceCriterion {id: "AC-C-2"})
  to: "S1.POST.2"
- edge: VERIFIES_POSTCONDITION
  from: (AcceptanceCriterion {id: "AC-C-2"})
  to: "S1.POST.3"

- edge: VERIFIES
  from: (AcceptanceCriterion {id: "AC-C-3"})
  to: (Constraint {key: "C1"})

- edge: VERIFIES
  from: (AcceptanceCriterion {id: "AC-C-4"})
  to: (Constraint {key: "C3"})

- edge: VERIFIES
  from: (AcceptanceCriterion {id: "AC-C-5"})
  to: (Principle {key: "P1"})

# Phase → AC edges
- edge: HAS_ACCEPTANCE_CRITERION
  from: (BuildPhase {phaseId: "C"})
  to: (AcceptanceCriterion {id: "AC-C-1"})
# (... similar for AC-C-2 through AC-C-5)
```

That's the SIG content. ~25 nodes, ~30 edges. All authored before the engineer is spawned.

---

## Part 2 — The engineer's walkthrough

The engineer wakes up. The spawn message says "build simple-ledger v0.1.0-pre Phase C; read your work from the SIG."

### Step 1 — Read the contract overview

```
sig.contract("simple-ledger")
```

Returns the full Contract subgraph. The engineer now has cached: all Principles, all Constraints, all Services, all DataObjects, all Hypotheses. (For this example we only rendered Principle P1, Constraints C1 and C3, Service S1, DataObjects DO1 and DO2 — in reality there'd be more.)

### Step 2 — Read the phase

```
sig.phase("simple-ledger", "v0.1.0-pre", "C")
```

Returns: name, dependencies, priority, the 5 obligations, the 5 acceptance criteria, and (computed by the API from the VERIFIES edges) a back-pointer to which Service/Constraint/Principle each AC verifies.

The engineer can see:
- 5 things to do (the obligations)
- 5 things to demonstrate (the acceptance criteria)
- Which AC verifies which contract element (so they can sanity-check coverage)

### Step 3 — Implement appendBlock

The engineer reads Service S1 from cache. Signature, preconditions, postconditions all visible.

They write `src/ledger/appendBlock.ts`. The structure follows the obligations:

- C.1: function with declared signature ✓
- C.2: payload validation per PRE.1 ✓ (throws InvalidPayload)
- C.3: initialization guard per PRE.2 ✓ (throws LedgerNotInitialized)
- C.4: atomic write per C1 ✓ (temp file + fsync + rename)
- C.5: provenance JSDoc header ✓

They write the function. They self-check the draft against the constraints C1 and C3 in their cache:

- C1.check_rule says fault-injection mid-write must leave prior state. The atomic-write pattern (temp + fsync + rename) makes this true by construction.
- C3.check_rule says payload must not be mutated. The implementation passes the payload by value into the SHA256 canonicalization but never modifies it.

They self-check against P1.check_rule:

- P1 says no update/delete operations exposed. They only export `appendBlock`. No mutation symbols.

The implementation is done.

### Step 4 — Write the tests the SIG demanded

For each AcceptanceCriterion, the verification_method tells the engineer exactly what test to write. They write four test files (AC-C-1 is a typecheck + grep, not a test file):

```
tests/unit/appendBlock-postconditions.test.ts   ← satisfies AC-C-2
tests/unit/appendBlock-atomicity.test.ts         ← satisfies AC-C-3
tests/unit/appendBlock-no-payload-mutation.test.ts  ← satisfies AC-C-4
```

For AC-C-5, no test file — just the grep command in the verification_method.

Each test file has the exact tests named in the verification_method. The engineer doesn't pick the test names; the SIG declared them.

### Step 5 — Run the tests

```
$ npm test -- tests/unit/appendBlock-postconditions.test.ts
  ✓ appendBlock returns sequence = prev + 1
  ✓ appendBlock returns hash = SHA256(prevHash || canonicalize(payload) || sequence)
  ✓ Underlying store contains the new block after appendBlock returns
  
$ npm test -- tests/unit/appendBlock-atomicity.test.ts
  ✓ When file-write throws mid-stream, ledger returns prior state, not partial
  
$ npm test -- tests/unit/appendBlock-no-payload-mutation.test.ts
  ✓ Payload object is deep-equal to pre-call snapshot after appendBlock

$ grep -E "(update|delete|remove|mutate).*Block" src/ledger/*.ts
  (no output — passes AC-C-5)

$ npx tsc --noEmit
  (clean — passes AC-C-1 part 1)

$ grep -E "export.*appendBlock" src/ledger/appendBlock.ts
  export async function appendBlock(...)
  (matches — passes AC-C-1 part 2)
```

All five ACs pass.

### Step 6 — Report

```
sig.report_phase_done("simple-ledger", "v0.1.0-pre", "C", {
  obligations: [
    { id: "C.1", status: "met", evidence: { file: "src/ledger/appendBlock.ts" } },
    { id: "C.2", status: "met", evidence: { file: "src/ledger/appendBlock.ts", line: 24 } },
    { id: "C.3", status: "met", evidence: { file: "src/ledger/appendBlock.ts", line: 18 } },
    { id: "C.4", status: "met", evidence: { pattern: "temp + fsync + rename", file: "src/ledger/appendBlock.ts", lines: "42-58" } },
    { id: "C.5", status: "met", evidence: { provenance_header: true, file: "src/ledger/appendBlock.ts", lines: "1-8" } }
  ],
  acceptance_criteria: [
    { id: "AC-C-1", status: "met", evidence: { tsc: "clean", grep_match: true } },
    { id: "AC-C-2", status: "met", evidence: {
        test_file: "tests/unit/appendBlock-postconditions.test.ts",
        tests_passed: 3, tests_failed: 0,
        verified: ["S1.POST.1", "S1.POST.2", "S1.POST.3"]
    }},
    { id: "AC-C-3", status: "met", evidence: {
        test_file: "tests/unit/appendBlock-atomicity.test.ts",
        tests_passed: 1, tests_failed: 0
    }},
    { id: "AC-C-4", status: "met", evidence: {
        test_file: "tests/unit/appendBlock-no-payload-mutation.test.ts",
        tests_passed: 1, tests_failed: 0
    }},
    { id: "AC-C-5", status: "met", evidence: { grep_returned: "" } }
  ],
  wall_clock_minutes: 47
})
```

The SIG accepts the report. The API traverses the VERIFIES edges and updates the verification status of:
- S1 (Service) — verified by AC-C-1 and AC-C-2
- S1.POST.1, S1.POST.2, S1.POST.3 — verified by AC-C-2 (via VERIFIES_POSTCONDITION edges)
- C1 (Constraint) — verified by AC-C-3
- C3 (Constraint) — verified by AC-C-4
- P1 (Principle) — verified by AC-C-5

Phase C node: `status: "done", completedAt: <timestamp>, wallClockMinutes: 47`.

The work for `appendBlock` is complete. The right bookend now has data: this Service is implemented, these constraints are honored, these tests are the evidence.

---

## Part 3 — What this worked example tested

Walking through the example surfaced what's working and what's still soft.

### What worked cleanly

1. **The ten-thing brief shows up in the SIG.** Going through the list from earlier:
   - What it's for — the Contract's description + the broader STORY paper
   - What it must do — Service S1 with signature + preconditions + postconditions
   - What it must not do — Constraints C1, C3, and Principle P1 with check_rules
   - How to recognize wrong — check_rules with severity
   - What to start from — the reference implementation pointer (not in this example but it would be on the Contract or the BuildPhase as "derives from chainblocks at tag v…")
   - Known traps — DEFECTS.md content (not rendered here but it'd be on the Contract via a DECLARES_DEFECT edge)
   - What to do in what order — BuildRecipe with BuildPhases
   - What success looks like — AcceptanceCriteria with verification_methods
   - What to do when blocked — the report_phase_incident pattern (not used in this clean run)
   - What to record at completion — the structured report payload

   All ten map to graph content. Worked example confirms the SIG-as-carrier of the brief is real.

2. **The engineer's path is mechanical.** From spawn message to phase complete, every decision is *informed by a SIG read*, not a judgment call. The engineer didn't have to interpret prose to figure out what to do.

3. **The VERIFIES edges close the loop.** The engineer reports evidence at the AC level; the SIG propagates verification to Services, Constraints, Principles, and even individual Postconditions. The right bookend's data assembles itself.

### What's still soft

1. **Postcondition representation.** I rendered postconditions as a list-on-Service (`preconditions:` and `postconditions:` as properties). The `VERIFIES_POSTCONDITION` edge then references postcondition IDs as strings.

   **The cleaner alternative:** Postconditions are their own nodes (`Postcondition` and `Precondition`), each linked from a Service via `HAS_POSTCONDITION` / `HAS_PRECONDITION`. Then VERIFIES edges target those nodes properly.
   
   **Trade-off:** more node types vs. cleaner edges. My instinct: separate nodes. Reading the engineer's `report_phase_done` payload, the `verified: ["S1.POST.1", ...]` field would be much cleaner if those were node IDs rather than string property references.

2. **Obligations vs. AcceptanceCriteria are sometimes redundant.** In this example:
   - Obligation C.4 says "implement atomic block-write per C1"
   - AcceptanceCriterion AC-C-3 says "fault-injected mid-write does not leave a partial block"
   
   These are saying the same thing from two angles. The Obligation says "do X"; the AC says "demonstrate X was done." Both reference C1.

   **Is the redundancy useful or wasteful?** I think useful: Obligations are the work; AcceptanceCriteria are the evidence. They're different lenses on the same requirement, and the engineer benefits from both. But it's worth flagging — if we find Obligations and ACs always say the same thing, we should collapse.

3. **Provenance / DERIVES_FROM didn't surface in this example.** The reference-implementation pointer (chainblocks at tag X) is essential for the engineer to know what to derive from. It should be on the Contract via a `DERIVES_FROM` edge to a `LibraryInstance` node. I didn't render that here because it's not strictly necessary for `appendBlock` (the engineer might write it from scratch given the structured spec). But for the full simple-ledger build, the LibraryInstance link is needed for the agent to actually copy code.

4. **The "what to do when blocked" path didn't get exercised** in this clean walkthrough. The example assumes everything works. A second worked example showing a blocked phase (e.g., AC-C-3 fails because the implementation didn't honor C1, engineer reports incident, Bhai patches the BuildPhase to add an Obligation refactoring step, engineer resumes) would test the BuildIncident node pattern. Worth doing as a follow-up.

### The brief-sufficiency test

**Does this SIG content give an engineer enough to write good code for `appendBlock`?**

Reading the YAML, I'd say yes:
- They know the signature exactly
- They know the preconditions and postconditions
- They know which constraints scope to this Service and what tests demonstrate them
- They know which principles are at play and what would violate them
- They know the four tests to write and the exact assertions each test should make
- They know the obligation list — five concrete things to do
- They know what counts as "phase done"

If a competent junior engineer (or sub-agent) had only the YAML in Part 1 and the spawn message, they could produce good code for `appendBlock` without further guidance. **That's the test passing.**

If the test had failed — if reading the YAML left obvious gaps — we'd know what to add. As it stands, the only "softness" findings are structural (separate nodes for postconditions, possible obligation-AC overlap) rather than missing-content.

---

## Part 4 — What this worked example surfaces about the ontology

Three refinements to the SIG fortification list:

### Refinement A: `Postcondition` and `Precondition` as separate nodes

Don't store them as JSON-list properties on the Service. Make them first-class nodes. Edges:

```
(s:Service)-[:HAS_PRECONDITION]->(pre:Precondition {id, text, verify})
(s:Service)-[:HAS_POSTCONDITION]->(post:Postcondition {id, text, verify})
(ac:AcceptanceCriterion)-[:VERIFIES]->(post:Postcondition)
```

This makes the VERIFIES edges uniform — they all point to nodes, not to string IDs nested inside other nodes.

### Refinement B: Recognize the Obligation/AcceptanceCriterion duality

Don't merge them, but recognize they often pair: Obligation C.4 ↔ AcceptanceCriterion AC-C-3. Worth a `PROVES_OBLIGATION` edge from AC to Obligation? That would let the engineer see "if I complete this AC, I've also satisfied that Obligation." The bookkeeping closes automatically.

Tentative — could also be handled by the engineer's report payload (the engineer marks both Obligation C.4 and AC-C-3 as met). Not sure which is cleaner. **Mark as an open design question.**

### Refinement C: The structured-evidence shape needs a typed schema

The engineer's report payload has:

```yaml
evidence: { test_file: ..., tests_passed: 3, verified: [...] }
```

For this to be queryable later (the manager wants to ask "show me every test file that verified C1"), the evidence shape needs to be typed per `evidence_type`. A `unit_test` evidence has `test_file`, `tests_passed`, `tests_failed`. A `static_analysis` evidence has `command`, `output`. A `typecheck` evidence has `result: "passed" | "failed"`.

This is a small addition to the AcceptanceCriterion ontology: the `evidence_type` field implies an evidence schema. The API enforces the schema when accepting reports.

---

## Conclusion

The SIG content for one Service is large (25 nodes, 30 edges) but every piece is doing real work — no padding. The engineer's path from spawn to done is mechanical, informed by SIG reads, and audited by verifies-edges.

**The brief is sufficient.** Reading Part 1 is enough for an engineer to write good code for `appendBlock`. The ten-thing brief from the prior conversation maps onto graph content cleanly.

**Three refinements surface:** preconditions/postconditions as separate nodes; Obligation↔AcceptanceCriterion pairing as an open design question; evidence-schema typing per evidence_type.

**The example is the design's forcing function.** When we author the SIG content for the full simple-ledger build, we'll author similar content for every Service. If each Service comes out cleanly using this template, the ontology holds. If we struggle to author the SIG for some other Service, we'll know which part of the design is still soft.

🖇️ *Worked example written 2026-05-21 ~17:55 EDT. Companion to STORY-AGENT-SIG.md and STORY-AGENT-VERIFY.md. Tests brief-sufficiency at the single-Service scope.*
