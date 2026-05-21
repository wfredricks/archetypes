# Declarative Software Development — PR/FAQ

*Working scoping document. Amazon-style PR/FAQ. NOT a paper yet. Written 2026-05-21 by Bhai with Bill in the loop. Status: WIP. Owner: Bill.*

---

## Status

This is a **scoping artifact**, not a paper. The purpose is to externalize the load-bearing claims and surface the resistance early, before committing engineering resources to the full thesis.

The PR is written *as if shipping today*. It isn't. Two-thirds of what the PR claims is in motion as of 2026-05-21; one-third (the orchestrator) is unbuilt. The point of writing the PR before the thing exists is to know what we're aiming at.

**Decision posture:** Bill has NOT committed to writing the seminal paper. This document accumulates the case for or against committing. Revisit when:
- 3+ archetypes have been adopted with the methodology
- The orchestrator pattern is built and demonstrated
- Someone outside the immediate shop has adopted an archetype

---

## Press Release (DRAFT)

### A New Way To Build Software: Declarative Composition Of Proven Patterns

> *Engineers stop scaffolding and start composing. AI agents handle the mechanical work that comprised 60-80% of every project. Humans direct.*

**Lancaster, PA — \[Future date\]** — Software development today is mostly the re-implementation of patterns that have already been solved many times. Auth. Audit logs. Event buses. Graph rendering. Natural-language interfaces. Every project that needs these things builds them again, slightly differently, often slightly worse. Skilled engineers spend most of their day re-paving roads that other engineers paved last year.

**Declarative Software Development** changes the unit of work. Instead of writing code, engineers and AI agents compose proven patterns — **archetypes** — from an open registry. Each archetype is a hardened design with a reference implementation, an adoption recipe, a known-defects list, and a list of projects that have already adopted it. Adopting an archetype means deriving from the reference, marking provenance, fixing known defects on the way in, and contributing back any new defects discovered.

This is not low-code. Low-code hides the implementation behind a vendor's widgets; declarative SDD exposes the implementation, marks every line with its origin, and gives the adopter complete ownership of their derivation. Low-code traps you in a tool; archetypes give you a starting point you can fully read, modify, and own.

**What ships today** *(written in the future tense, pre-orchestrator)*:

- **An open archetypes registry** at `github.com/wfredricks/archetypes`. Currently \[N\] archetypes, including `simple-auth`, `simple-ledger`, `graph-db`, `events-spine`, `blackboard`, and `nl-chat-substrate`. Each archetype has a pattern description, a composition specification (for composite archetypes), an adoption recipe, a defects list, and a list of adopters. Composition allows complex archetypes to be built from primitives, so the registry scales without devolving into a flat catalog.

- **An orchestrator** that translates declarative intent ("build me a secure web app fronting a SIG blackboard") into a composition of archetypes plus the adapters between them. The orchestrator runs as an AI agent with access to the registry; it generates the project skeleton, supervises the per-archetype adoption sub-agents, and hands the composed result back to the human.

- **A methodology** — codified at `github.com/wfredricks/archetypes/METHODOLOGY.md` — that governs how archetypes get adopted, marked, defected, and refined. The methodology is the discipline that prevents declarative SDD from collapsing into the failures of low-code: every adoption is fully owned, fully marked, and fully readable by the adopter.

- **Working examples**: the Solution Intelligence runtime (`solution-intelligence-identity`, `solution-intelligence-cli`, `solution-intelligence-graph-client`, `solution-intelligence-graph`) is built entirely by composing archetypes. \[Specific metrics from the build.\] What would have been a quarter of careful engineering work was delivered in \[N\] days, with every component carrying provenance markings that let any reader trace back to the canonical archetype.

**"The shift is not from manual to automated,"** said Bill Fredricks, originator of the approach. **"It's from re-implementing patterns to composing them. AI agents do the mechanical work; humans do the parts that need judgment. The unit of work changes, and that changes who can do the work and how fast it gets done."**

The Declarative SDD model is open. The archetypes are open. The methodology is published. The orchestrator is a reference implementation. Anyone can add archetypes, propose compositions, or build their own orchestrator that speaks the same vocabulary.

---

## FAQ

*Each question gets a real answer in Bill's voice (drafted by Bhai for Bill to edit). Questions ordered roughly by severity of the objection.*

### 1. Isn't this just low-code with extra steps?

**Short answer:** No, and the difference is load-bearing.

