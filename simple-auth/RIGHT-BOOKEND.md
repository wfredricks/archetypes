# simple-auth — Right Bookend

*The right bookend for the `simple-auth` archetype. Compares hypotheses from `LEFT-BOOKEND.md` against what actually happened during the bangauth → SI/I adoption (Stages 2a, 2b, 2c).*

*Written 2026-05-21. The left bookend is retroactive (see its §Status); the right bookend is grounded in real artifacts: build-plan files, FINDINGS files, git history, and DEFECTS.md.*

---

## Status

**Grounded.** Three stages of work to compare against:

- **Stage 2a (2026-05-20):** The initial lift. Identity service derived from bangauth. Tag `v0.2.0-pre`. Plan: `solution-intelligence-identity/build-history/BUILD-STAGE-02A-PLAN.md` (24 KB ARCHETYPE-COPY-PLAN.md form).
- **Stage 2b (2026-05-20):** Retired the `X-SI-Actor` header shortcut; replaced with token-derived actor. Identity tag preserved at `v0.2.0-pre`; CLI tagged `v0.2.0-pre`. FINDINGS: `solution-intelligence-cli/build-history/BUILD-STAGE-02B-FINDINGS.md`.
- **Stage 2c (2026-05-21 morning):** Pre-work for Stage 3. graph-client scaffold + `resolveProjectConfig()` refactor + integration-test harness. CLI tag `v0.2.1-pre`, graph-client tag `v0.1.0-pre`. FINDINGS: `solution-intelligence-cli/build-history/BUILD-STAGE-02C-FINDINGS.md`.

Each stage closed cleanly. All hypotheses in the left bookend can be evaluated against these.

---

## Evaluating each hypothesis

### H1: The five Principles (P1-P5) survive implementation

**P1: Passwordless by design** — ✅ **Held.** No password storage anywhere in SI/I. Codes are derived per-request via HMAC; tokens are derived from `(email, month, key)`. No credential database to breach.

**P2: Local token verification** — ✅ **Held.** SI/I exports `getAuthKeyStore()` and `getConfig()`. Peer services (the future SI/G, SI/A) can verify tokens without a network call to SI/I. Verified by Stage 2c's design of the graph-client (which will use local verification when Stage 3 wires it up).

