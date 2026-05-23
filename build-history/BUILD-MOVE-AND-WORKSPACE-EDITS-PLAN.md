# BUILD-MOVE-AND-WORKSPACE-EDITS-PLAN

*2026-05-22 21:55 EDT. Plan-with-sign-off for the move of THE-ARCHAEOLOGIST.md into the archetypes registry under a new `code-archaeology-blackboard` composition archetype, plus the workspace-concept edits to both THE-ARCHAEOLOGIST.md and THE-BLACKBOARD.md.*

**Sign-off required before sub-agent spawn.**

---

## Context

Two doctrine errors compounded over the evening of 2026-05-22:

1. **THE-ARCHAEOLOGIST.md was placed in `solution-intelligence/docs/`** alongside runtime doctrine (INSTANCE-PORTABILITY.md, PIPELINE.md). But The Archaeologist is a Knowledge Source story belonging to a Blackboard composition, not to the SI runtime.

2. **The archetypes registry has no precedent for nested composition archetypes**, but the Blackboard pattern needs them. `blackboard` is the pattern; `code-archaeology-blackboard` is the concrete composition for codebase-archaeology problems.

Additionally, the 21:34 conversation surfaced **the workspace-within-workspace concept** — logical zones within the same SIG, each with its own KS roster and commit policy. This needs to land in both THE-ARCHAEOLOGIST.md (story-level) and THE-BLACKBOARD.md (doctrine-level) for the docs to stay coherent.

Three companion threads of work bundle into one plan:

- **Move** THE-ARCHAEOLOGIST.md from `solution-intelligence` to a new home in `archetypes`
- **Create** the `code-archaeology-blackboard` composition archetype skeleton
- **Edit** both THE-ARCHAEOLOGIST.md and THE-BLACKBOARD.md to land the workspace concept

The bundle is one plan because the cross-references between docs must stay coherent across the changes.

Bill confirmed at 21:49 EDT: name = `code-archaeology-blackboard`, one plan, tonight.

---

## Pre-conditions (verified at plan time)

- `wfredricks/archetypes` main HEAD: `a24806ea` ("blackboard: upgrade stub with full design") — 2026-05-23T00:03:11Z
- `wfredricks/solution-intelligence` main HEAD: `219d4c8e` ("docs: add THE-ARCHAEOLOGIST.md") — 2026-05-23T00:03:31Z
- THE-ARCHAEOLOGIST.md: 116 lines, 19531 bytes, 8 sections (I-VIII)
- THE-BLACKBOARD.md: 132 lines, 23138 bytes, 9 sections (I-IX)
- No active sub-agents (verified at plan time)

---

## Hard constraints