**Long answer:** Low-code hides the implementation. You drag a widget; the vendor's code generates underneath; you can't read it or modify it safely without breaking the contract with the vendor. When the platform's abstractions don't fit your case, you're stuck.

Declarative SDD does the opposite. Adoption *means* deriving the actual code from a reference implementation, marking every file with its provenance, and owning the result completely. You can read every line. You can modify any of it. The marking conventions tell future readers where the lines came from, which means modifications get audited cleanly. **There's no vendor in the loop.** The archetypes registry is open; the methodology is published; the orchestrator is a reference, not a SaaS.

The one-line differentiation: **low-code hides; declarative SDD marks.**

### 2. Aren't you just describing scaffolding tools, code generators, or framework templates?

**Short answer:** No — scaffolding generates code once and walks away. Archetypes are living agreements.

**Long answer:** Scaffolding tools (Rails generators, `create-react-app`, `cookiecutter`) generate a project skeleton once. After that, the skeleton is yours alone; the scaffolding tool has no further relationship to it. If the scaffolding template improves, your project doesn't benefit. If a bug is found in the template's auth code, every project ever scaffolded from it carries the bug.

Archetypes maintain a living relationship:
- An archetype has an adopters list, so when a defect is discovered, every adopter is known.
- An archetype has a defects-known list, which adopters must address on the way in.
- An archetype gets refined by adoption findings, and those refinements flow back to the registry.
- Adopters can compare their derivation against the current archetype to spot drift.

Scaffolding is a one-way transaction. Archetypes are a continuous, marked, two-way relationship.

### 3. Who decides what becomes an archetype? Doesn't this concentrate power in whoever runs the registry?

**Short answer:** Anyone can run a registry. The methodology is the open standard; registries are open implementations.

**Long answer:** The methodology document (`METHODOLOGY.md`) defines what makes something an archetype: a pattern description, an adoption recipe, marking conventions, a defects list, and an adopters list. Any organization can host a registry that follows the methodology. The reference registry at `wfredricks/archetypes` is one example; corporate registries (a `credence/archetypes`, a `va-oit/archetypes`) would be others. Cross-registry composition is part of the design: an archetype in one registry can compose archetypes from another.

The methodology is the standard. The registries are implementations of the standard. Compare with HTTP: the standard is open; the servers (Apache, nginx, IIS) are open or proprietary implementations.

### 4. How is this different from npm/PyPI/Maven? Aren't those archetypes-by-another-name?

**Short answer:** Package managers ship runtime code. Archetypes ship derivable patterns.

**Long answer:** Package managers distribute libraries you depend on at runtime. You install `express`; your code calls into `express`'s code; you don't read or own most of what `express` does. That's appropriate for runtime utilities.

Archetypes distribute patterns you derive into your project. You don't depend on `simple-auth` at runtime; you derive `simple-auth`'s code into your project, mark provenance, adapt for your case, and own the result. Your runtime depends on no archetype. The archetype shaped what you built; it isn't running inside it.

This matters for federal deployments, supply-chain security, long-term maintenance, and cases where vendoring is required. It also matters because *derivable* code is the only kind an AI orchestrator can reliably compose into a coherent project. You can't ask an LLM to "compose `express` with `passport`"; the seams between them are runtime-coupling. You CAN ask it to "compose `simple-auth` with `audit-log` into a new project," because both come with adoption recipes and known integration points.

### 5. What's the role of AI in this? Could you do declarative SDD without LLMs?

**Short answer:** You could do the registry without LLMs. You can't do the orchestrator without them, and the orchestrator is what makes the whole thing scale.

**Long answer:** The archetypes registry is just a structured collection of patterns + recipes. Humans have always composed patterns — every senior engineer has a mental registry of "how I do auth" and "how I do logs." Codifying it as a public registry would be valuable even in 2010.

What changed in 2024-2026 is that LLMs can read recipes, generate code from them, mark provenance, and supervise sub-agents that execute mechanical steps. That collapses the cost of composition by 10-100×. The orchestrator pattern — "human declares intent; orchestrator picks archetypes; sub-agents execute adoption recipes" — wasn't feasible before. Now it is.

So: the registry without LLMs is a nice-to-have. The registry with LLMs becomes a new mode of software development.

### 6. How does this handle the parts of a project that aren't archetypable — the genuinely novel business logic?

**Short answer:** Those parts stay human + AI work. The point is to free up time for them.

