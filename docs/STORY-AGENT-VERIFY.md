# The Engineer Verifies What They Built

*A microscopic-scale story of how a sub-agent verifies their own work via the SIG. Companion to STORY-AGENT-SIG.md (which tells the macro story of the whole job). Written 2026-05-21 by Bhai with Bill in the loop.*

*The macro story tested whether the SIG API design lets an agent execute a whole job. This story zooms in on one verification moment — the engineer has written code and needs to check it — and tests whether the SIG carries enough detail for that single act to be unambiguous.*

*Like the macro story, this one is a forcing function: if the moment reads cleanly, the ontology is right. If the moment stumbles, the SIG needs more structure.*

---

## The moment

The engineer has been working on `simple-ledger`'s Phase C: implement the `appendBlock` service. The engineer has just written `src/ledger/appendBlock.ts`. The code looks reasonable. Tests have not been written yet.

This is the moment. Code exists. Verification has not happened. The engineer needs the SIG to tell them, unambiguously: *what should this code do, what should it not do, and what evidence will prove both?*

If the SIG can answer these three questions concretely, the engineer's next ten minutes are mechanical: write the tests the SIG demands, run them, report the result. If the SIG returns prose that requires interpretation, the engineer drifts — picks tests based on what the prose "seems to ask for," which is the same failure mode the recipe-file pattern had.

## Question 1: What should this do?

The engineer calls:

```
sig.service("simple-ledger", "S1")
```

The response:

```yaml
key: S1
name: appendBlock
signature: "(payload: LedgerPayload) => Promise<BlockReceipt>"
description: |
  Append a new block to the ledger. The block carries a payload (caller-defined),
  a sequence number (auto-assigned, monotonically increasing), a hash of the prior
  block (the chain link), and its own hash.
preconditions:
  - id: S1.PRE.1
    text: "payload is a valid LedgerPayload (matches DO1 schema)."
    verify: "Type-check at compile time; runtime guard in appendBlock."
  - id: S1.PRE.2
    text: "Ledger is initialized (a genesis block exists)."
    verify: "Read prevHash from the most recent block; if no blocks exist, throw NotInitialized."
postconditions:
  - id: S1.POST.1
    text: "Returned BlockReceipt.sequence equals previous block's sequence + 1."
    verify: "Test asserts sequence increment after appendBlock call."
  - id: S1.POST.2
    text: "Returned BlockReceipt.hash equals SHA256(prevHash || payload || sequence)."
    verify: "Test asserts hash equals the SHA256 of the canonical concatenation."
  - id: S1.POST.3
    text: "After the call, the underlying store contains the new block at sequence N."
    verify: "Test queries the store for sequence N; asserts equality to the appended block."
realizes_data_objects:
  - DO1 (LedgerBlock)
  - DO2 (BlockReceipt)
constrained_by:
  - C1 (Block-write atomicity)
  - C3 (No payload mutation)
```

The engineer reads this. Six **structured assertions** about what the function must do (2 preconditions, 3 postconditions, plus the realized DataObject schemas). Each has a `verify` field describing how to write the test that demonstrates the assertion.

The engineer doesn't have to interpret prose. The SIG declared what to check.

**SIG fortification this moment requires (beyond what exists today):**

- **`preconditions` and `postconditions` as structured lists on Service nodes**, each with `id`, `text`, and `verify` fields.
- **`realizes_data_objects`** edge so the engineer knows the schemas being implemented.
- **`constrained_by`** edge so the engineer knows which Constraints apply specifically to this Service.

## Question 2: What should this NOT do?

The engineer calls:

```
sig.constraints_for_service("simple-ledger", "S1")
```

The response returns two Constraints scoped to S1:

```yaml
- key: C1
  name: Block-write atomicity
  rationale: |
    A partially-written block leaves the chain in an unverifiable state.
    Auditors cannot trust a ledger that can be observed mid-write.
  check_rule: |
    The test suite for any Service that writes blocks MUST include a fault-injection
    case: simulate a write that fails mid-stream. Verify the ledger contains either
    the full new block OR the prior state — never a partial block.
    
    Concretely: use vitest's vi.mocked() to make the underlying file-write throw
    after the first byte is written. Then assert that the ledger's read of the
    latest block returns the prior block, not a malformed entry.
  check_severity: block
  scoped_to_services:
    - S1
    - S2 (appendBatch — same constraint applies)

- key: C3
  name: No payload mutation
  rationale: |
    The ledger is a record of what was submitted. If we mutate payloads on the way
    in, the ledger is a record of what we decided to keep, not what was submitted.
    That breaks the audit guarantee.
  check_rule: |
    The test suite for appendBlock MUST include: pass in a payload object; after
    the call, deep-equal compare the payload object to a snapshot captured before
    the call. Must be identical (no fields added, removed, or mutated).
    
    Use vitest's structuredClone() to capture the pre-call snapshot.
  check_severity: block
  scoped_to_services:
    - S1
```