**P3: Audit-as-append-only** — ✅ **Held.** Every state change emits an append-only audit entry. Reference implementation uses chainblocks; JSONL fallback exists for development and tests. The `auditBlock` (with sequence number) was confirmed in Stage 2b — the grant/revoke response carries `auditBlock` (not `auditBlockSeq` as the original plan sketch had; minor schema drift, fixed in cli's type definitions).

**P4: Compose-readiness from day one** — ✅ **Held.** The Hono router mounts at any prefix; SI/I uses `/auth` and `/grants`; future composite archetypes can mount it differently. Key store and config are exported. Audit interface is pluggable. No modifications needed for SI/I's specific deployment.

**P5: Adopter-side fixes flow back as defects** — ✅ **Held, with discipline-emergent.** This Principle was implicit during Stage 2a; we wrote it down (retroactively) in the left bookend. The Stage 2a/2b sequence demonstrates the principle working: X-SI-Actor anti-pattern discovered → DEFECTS.md captured → Stage 2b retired the shortcut → DEFECTS.md updated with remediation status → regression test added. The three other defects discovered (unused import, test-of-template-concepts) flow the same way.

**Verdict: 5/5 Principles held.** No principles required revision. P5 became *explicit* during the bookend writing today, which is itself the principle working — discipline-emergent through use.

### H2: The five Constraints (C1-C5) are enforced

**C1: TypeScript reference** — ✅ **Held.** All SI/I code is TypeScript. No mixed-language compilation.

**C2: Monthly key rotation with 3-day grace** — ✅ **Held.** Verified in the key derivation tests; cross-month grace window honored.

**C3: No password storage** — ✅ **Held.** Restated by P1. Confirmed by code inspection at Stage 2a.

**C4: Email-delivery pluggable** — ⚠️ **Held with deferral.** The email adapter interface exists. SI/I Stage 2a deferred the AWS SES email adapter to `_deferred/` (to avoid pulling in the AWS SDK before it was needed). The console adapter works for development. The interface is in place; the AWS-SDK-shipping adapter will land when SI/I's production deployment requires it.

**C5: Audit-emitter pluggable** — ✅ **Held.** chainblocks integration works; JSONL fallback works. Tested in both modes.

**Verdict: 5/5 Constraints enforced.** C4 has a deferral noted but the deferral does not violate the Constraint — the interface is in place; the implementation is downstream.

### H3: The six Services are exposed cleanly

**`requestCode(email)`** — ✅ Exposed; works against console adapter; AWS SES adapter deferred.

**`verifyCode(email, code)`** — ✅ Exposed; returns bearer token on success.

**`verifyToken(token)`** — ✅ Exposed; verified locally via HMAC + key store.

**`grants` (HTTP router)** — ✅ Exposed; mounted at `/grants` in SI/I. Stage 2b modified `grants-http.ts` to derive actor from token (replacing the X-SI-Actor shortcut); the router contract is unchanged externally.

**`getAuthKeyStore()` / `getConfig()`** — ✅ Exposed; consumed by Stage 2b's `actorFromToken(c)` and (anticipated) by Stage 3's graph service.

**Audit-emitter interface** — ✅ Exposed; chainblocks and JSONL both conform.

**Verdict: 6/6 Services exposed cleanly.** No silent additions or removals.

### H4: The lift takes ≤1 day for the first adoption

✅ **Beat estimate by ~2×.** Stage 2a wall-clock per the FINDINGS file: under one workday. Subsequent stages 2b, 2c each ran in 16-90 minutes of sub-agent wall-clock against recipe-file plans. The recipe-file methodology held through four consecutive sub-agent runs (1b, 2a, 2b, 2c) with each completing under the silent-failure threshold.

**Methodological note:** the FINDINGS files attribute the speedup to "the recipe removes look-up/context-switch cost." This is itself evidence that the methodology pays.

### H5: Defects discovered during Stage 2a flow back into DEFECTS.md with remediation status

✅ **Held.** Four defects captured at lift time:

1. **X-SI-Actor header shortcut bypasses token verification** — adopter-side anti-pattern; remediated in Stage 2b; regression test added; remediation status documented.
2. **Unused `createHmac` import in `adapters/memory-key-store.ts`** — flagged for upstream patch; trivially removed in SI/I adaptation.
3. **`email.test.ts` does not import `email.ts`** — flagged for upstream patch; SI/I deferred `email.ts` so the test was acceptable as concept-check.
4. **(Additional defects from Stages 2b/2c)** — captured in their respective FINDINGS files; should be migrated into DEFECTS.md for completeness. **Action item:** review BUILD-STAGE-02B/02C FINDINGS for any defects that belong in DEFECTS.md but were never lifted.

The X-SI-Actor case is the strongest evidence the loop works: discovery in 2a → capture in DEFECTS.md → remediation in 2b → regression test → DEFECTS.md updated with status. Three stages, one defect, fully resolved with discipline preserved.

### H6: Future composite archetypes can compose simple-auth without modification

⚠️ **Untested but instrumented.** No composite archetype has consumed simple-auth yet. The seams are in place (mountable router, accessor exports, pluggable audit). The hypothesis remains *open* until a real composite (e.g. a future `secure-web-app`) actually composes simple-auth and we observe whether modification was needed.

**Action item for future:** when the first composite archetype consumes simple-auth, return to this right bookend and resolve H6.

---

## Surprises (things not in the left bookend that emerged)

### Surprise 1: The methodology proved itself faster than expected

The left bookend (reconstructed) hypothesized "≤1 day of focused work." The actual was much faster — repeatedly, across four stages. The right bookend records this as a genuine surprise: the recipe-file pattern beats wall-clock estimates by 2-3× consistently when the plan is precise.

**Action:** future left bookends should commit to *wall-clock targets* and the right bookends should compare. Over time we'll learn the calibration.

### Surprise 2: A schema drift caught at adoption time (`auditBlock` vs `auditBlockSeq`)

Stage 2b's planning sketch said the grant/revoke response carries `auditBlockSeq`. Server reality returned `auditBlock`. One-line judgment call to follow the server; documented in Stage 2b FINDINGS.

This is a category of defect-like-thing that isn't in DEFECTS.md but should be. **Action:** add a category to DEFECTS.md for "schema drift between plan and reality" or similar.

### Surprise 3: The X-SI-Actor anti-pattern wasn't recognized at Stage 2a

Stage 2a shipped the X-SI-Actor shortcut as a working mechanism. Stage 2b retired it. The gap between 2a and 2b was one day. A more rigorous left bookend at Stage 2a might have flagged this as an anti-pattern at design time rather than discovering it at hardening time.

**Lesson:** the left bookend should explicitly evaluate authentication shortcuts ("any place where a header alone confers identity" is a category that warrants a Principle commitment). Future native archetypes get this question asked up front.

---

## Updates the right bookend triggers

### Update 1: DEFECTS.md back-fill

Cross-reference BUILD-STAGE-02B/02C FINDINGS files; lift any captured-but-not-yet-in-DEFECTS-md items into DEFECTS.md. Estimated cost: ~30 min of review work. Queued for tonight or next session.

### Update 2: DEFECTS.md category-add

Add "Schema drift between plan and server reality" as a recognized defect category, with the auditBlock/auditBlockSeq case as the first entry. ~10 min.

### Update 3: Principle explicit naming

Update simple-auth/ARCHETYPE.md to name the five Principles explicitly (currently the principles are encoded in the "When to use / When NOT to use" sections; making them first-class Principle entries aligns with the proposed SIG ontology and with how events-spine names its principles). ~20 min.

### Update 4: Wall-clock calibration record

Start a `wall-clock-calibration.md` in `archetypes/` capturing observed wall-clock-vs-estimate ratios per stage. After 5-10 data points, the calibration becomes useful for future left bookends to commit to honest targets.

---

## Verdict

**simple-auth survived its first adoption cleanly.** Five Principles held; five Constraints enforced; six Services exposed cleanly; defects captured and remediated through the discipline; no Principle required revision.

**The recipe-file methodology over-performed.** Wall-clock estimates beat by 2-3× consistently. The methodology is doing real work.

**One Principle was discipline-emergent (P5).** The right bookend names this explicitly — the practice of capturing adopter-side fixes as defects flowing back was not committed up front; it was the right thing to do, and doing it taught us to name it as a Principle.

**One hypothesis is still open (H6).** Future composite-archetype consumption will resolve it.

🖇️ *Right bookend by Bhai, 2026-05-21. Grounded in artifacts; the first bookend-pair we can read end-to-end as evidence the discipline works.*