**Long answer:** In every project, some fraction is novel — the actual problem this project exists to solve. That fraction is small (typically 10-20%) compared to the mechanical work (auth, logs, UI scaffold, integration, deployment, observability). Today most senior-engineer time gets eaten by the mechanical 60-80%. The novel part gets shortchanged.

Declarative SDD does not try to archetype the novel part. It composes the mechanical part, leaving the novel part to humans + AI working at their full capacity. The shift is in *what humans spend their day on*, not in *automating away human judgment*.

If you don't have novel work — if your project is literally "another CRUD app" — declarative SDD will compose 90%+ of it. That's not a bug; that's the appropriate outcome for that kind of project.

### 7. Doesn't this require a huge upfront investment to build the registry?

**Short answer:** The registry grows by accretion. Each project that uses the methodology contributes one or more archetypes back.

**Long answer:** You don't build a registry of 100 archetypes before using it. You start with 3-5 archetypes proven on real projects, write down what made them work, and use them on the next project. That next project teaches you about a 4th archetype or composition. You add it. You're now using a registry of 6 archetypes on the next project. By project 10, you have 20-30 archetypes.

The bangauth-to-simple-auth lift on 2026-05-20/21 is exactly this pattern. We had a working library (bangauth) and a working adoption (SI/I). We named the pattern (`simple-auth`), wrote the adoption recipe, captured the defects-fixed-on-adoption, and committed to the registry. That archetype is now reusable for any future project needing email-code authentication, and the registry is one entry richer than it was an hour ago.

The methodology funds itself.

### 8. How do you keep the archetypes from rotting? Aren't open registries known for stagnating?

**Short answer:** Marking + adopters list + defects list make rot visible. Visible rot gets fixed.

**Long answer:** Most open registries rot because adopters can't see when an archetype is stale, and the maintainers can't see who's affected. The archetype methodology builds rot-visibility in:

- **Adopters list** means a stale archetype is a public liability. When `simple-auth` has 12 adopters and a major bug is found, the methodology demands a notification path.
- **Defects-known list** means new adopters fix known issues on the way in. The archetype gets cleaner with each adoption, not dirtier.
- **Marking conventions** mean any derived code can be traced back to its source archetype, so when an archetype changes, adopters can detect drift and decide whether to re-derive.

Compare with npm packages, where you depend on the published version: if the package goes stale, your project is on the stale version forever unless you bump. With archetypes, your derivation is your derivation; the archetype's evolution affects future adoptions, not your existing project. Your project rots only if you stop maintaining it; the archetype's rot is its own concern.

### 9. What's the proof this works at scale?

**Short answer:** It's been proven at the small scale (single project) on 2026-05-20/21. Scale-proof is the next 6-12 months of work.

**Long answer:** Honest answer. As of 2026-05-21, declarative SDD has been proven for one archetype (`simple-auth` adopted into `solution-intelligence-identity` via three stages: 2a/2b/2c). One archetype, one adoption, three sub-stages. The methodology held. The marking conventions held. The defects-fix discipline held. The wall-clock estimates were beaten 2-3× by sub-agent execution against recipe files.

What we don't have yet:
- Multi-archetype composition in a single adoption
- An orchestrator that picks archetypes from a declarative intent
- Adoptions outside our immediate shop
- A registry that's grown by accretion across multiple projects

The work plan for 2026-Q2 and Q3 is exactly to build these. The PR/FAQ exists in part to make sure we're aiming at the right thing while we build.

### 10. Why would Credence (or any federal-software shop) adopt this over what they're already doing?

**Short answer:** Provenance markings + open methodology + auditable derivations are exactly what federal acquisition prefers.

**Long answer:** Federal software acquisition values: provenance (where did this code come from?), auditability (can a third party verify it?), supply-chain security (no surprise dependencies), and the ability to own and maintain the code without vendor lock-in. Every one of these is a strength of declarative SDD and a weakness of:
- Pure SaaS / vendor solutions (lock-in, opaque)
- Low-code platforms (proprietary, locked formats)
- Custom from-scratch development (slow, expensive, every project rebuilds the same patterns)
- Package-manager-heavy development (supply-chain risk, no first-class provenance)

Declarative SDD is the model that aligns with how federal acquisition wants software to be built but rarely gets. The marking conventions ARE provenance. The adopters list IS supply-chain transparency. The defects-known list IS auditable disclosure.