Two constraints. Each has a `check_rule` describing *exactly* what test to write. The engineer doesn't decide how to verify; the SIG declared the verification approach.

**SIG fortification this moment requires:**

- **Constraint nodes carry `check_rule` and `check_severity`.** This is fortification finding #1 from yesterday's analysis, now concrete: the `check_rule` is *the operational specification of the test the engineer must write*.
- **`scoped_to_services` (via the `CONSTRAINS` edge)** distinguishes which constraints apply to this Service vs. cross-cutting.

If `check_severity: block`, the AcceptanceCriterion for this Service's phase MUST include a test that satisfies the `check_rule`. The engineer cannot ship the phase as done without that test passing. If `check_severity: warn`, the engineer can flag the violation and proceed, but the phase report records the warning.

## Question 3: What evidence proves both?

The engineer calls:

```
sig.acceptance_criteria_for_phase("simple-ledger", "v0.1.0-pre", "C")
```

The response returns the phase's AcceptanceCriteria — each declares what evidence satisfies it and which Service/Constraint/Principle it verifies:

```yaml
- id: AC-C-1
  text: appendBlock function is exported from src/ledger/appendBlock.ts with the
        declared signature.
  evidence_type: typecheck
  verification_method: |
    Run `npx tsc --noEmit` in the ledger package. Must compile.
    Run `grep -E "export.*appendBlock" src/ledger/appendBlock.ts` — must match.
  verifies_service: S1
  
- id: AC-C-2
  text: appendBlock returns a BlockReceipt with correct sequence and hash.
  evidence_type: unit_test
  verification_method: |
    File: tests/unit/appendBlock-postconditions.test.ts
    Tests required:
      - "appendBlock returns sequence = prev + 1" (verifies S1.POST.1)
      - "appendBlock returns hash = SHA256(prevHash || payload || sequence)"
        (verifies S1.POST.2)
      - "Underlying store contains the new block after appendBlock returns"
        (verifies S1.POST.3)
    Run: `npm test -- tests/unit/appendBlock-postconditions.test.ts`
    All three tests must pass.
  verifies_service: S1
  verifies_postcondition:
    - S1.POST.1
    - S1.POST.2
    - S1.POST.3

- id: AC-C-3
  text: Fault-injected mid-write does not leave a partial block.
  evidence_type: unit_test
  verification_method: |
    File: tests/unit/appendBlock-atomicity.test.ts
    Test required:
      - "When file-write throws mid-stream, ledger returns prior state, not partial"
    Use vi.mocked() on the file-write per C1.check_rule.
    Run: `npm test -- tests/unit/appendBlock-atomicity.test.ts`
    Test must pass.
  verifies_constraint: C1
  
- id: AC-C-4
  text: Caller's payload object is not mutated during appendBlock.
  evidence_type: unit_test
  verification_method: |
    File: tests/unit/appendBlock-no-payload-mutation.test.ts
    Test required:
      - "Payload object is deep-equal to pre-call snapshot after appendBlock"
    Use structuredClone() per C3.check_rule.
    Run: `npm test -- tests/unit/appendBlock-no-payload-mutation.test.ts`
    Test must pass.
  verifies_constraint: C3
```

Four AcceptanceCriteria. Each names the test file, the test name, the run command, and what it verifies. The engineer's task list is now mechanical:

1. Run `tsc --noEmit` → AC-C-1 passes
2. Write `tests/unit/appendBlock-postconditions.test.ts` with three tests → run → AC-C-2 passes
3. Write `tests/unit/appendBlock-atomicity.test.ts` with the fault-injection test → run → AC-C-3 passes
4. Write `tests/unit/appendBlock-no-payload-mutation.test.ts` with the snapshot test → run → AC-C-4 passes

No interpretation. No "what should I test?" The SIG declared four tests; the engineer writes them.

**SIG fortification this moment requires:**

- **AcceptanceCriterion nodes carry `evidence_type` and `verification_method`** (concrete instructions for the engineer).
- **`VERIFIES` edges** from AcceptanceCriterion to Constraint, Principle, Service, or specific pre/postcondition. This is the structural addition that makes the right bookend writable as a query — at completion, the engineer's evidence is *automatically linked* to what it verified.

## The reporting moment

The engineer writes the four tests. Runs them. All pass. Reports:

```
sig.report_phase_done("simple-ledger", "v0.1.0-pre", "C", {
  acceptance_criteria: [
    { id: "AC-C-1", status: "met", evidence: { tsc: "passed", grep_match: true } },
    { id: "AC-C-2", status: "met", evidence: {
        test_file: "tests/unit/appendBlock-postconditions.test.ts",
        tests_passed: 3, tests_failed: 0,
        verified: ["S1.POST.1", "S1.POST.2", "S1.POST.3"]
    }},
    { id: "AC-C-3", status: "met", evidence: {
        test_file: "tests/unit/appendBlock-atomicity.test.ts",
        tests_passed: 1, tests_failed: 0,
        verified: ["C1"]
    }},
    { id: "AC-C-4", status: "met", evidence: {
        test_file: "tests/unit/appendBlock-no-payload-mutation.test.ts",
        tests_passed: 1, tests_failed: 0,
        verified: ["C3"]
    }}
  ]
})
```