1. **One plan, two PRs.** The move spans two repos; both PRs must merge together so cross-references stay coherent. Neither PR merges until both are reviewed.
2. **No content edits in the move commit.** Use `git mv` (or its byte-identical equivalent) so the file's history is preserved cleanly. Workspace edits happen in a *separate* commit on top of the move.
3. **Cross-references must be coherent post-merge.** Three documents reference each other after the move; the validation step verifies all three.
4. **Wall-clock cap: 90 minutes.** If the sub-agent isn't done in 90 minutes, STOP and write FINDINGS. (Recent runs have been 19-30 min; 90 min is generous.)
5. **No new infrastructure.** Pure doc moves + doc edits + one new YAML file. No code touched.
6. **No edits to §II ("The rule") or §VIII ("The afternoon report") of THE-ARCHAEOLOGIST.md.** These are the story's heart and closing; per the 21:45 analysis, leaving them alone preserves the story's voice.
7. **`solution-intelligence` repo gets a redirect note**, not just a deletion. The doc has been referenced in commits already; a reader following an old reference should know where the doc moved.
8. **Sub-agent uses plan-driven discipline.** If scope expands beyond what's listed here, STOP and write FINDINGS; do not improvise.
9. **Provenance JSDoc on every new file.** Every new file (the composition archetype's ARCHETYPE.md/yaml, the redirect note) carries authorship date (2026-05-22) and a pointer to this plan.
10. **`archetypes/METHODOLOGY.md` is OUT OF SCOPE for this plan.** The "patterns and compositions" doctrine layer surfaced at 21:50 is worth writing but is *not* part of tonight's work. Capture it as backlog instead.

---

## Phase A — `wfredricks/archetypes` repo work

### A1. Create the composition archetype skeleton

**New files (all under `archetypes/blackboard/code-archaeology-blackboard/`):**

#### A1.1 `ARCHETYPE.md` (composition identity, narrative)

Approximately 80-120 lines of markdown. Sections:

- **Status banner** matching the `blackboard` parent's style (stub — design-document-only until reference impl exists)
- **Description** — names this as a concrete composition of the Blackboard pattern for codebase-archaeology problems; cites the parent (`blackboard`) and the planned first adopter (`dla-stores-solution-intelligence`)
- **Workspaces hosted** — three workspaces: structural, attribution, interpretation; one paragraph each describing what each holds and which view tags dominate
- **Knowledge Source roster (planned)** — parser KSes (Tree-sitter-CSharp, ANTLR-COBOL, Mechanical-Symbol-Resolver), attribution KSes (Visitor, Persistence-Mapper, Integration-Mapper), interpretation KSes (Feature-Discoverer, biz-deriver, dom-deriver, impl-deriver), evidence KSes (test-corpus, configuration, documentation, git-history — all named, none yet built), operator KSes (review-queue, human-SME-interface)
- **Composes** — the Blackboard pattern, plus (transitively via Blackboard) graph-db and events-spine
- **What this composition provides vs. what adopters provide** — provides: workspace boundaries, commit policies, KS registry conventions, audit-trail edges; adopters provide: language-specific parser KS instantiation, codebase-specific configuration, operator review surface
- **Docs index** — pointer to `docs/THE-ARCHAEOLOGIST.md` and (placeholder list for future) THE-PERSISTENCE-MAPPER, THE-INTEGRATION-MAPPER, THE-FEATURE-DISCOVERER

The doc should feel like a sibling to `blackboard/ARCHETYPE.md` in tone and structure — not a runtime spec, a pattern spec.

#### A1.2 `ARCHETYPE.yaml` (composition manifest)

```yaml
name: code-archaeology-blackboard
kind: composite
parent: blackboard
description: >
  The Blackboard pattern composed for the problem of codebase archaeology.
  Hosts three workspaces (structural, attribution, interpretation) and a
  Knowledge Source roster spanning parsers, symbol resolvers, attribution
  agents (the Visitor and her siblings), and interpretation agents
  (Feature-Discoverer, biz-deriver, dom-deriver, impl-deriver).
reference_languages:
  primary: typescript
  available_translations: []
composes:
  - blackboard          # parent pattern
  # graph-db and events-spine are transitively composed via blackboard
workspaces:
  - name: structural
    contents:
      - SourceFile
      - AstNode
      - MethodCall
      - ResolvesTo
      - Annotation
      - Comment
    dominant_views: [code]
    commit_policy: auto-commit
    commit_policy_rationale: >
      Parser output is mechanically deterministic; no human review needed
      for AST and symbol-resolution nodes.
  - name: attribution
    contents:
      - DataObject
      - Field
      - DataStore
      - Integration
    dominant_views: [code]
    commit_policy: operator-review
    commit_policy_rationale: >
      Classification of fields by intent (private/persisted/transmitted/derived)
      involves judgment calls below the strong-signal threshold; operator review
      is the discipline that keeps the catalogue honest.
  - name: interpretation
    contents:
      - Feature
      - UseCase
      - Requirement
      - Entity
      - DomainProcess
      - DomainRule
      - ScopedApp
      - UpdateSet
      - CatalogItem
    dominant_views: [biz, dom, imp]
    commit_policy: operator-plus-stakeholder-review
    commit_policy_rationale: >
      /biz Features, /dom Entities, and /imp UpdateSets shape the customer's
      modernization deliverables; commit requires both operator review and
      customer-stakeholder sign-off.
knowledge_sources_planned:
  structural:
    - tree-sitter-csharp-ks
    - antlr-cobol-ks
    - mechanical-symbol-resolver-ks
    - language-detection-ks
  attribution:
    - visitor-ks
    - persistence-mapper-ks
    - integration-mapper-ks
  interpretation:
    - feature-discoverer-ks
    - biz-deriver-ks
    - dom-deriver-ks
    - impl-deriver-ks
  evidence:
    - test-corpus-ks
    - configuration-ks
    - documentation-ks
    - git-history-ks
  operator:
    - review-queue-ks
    - human-sme-interface-ks
adopters: []
defects_known: []
status: stub-design-only
status_note: >
  Composition named 2026-05-22 evening after the Blackboard pattern was
  framed by Bill. No reference implementation exists. First adopter target:
  dla-stores-solution-intelligence. See docs/THE-ARCHAEOLOGIST.md for the
  Visitor (the first Knowledge Source pattern in the attribution workspace).
provenance:
  authored: 2026-05-22
  plan: artifacts/archetypes/build-history/BUILD-MOVE-AND-WORKSPACE-EDITS-PLAN.md
```

#### A1.3 `docs/` directory (created empty initially; A2 moves THE-ARCHAEOLOGIST into it)

### A2. Move THE-ARCHAEOLOGIST.md into the new home

**Source:** `solution-intelligence/docs/THE-ARCHAEOLOGIST.md` (in the `wfredricks/solution-intelligence` repo)
**Destination:** `archetypes/blackboard/code-archaeology-blackboard/docs/THE-ARCHAEOLOGIST.md` (in the `wfredricks/archetypes` repo)

Because this is a cross-repo move, "preserve git history" via `git mv` is impossible at the file level. The discipline is:

- **In `wfredricks/solution-intelligence`:** delete `docs/THE-ARCHAEOLOGIST.md`; in its place, create a redirect-note file at the same path (see A4).
- **In `wfredricks/archetypes`:** create `archetypes/blackboard/code-archaeology-blackboard/docs/THE-ARCHAEOLOGIST.md` with the *exact* byte content of the deleted file (in this commit; A3 edits it after).
- **The commit messages** in both repos cite the cross-repo move explicitly so that anyone reading the history understands why the file appeared/disappeared at byte-identical content.

This is a two-commit move (one per repo), not a single git operation.

### A3. Apply workspace edits to THE-ARCHAEOLOGIST.md (the relocated file)

In the *relocated* file (now in `wfredricks/archetypes`), apply the five workspace edits identified in the 21:45 analysis:

#### A3.1 §I "The site" — add zone-introduction paragraph

Insert a new paragraph **between** the existing paragraph 2 ("What they did not do — what no one has done — is catalogue the things the inhabitants made and held...") and the existing paragraph 3 ("You are the archaeologist sent to do that work..."):

> *The site is not one undifferentiated dig. It is divided, as careful sites always are, into zones — bounded regions where one team works at a time, respecting the work of the teams that came before and leaving a clean handoff to the teams that come after. The previous expeditions worked the **structural zone**: foundations, post-holes, corridors. You are coming to work the **attribution zone**: the artifacts themselves, what they were for, what they held, what they touched. After you, the Feature-Discoverer will work the **interpretation zone**: assembling artifacts and corridors into the story of a marketplace, a treasury, a temple. The zones are part of the same site. They share a catalogue, a registry, a chronology. But each zone has its own team and its own discipline.*

#### A3.2 §IV "The walk" — name the Visitor's zone explicitly

Replace the last paragraph of §IV:

**Before:**
> *The Visitor finishes the SourceFile. It commits its findings to the site's master catalogue — the SIG. It records its confidence scores and any markings it could not classify with confidence, which surface as proposals for the human team's daily review queue.*

**After:**
> *The Visitor finishes the SourceFile. It commits its findings to the site's master catalogue — the SIG — into the attribution zone the Visitor is responsible for. The structural zone is not touched; that catalogue belongs to the parsers and was sealed by them when their work was committed. The interpretation zone does not yet exist for this material; the Feature-Discoverer will write into it later, reading what the Visitor has written here. The Visitor records its confidence scores and any markings it could not classify with confidence, which surface as proposals for the human team's daily review queue.*

#### A3.3a §V "Why the Visitor waits" — make subscription pattern zone-aware (paragraph 2)

The original §V paragraph 2 closed with a terse beat — *"It wakes, processes the delta, updates the catalogue, and goes back to waiting."* — whose rhythm matters to the section. The A3.3a edit splits the original paragraph 2 into **two** paragraphs: the new expository middle, then the terse closing beat preserved as its own paragraph.

**Before (the whole of §V paragraph 2):**
> *The Visitor in our site is summoned differently. The site itself summons. When the site changes — when a new SourceFile lands in the SIG, when an existing SourceFile is modified, when a new batch of Capability or BusinessRule nodes is ingested from a new corpus — the SIG emits an event. The Visitor is subscribed to those events. It wakes, processes the delta, updates the catalogue, and goes back to waiting.*

**After — two paragraphs replacing the one above:**

First paragraph (the new zone-subscription content):
> *The Visitor in our site is summoned differently. The site itself summons — specifically, the upstream zones the Visitor reads from. When the structural zone changes — when a parser KS lands a new SourceFile's AST, when an existing SourceFile's AST is re-parsed because the source changed, when a new corpus is ingested and a new batch of structural nodes appears — the events-spine emits events scoped to that zone. The Visitor, like every Knowledge Source, declares which upstream zones it subscribes to. The Visitor subscribes to the structural zone. The Feature-Discoverer subscribes to the attribution zone. The biz-deriver subscribes to the interpretation zone's `/biz` view. Each Knowledge Source's wake events are scoped to its inputs.*

Second paragraph (the preserved terse closing beat — keep as its own one-sentence paragraph):
> *It wakes, processes the delta, updates the catalogue, and goes back to waiting.*

#### A3.3b §V paragraph 3 — reconcile "every SIG mutation" with zone-scoped events

The original §V paragraph 3 contains the line *"The substrate emits events on every SIG mutation."* That line contradicts the new zone-scoped framing in A3.3a within five sentences. Reconcile paragraph 3:

**Before (the whole of §V paragraph 3, the one beginning "This is what *autonomous* means"):**
> *This is what *autonomous* means in the Visitor's context. It does not mean the Visitor decides on its own to start excavating Greece because Greece sounds interesting. It means the Visitor responds to the *evidence of new ground appearing*. The substrate emits events on every SIG mutation. The Visitor subscribes. The dispatch is the substrate's job; the work is the Visitor's. Operator-driven invocation is a fallback for catch-up runs after the substrate has been quiet, not the primary path.*

**After:**
> *This is what *autonomous* means in the Visitor's context. It does not mean the Visitor decides on its own to start excavating Greece because Greece sounds interesting. It means the Visitor responds to the *evidence of new ground appearing in the zones it watches*. The substrate emits events on every mutation in every zone; each Knowledge Source subscribes to the events from the zones it reads. The dispatch is the substrate's job; the work is the Visitor's. Operator-driven invocation is a fallback for catch-up runs after the substrate has been quiet, not the primary path.*

Note: "the zones it watches" uses *it*, not *she*, preserving the story's existing pronoun convention. See pronoun discipline note under A3.4.

#### A3.4 §VI "What the Visitor is not" — restate as zone-respecting discipline

Replace the final paragraph of §VI:

**Before:**
> *It is tempting, when you first imagine the Visitor, to make it do all of these things at once. Resist. The Visitor is the first of a family of sibling archaeologists, each specialist in a layer. They share the rule (set, not list). They share the substrate (subscribe to the SIG, wake on deltas, batch the work, write back). They each have a narrow remit, and the catalogue they collectively produce is composable in a way that one giant catalogue produced by one giant agent would not be. The right next agent after the Visitor is not the Visitor with more responsibilities; it is the Feature-Discoverer, who reads what the Visitor wrote and produces something the Visitor cannot.*

**After:**
> *It is tempting, when you first imagine the Visitor, to make it do all of these things at once. Resist. The Visitor is the first of a family of sibling archaeologists in the attribution zone — the Persistence-Mapper for DataStores, the Integration-Mapper for boundary crossings, the Visitor for DataObjects and Fields. Each shares the rule (set, not list). Each shares the zone (they all write into attribution). Each has a narrow remit within the zone. Beyond the attribution zone lies the interpretation zone, where the Feature-Discoverer and its own siblings will work — reading what the attribution-zone team produced and writing their own catalogue. The catalogue the attribution-zone team collectively produces is composable in a way that one giant catalogue produced by one giant agent would not be. The right next agent after the Visitor is not the Visitor with more responsibilities; it is either another archaeologist in the same zone (the Persistence-Mapper) or the first archaeologist in the next zone (the Feature-Discoverer) — each one reading what was catalogued before, contributing what only it can contribute, leaving the rest of the work to the rest of the team.*

**Pronoun discipline note (applies to ALL A3 sub-steps):** The story uses the neuter pronoun *"it"* for the Visitor throughout the existing prose. The workspace edits must preserve this convention. **Do not introduce "her" / "herself" / "she" anywhere in inserted text referring to a Knowledge Source.** If a sentence reads awkwardly without a pronoun, restructure to avoid the pronoun (use the role name — "the Visitor," "the Feature-Discoverer" — or drop the possessive entirely). The 21:58 critique caught a previous draft that introduced feminine pronouns; the A3.3a, A3.3b, and A3.4 wording above is the corrected form and is the canonical reference for tone.

#### A3.5 §VII "The Visitor on a Blackboard" — name Hearsay-II levels as zones

Two edits in §VII.

**A3.5a:** Append a sentence to the existing paragraph 2 (the one about Hearsay-II), at the end of the paragraph:

**Insert at the end of "...and let a Control component decide which Knowledge Source to invoke next based on what was currently on the workspace and what each Knowledge Source could contribute next.":**

> *The original Blackboard was not flat: it had levels — parametric, segmental, syllabic, lexical, phrasal — each one a bounded region of the workspace, with Knowledge Sources registered to specific levels. A syllable-recognizer read parametric hypotheses and wrote syllabic ones. A word-recognizer read syllabic hypotheses and wrote lexical ones. The levels were the architecture's separation of concerns. Our site's zones are the same idea.*

**A3.5b:** Replace paragraph 3 of §VII:

**Before:**
> *The SIG is our Blackboard. The Visitor is one Knowledge Source on it. The Feature-Discoverer is another. The Persistence-Mapper, the Integration-Mapper, the future biz-deriver agents — each is a Knowledge Source with its own narrow expertise, its own subscription preconditions, its own contribution. None of them sees the whole picture. None of them needs to. The picture emerges from their cumulative work on the shared workspace.*

**After:**
> *The SIG is our Blackboard. Its zones are our Hearsay-II levels: the structural zone for parsers and symbol resolvers, the attribution zone for archaeologists like the Visitor, the interpretation zone for the Feature-Discoverer and her downstream siblings. The Visitor is one Knowledge Source in the attribution zone. The Feature-Discoverer is one in the interpretation zone. The Persistence-Mapper, the Integration-Mapper, the future biz-deriver agents — each is a Knowledge Source with its own narrow expertise, its own zone, its own subscription preconditions, its own contribution. None of them sees the whole picture. None of them needs to. The picture emerges from their cumulative work on the shared workspace, layer by layer, zone by zone.*

#### A3.6 §V reconciliation check (housekeeping for the sub-agent)

After A3.3a and A3.3b are applied, §V should read as **four** paragraphs:

1. Original paragraph 1 about the site director ("A traditional archaeologist works by being summoned...") — unchanged.
2. The new zone-subscription expository paragraph from A3.3a.
3. The preserved terse closing beat from A3.3a ("It wakes, processes the delta, updates the catalogue, and goes back to waiting.") as its own one-sentence paragraph.
4. The reconciled paragraph from A3.3b ("This is what *autonomous* means in the Visitor's context...") — formerly paragraph 3, now paragraph 4.

And then §V's final paragraph 5 ("This is also why the Visitor's set-not-list discipline matters operationally...") — unchanged.

Confirm: §V has 5 paragraphs end-to-end, no orphan sentences, no double-blank-line gaps, no remaining occurrences of "every SIG mutation," no feminine pronouns referring to Knowledge Sources.

### A3.7 Footer update — companion document changed

Replace the closing footer:

**Before:**
> *Companion to `INSTANCE-PORTABILITY.md` on the solution-intelligence design shelf. Written 2026-05-22 evening.*

**After:**
> *Companion to `archetypes/blackboard/docs/THE-BLACKBOARD.md` (the pattern doctrine) and to `archetypes/blackboard/code-archaeology-blackboard/ARCHETYPE.md` (the composition this story belongs to). Written 2026-05-22 evening; workspace concept added 2026-05-22 night.*

And update the provenance footer at the bottom of the doc to add one sentence after the existing provenance:

> *The workspace-within-workspace refinement was named by Bill at 21:34 EDT on 2026-05-22 ("a bit of separation of concerns") and the docs were moved to their correct home in the archetypes registry the same evening.*

### A4. Add workspace section to THE-BLACKBOARD.md

Insert a new section **between §II and §III** (i.e. before "## III. The proposal lifecycle in more detail"). Re-number subsequent sections III→IV, IV→V, V→VI, VI→VII, VII→VIII, VIII→IX, IX→X.

New section content (call it "## III. Workspaces — the levels of the Blackboard"):

> *Hearsay-II's Blackboard was not flat. It had levels — parametric, segmental, syllabic, lexical, phrasal — each one a bounded region of the workspace where a particular kind of hypothesis lived. A syllable-recognizer Knowledge Source read parametric hypotheses and wrote syllabic ones. A word-recognizer read syllabic hypotheses and wrote lexical ones. The levels were not separate Blackboards; they were structured regions of a single Blackboard, with Knowledge Sources registered to specific level-pairs.*
>
> *Our SIG inherits this structure. A `blackboard` archetype hosts one or more **workspaces** — named, scoped regions of the SIG, each with its own Knowledge Source roster, its own commit policy, and its own dominant view tags. Workspaces are logical, not physical: they share the same storage backend, the same events-spine, the same query plane. What they separate is *concern* — which Knowledge Sources are responsible for what content, and what discipline that content is held to. Cross-workspace traversal happens through promotion edges (`DERIVED_FROM`, `PROMOTES_FROM`) that explicitly mark when content in one workspace was produced by reasoning over content in another. The traversal is auditable; the boundaries are visible.*
>
> *Commit policy is the load-bearing per-workspace concern. A workspace whose content is mechanically deterministic (a parser's AST output) commits on write — there is no review pass, no `proposed` interim state, because the substrate trusts the producer. A workspace whose content involves judgment (an attribution agent classifying a field's intent) writes content as `proposed` and a review process commits it. A workspace whose content shapes customer-visible deliverables (a `/biz` Feature, a `/dom` Entity, a `/imp` UpdateSet) writes content as `proposed` and commit requires operator review plus customer-stakeholder sign-off. The commit policy is the workspace's contract with the substrate; the workspace's identity is, in part, its commit policy.*
>
> *Concrete compositions of the `blackboard` archetype declare their workspace structure in their own `ARCHETYPE.yaml`. The first such composition is `code-archaeology-blackboard`, which hosts three workspaces — structural, attribution, interpretation — appropriate to the problem of codebase archaeology. A future `va-leads-blackboard` or `meeting-minutes-blackboard` would host different workspaces appropriate to its own problem. The pattern is the same; the workspace structure varies.*
>
> *This is the layer of doctrine that the original Hearsay-II paper called the *level structure*, and it is what gives a Blackboard system its modularity. Without it, every Knowledge Source operates on every part of the Blackboard and the substrate has no internal separation of concerns. With it, the substrate's structure mirrors the reasoning structure: parsing happens *here*, attribution happens *there*, interpretation happens *over there*, and each layer's discipline is held by the team responsible for that zone.*

### A5. Update cross-references in THE-BLACKBOARD.md

Three small edits in `archetypes/blackboard/docs/THE-BLACKBOARD.md` to reflect the move and the workspace section:

**A5.1 — §II reference to the Visitor:**

The existing line in §II reads "Tomorrow we will have the Visitor (the Archaeologist) writing the data-layer view." This is fine, no change.

**A5.2 — §III (renumbered IV) reference to THE-ARCHAEOLOGIST:**

Currently §III references "§III of THE-ARCHAEOLOGIST" (the deferred-reference proposal example). After renumbering, this becomes §IV reference. The reference itself stays correct; THE-ARCHAEOLOGIST's §III is unchanged.

**A5.3 — §IX (renumbered X) reference to where the Visitor's code lives:**

The current text reads:
> *The first adoption that consumes this — `code-explorer` inside `solution-intel` — is where the Visitor and its sibling Knowledge Sources live. The Visitor's story is in `archetypes-solution-intelligence`'s docs (`THE-ARCHAEOLOGIST.md`); the Visitor's code will live in the adopter.*

Replace with:
> *The first composition of this pattern — `code-archaeology-blackboard` — names the workspaces (structural, attribution, interpretation) and the Knowledge Source roster appropriate to codebase archaeology. The first adopter of that composition will be `dla-stores-solution-intelligence`, where the Visitor's runtime code will live alongside its sibling Knowledge Sources. The Visitor's story doctrine lives in `archetypes/blackboard/code-archaeology-blackboard/docs/THE-ARCHAEOLOGIST.md`; this Blackboard pattern doctrine lives one level up.*

### A6. Update `blackboard/ARCHETYPE.yaml`

Two small edits:

**A6.1** — the `adopters` comment line:

**Before:** `adopters: []  # populated when first adoption ships; code-explorer in solution-intel is the planned first target`

**After:** `adopters: []  # populated when first adoption ships; the code-archaeology-blackboard composition is named (archetypes/blackboard/code-archaeology-blackboard/); its first adopter target is dla-stores-solution-intelligence`

**A6.2** — the `status_note` field:

**Before:**
> *Name reserved 2026-05-21; full design document THE-BLACKBOARD.md added 2026-05-22 evening. No library exists. First reference implementation planned for code-explorer blackboard inside solution-intel's biz-deriver phase. See docs/THE-BLACKBOARD.md for the architectural pattern.*

**After:**
> *Name reserved 2026-05-21; full design document THE-BLACKBOARD.md added 2026-05-22 evening; workspace concept and first concrete composition (`code-archaeology-blackboard`) added 2026-05-22 night. No library exists. First reference implementation planned to live in `archetypes/blackboard/code-archaeology-blackboard/reference-impl/` once built; the composition's first adopter target is `dla-stores-solution-intelligence`. See `docs/THE-BLACKBOARD.md` for the pattern doctrine and `code-archaeology-blackboard/ARCHETYPE.md` for the first concrete composition.*

### A7. Commit, branch, PR on `wfredricks/archetypes`

Branch name: `move-archaeologist-and-workspaces-2026-05-22`
Commit messages:
1. `blackboard/code-archaeology-blackboard: add composition archetype skeleton`
2. `blackboard/code-archaeology-blackboard/docs: add THE-ARCHAEOLOGIST.md (moved from solution-intelligence)`
3. `blackboard/code-archaeology-blackboard/docs: apply workspace-zone edits to THE-ARCHAEOLOGIST.md`
4. `blackboard/docs/THE-BLACKBOARD.md: add §III Workspaces section; renumber later sections`
5. `blackboard: update ARCHETYPE.yaml to point at code-archaeology-blackboard composition`

(Five commits, or squash to one — sub-agent's choice. Stylistic preference: keep them separate for review legibility, then squash-merge.)

PR title: `blackboard: add code-archaeology-blackboard composition and workspace-zone doctrine; relocate THE-ARCHAEOLOGIST.md`

---

## Phase B — `wfredricks/solution-intelligence` repo work

### B1. Delete the old location of THE-ARCHAEOLOGIST.md

Remove `docs/THE-ARCHAEOLOGIST.md`.

### B2. Add a redirect note in its place

Create a new file at `docs/THE-ARCHAEOLOGIST.md` (same path, different content):

```markdown
# THE-ARCHAEOLOGIST.md — moved

This doctrine document has been relocated to its correct home in the archetypes registry.

**New location:** `wfredricks/archetypes` repo, at `archetypes/blackboard/code-archaeology-blackboard/docs/THE-ARCHAEOLOGIST.md`.

**Why moved:** The Archaeologist is a Knowledge Source story belonging to the `code-archaeology-blackboard` composition of the `blackboard` archetype. It does not describe how the Solution Intelligence runtime works; it describes a pattern that the runtime hosts. The doctrine therefore belongs in the archetypes registry, alongside `THE-BLACKBOARD.md` (the parent pattern) and the composition's `ARCHETYPE.md`.

**When moved:** 2026-05-22 night, per `wfredricks/archetypes` PR ... (link to PR once known).

This file is preserved as a redirect; do not edit it. To edit the doctrine, edit the file in its new home.
```

(The sub-agent fills in the PR link once the archetypes PR is open and has a number.)

### B3. Commit, branch, PR on `wfredricks/solution-intelligence`

Branch name: `archaeologist-relocation-redirect-2026-05-22`
Commit message: `docs: redirect THE-ARCHAEOLOGIST.md to its new home in archetypes registry`
PR title: `docs: relocate THE-ARCHAEOLOGIST.md to wfredricks/archetypes (companion PR)`

PR description must link to the companion `wfredricks/archetypes` PR. Reviewer should not merge this until the companion PR is also ready to merge; they merge together.

---

## Phase C — verification

The sub-agent performs all of these before declaring done:

### C1. File-presence checks
- `archetypes/blackboard/code-archaeology-blackboard/ARCHETYPE.md` exists
- `archetypes/blackboard/code-archaeology-blackboard/ARCHETYPE.yaml` exists
- `archetypes/blackboard/code-archaeology-blackboard/docs/THE-ARCHAEOLOGIST.md` exists
- `solution-intelligence/docs/THE-ARCHAEOLOGIST.md` exists (now as redirect note)

### C2. Content checks
- The relocated THE-ARCHAEOLOGIST.md has the workspace edits applied (verify by grep for "structural zone", "attribution zone", "interpretation zone" — each phrase should appear at least once).
- §II of the relocated THE-ARCHAEOLOGIST.md is byte-identical to the original §II (no edits there).
- §VIII of the relocated THE-ARCHAEOLOGIST.md is byte-identical to the original §VIII (no edits there).
- THE-BLACKBOARD.md has a new §III "Workspaces" section between original §II and original §III.
- Section numbering in THE-BLACKBOARD.md is contiguous I-X with no gaps.
- `blackboard/ARCHETYPE.yaml` has the updated `adopters` comment and `status_note`.
- **§V of the relocated THE-ARCHAEOLOGIST.md has FIVE paragraphs** (per A3.6): one original opening + new zone-subscription paragraph + preserved terse closing beat as its own paragraph + reconciled autonomy paragraph + original closing paragraph about set-not-list operational discipline. Count paragraphs end-to-end.
- **§V paragraph 3 contains the one-sentence beat** exactly: *"It wakes, processes the delta, updates the catalogue, and goes back to waiting."* — preserved verbatim from the original §V paragraph 2's closing line.
- **§V no longer contains the phrase "every SIG mutation"** (grep returns zero hits). The replacement phrase *"every mutation in every zone"* appears exactly once in §V.
- **No feminine pronouns referring to Knowledge Sources appear anywhere in the inserted workspace prose.** Specifically: a `git diff` between the original THE-ARCHAEOLOGIST.md (at commit `219d4c8e`) and the edited version shows zero new occurrences of " her ", " hers ", " herself ", or " she " where the referent is a Knowledge Source. (Pre-existing occurrences in §II's "previous-you" framing are fine — but there are no such occurrences in the original to begin with; the original used neuter pronouns throughout.)

### C3. Cross-reference checks
- THE-BLACKBOARD.md §X (the new §IX, renumbered) points to `archetypes/blackboard/code-archaeology-blackboard/docs/THE-ARCHAEOLOGIST.md`, NOT to `solution-intelligence/docs/...`
- The relocated THE-ARCHAEOLOGIST.md footer points to `archetypes/blackboard/docs/THE-BLACKBOARD.md`, NOT to `INSTANCE-PORTABILITY.md`
- `blackboard/ARCHETYPE.yaml`'s `status_note` references the composition correctly.
- The redirect note in `solution-intelligence/docs/THE-ARCHAEOLOGIST.md` cites the correct new path.

### C4. No-content-loss checks
- The byte content of THE-ARCHAEOLOGIST.md in its new home (BEFORE A3 edits applied) matches the byte content of the original at commit `219d4c8e`.
- All eight section headings (§I through §VIII) of THE-ARCHAEOLOGIST.md are preserved in the relocated file.

### C5. PRs ready to merge together
- Both PRs open
- Both PRs reference each other in their descriptions
- No CI failures
- Both PRs assignable to Bill for review

---

## Out of scope (explicitly NOT in this plan)

- The `archetypes/METHODOLOGY.md` "Patterns and their compositions" doctrine layer — *captured to backlog instead.*
- Reference implementation of `code-archaeology-blackboard` — that's Plan 1 from the 20:45 doc, a future plan.
- The SIG-ONTOLOGY.md / PROPOSAL-LIFECYCLE.md / KS-REGISTRY.md docs from the 20:38 creases doc — future plans.
- Adopting `code-archaeology-blackboard` into `dla-stores-solution-intelligence` — future plan.
- Updating any other docs in `solution-intelligence/docs/` (PIPELINE.md, OVERVIEW.md, etc.) to reflect the doctrine refinements — future plan.
- Touching any code (the contract-loader, the agents package, the cli, etc.).

---

## What the sub-agent does NOT do

- Does not edit §II ("The rule") or §VIII ("The afternoon report") of THE-ARCHAEOLOGIST.md.
- Does not generalize the workspace concept beyond what's in this plan.
- Does not invent new file paths or new naming conventions beyond `code-archaeology-blackboard`.
- Does not merge either PR. Both stay open for Bill's review.
- Does not modify `wfredricks/polygraph`, `wfredricks/archetypes-solution-intelligence`, or any repo other than the two named in Phase A and Phase B.

---

## Estimated wall-clock

Based on recent plan-driven sub-agent runs (Phases 1a–1e, Phase 3, Phase 3a; range 19-30 min for comparable scope):
- Phase A: 30-45 min (5 commits, ~150 lines new YAML, ~120 lines new MD, 5 file-edits to existing MD, 1 file-edit to existing YAML)
- Phase B: 5-10 min (1 file delete, 1 file create, 1 commit, 1 PR)
- Phase C: 10-15 min (verification)
- **Total: 45-70 min expected; 90 min hard cap.**

---

## If scope expands

If the sub-agent encounters something not in this plan (e.g. a CI failure that requires a config change, an unexpected file that needs editing for cross-reference coherence, a discovery that the workspace concept needs a different name or shape), it STOPS and writes a FINDINGS file at `artifacts/archetypes/build-history/BUILD-MOVE-AND-WORKSPACE-EDITS-FINDINGS.md` describing:

- What was attempted
- What surprised
- What it would have done if it kept going
- A recommendation for the next plan

No improvisation. The "Recipe has a bad taste to me" rule from 2026-05-22 morning applies in full force.

---

## Sign-off line

Bill signs off here if/when he approves:

`Approved by Bill at: ___________________`

🖇️