Credence's existing AISWF play (AI-augmented SDLC) and declarative SDD are not in conflict. AISWF makes the existing pipeline faster; declarative SDD changes what the pipeline produces. They could merge: AISWF orchestrators picking archetypes from a Credence-hosted registry, with derivations marked for cATO purposes.

### 11. What's the worst-case failure mode of this idea?

**Short answer:** The registry gets populated with archetypes that don't actually compose, and the orchestrator can't reliably build coherent projects.

**Long answer:** Composition only works if archetypes have well-defined integration points. If `simple-auth` and `audit-log` were designed independently with incompatible session models, composing them requires hand-written adapter code that defeats the point. The discipline that prevents this:

- **Composition is declared explicitly** in `ARCHETYPE.yaml`, not implied.
- **Adoption recipes** specify the integration points, not just the archetype's internals.
- **The orchestrator's adapter-generation** is the hardest engineering problem in the system; if it fails, the methodology fails.

Worst-case failure modes to watch:
- The orchestrator can't generate good adapters → manual integration cost eats the savings.
- The registry fragments into incompatible dialects (Credence's `simple-auth` differs subtly from the public one) → composition across registries fails.
- The methodology gets adopted in name but not in practice (marking conventions skipped) → derivations rot and the registry's promise breaks.

Each of these has a mitigation. The mitigations are part of the methodology. The PR/FAQ commits to watching for them.

### 12. Is this a product, a methodology, or an open standard?

**Short answer:** Yes.

**Long answer:** It's a methodology (codified in `METHODOLOGY.md`); a reference open standard (the YAML format, marking conventions, recipe structure); a reference registry (`wfredricks/archetypes`); and a reference orchestrator (to be built). Anyone can build their own registry or orchestrator that conforms to the standard. Bill's intent is to keep all four open and to let the ecosystem find its own commercial paths around them.

If a company wants to sell a hosted registry, a managed orchestrator, a curation service, or an adoption-consulting practice, the methodology supports it. The core stays open.

---

## Internal-only sections (not for external release)

### What "shipping" the PR actually means

The PR claims things that aren't true today. Specifically:

- **"N archetypes"** — true: 1 fully lifted (`simple-auth`), 4 stubbed, 1 in progress (`events-spine`)
- **"Orchestrator"** — false: not built yet
- **"Solution Intelligence runtime built entirely by composing archetypes"** — partially true: SI/I uses `simple-auth` archetype; SI/G will use `simple-ledger`; SI/I is about to adopt `events-spine`. Three archetypes composed in one project is one or two milestones away.
- **"Anyone can add archetypes"** — true once the registry has its first external contributor

The PR will be true by Q3-Q4 2026 if the current trajectory holds. The point of writing it now is to know what we're aiming at.

### What this PR/FAQ doesn't cover (yet)

- **The orchestrator's design** — how does it pick archetypes from declarative intent? Pattern-matching? Embedding search? LLM-as-router? Open question. Likely a separate scoping doc when the orchestrator becomes the next focus.
- **The economics** — who pays for the registry's maintenance? Open-source funding models all have known weaknesses. Bill has views but they're not in this doc yet.
- **The legal posture** — derived code carries provenance markings; what's the IP story when archetype A is GPL and the adopter is MIT? Worth getting right before adoption goes external.
- **The metrics** — what does "this works" look like quantitatively? Time-to-ship for an SI-sized project before vs. after? Adopter count per archetype per year? Defect-discovery rate?

### When to revisit this PR/FAQ

Revisit when ANY of:
- 3+ archetypes are adopted with the methodology (currently 1)
- The orchestrator pattern is built and demonstrated
- Someone outside the immediate shop adopts an archetype
- Credence (or a Credence-like federal-software shop) shows real interest
- A competitor or critic publishes a similar idea

Until then, this is a working scoping artifact, not a public document.

### What to do with this PR/FAQ now

- Sit with it for a week. Let the working evidence accumulate.
- When the events-spine archetype lands and SI/I adopts it (Stage 2d completion), update the PR's "what ships today" section.
- When Stage 3 ships (chainblocks → simple-ledger → SI/G), the PR is closer to true.
- When the orchestrator gets prototyped, the PR is honest.
- THEN decide whether to commit to the seminal paper. The PR/FAQ will have done its job: telling us what's worth writing about, what's load-bearing, and where the soft spots are.

---

🖇️ *PR/FAQ owned by Bill. Drafted by Bhai 2026-05-21. WIP.*