The SIG, on accepting this report, **automatically traverses the `VERIFIES` edges and updates the verified nodes**:

- S1's verification status updates: postconditions S1.POST.1, S1.POST.2, S1.POST.3 all marked verified, with evidence pointing to AC-C-2.
- C1's verification status updates: verified by AC-C-3.
- C3's verification status updates: verified by AC-C-4.

This is what closes the loop. The engineer reported evidence at the AcceptanceCriterion level; the SIG propagates the verification to every node the AC declared it verifies. The right bookend, when rendered, doesn't have to scan AC reports; it just queries:

```cypher
MATCH (c:Contract {archetypeName: $archetype})-[:DECLARES_CONSTRAINT]->(co:Constraint)
OPTIONAL MATCH (ac:AcceptanceCriterion)-[:VERIFIES]->(co)
RETURN co.key, co.name, co.verification_status, ac.evidence
```

One query. Complete picture of constraint verification.

## What happens when verification fails

Suppose the engineer writes the atomicity test for AC-C-3, runs it, and it fails — the implementation does leave partial blocks on mid-write fault. The engineer reports:

```
sig.report_phase_incident("simple-ledger", "v0.1.0-pre", "C", {
  type: "criterion_failed",
  criterion_id: "AC-C-3",
  evidence: {
    test_file: "tests/unit/appendBlock-atomicity.test.ts",
    expected: "ledger.latest() returns prior block on fault",
    actual: "ledger.latest() returns partial block",
    constraint_violated: "C1",
    severity: "block"
  },
  proposed_resolution: |
    Implementation needs to be refactored to write to a temp file, fsync, then
    rename. Current implementation writes directly. Refactor estimated 30 min.
})
```

The SIG creates a `BuildIncident` node (fortification finding #4). Phase C's status becomes `criterion_failed`. The engineer is allowed to attempt the fix themselves — same phase, more work — or to stop and Signal the manager if the fix is beyond the phase's scope.

The audit trail: Phase C started → atomicity test failed → incident created → engineer fixed it → atomicity test passed → AC-C-3 marked met → Phase C completed. All visible as graph traversals.

## What the micro story surfaced

Reading the macro story revealed six fortification needs. Reading the micro story confirms four of them and adds three more concrete ones:

**Confirmed (already in the macro analysis):**

- Constraint nodes need `check_rule` and `check_severity` — concrete here: `check_rule` is the operational test specification.
- AcceptanceCriterion nodes exist as first-class — concrete here: they carry `evidence_type` and `verification_method`.
- BuildIncident nodes — concrete here: criterion_failed is one kind of incident.
- Structured evidence properties — concrete here: AC evidence is a structured map, not a string.

**Newly surfaced (or more concretely specified):**

- **Service nodes need `preconditions` and `postconditions` as structured lists.** Each has its own `id`, `text`, and `verify` description. Tests verify specific pre/post IDs.
- **`CONSTRAINS` and `REALIZES` edges** make scope explicit: which Service is constrained by which Constraint; which Service realizes which DataObject. Cross-cutting vs. scoped constraints become visible via the presence or absence of `CONSTRAINS` edges.
- **`VERIFIES` edges** from AcceptanceCriterion to Constraint/Principle/Service/Postcondition. This is the structural addition that makes verification propagation automatic. When the engineer reports AC-met, the SIG knows which nodes to mark verified.

## The micro story's load-bearing finding

If I had to name one structural addition that makes the difference between methodology-as-prose and methodology-as-runnable, it is the **`VERIFIES` edge from AcceptanceCriterion to Constraint/Principle/Service**, combined with the AcceptanceCriterion's `verification_method` field.

Together they say: *here is exactly what test to run, and here is what the test verifies.* The engineer's verification step becomes mechanical. The right bookend writes itself. Nothing depends on the engineer's interpretation of prose.

Without these, the engineer reads constraints in prose and writes tests "based on what they seem to ask for" — the same drift the recipe-file pattern had. With them, the SIG declares the test; the engineer writes the declared test; the SIG records what was verified.

## The microscopic flow, in one sentence

> The engineer asks the SIG what to verify, gets a structured test specification, writes the declared tests, runs them, reports the AcceptanceCriterion as met, and the SIG automatically propagates verification to every node the AC declared it verifies.

Each step in that sentence is a function of the SIG's structure, not the engineer's judgment. That's what fortified ontology means.

🖇️ *Micro story written 2026-05-21 17:36 EDT. Companion to STORY-AGENT-SIG.md. Tests its own design at the verification level. Surfaces three additional fortification findings: pre/postconditions as structured lists, CONSTRAINS/REALIZES edges, VERIFIES edges as the load-bearing structural addition.*
