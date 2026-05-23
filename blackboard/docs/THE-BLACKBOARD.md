# The Blackboard

*The architectural pattern beneath The Archaeologist. Companion document to `THE-ARCHAEOLOGIST.md`. The story tells you what one Knowledge Source does; this document tells you what the substrate around it is, why it has the shape it has, and what we have already built versus what is still missing. Written 2026-05-22 evening, after Bill named the pattern by saying "BTW, this is a perfect use for a blackboard."*

---

## I. The lineage

The Blackboard pattern was named in 1980 by the Hearsay-II team — Lee Erman, Frederick Hayes-Roth, Victor Lesser, Raj Reddy — in the paper *The Hearsay-II Speech-Understanding System: Integrating Knowledge to Resolve Uncertainty*. The team faced a problem that had defeated more conventional architectures for a decade: how to make a computer understand spoken sentences in a thousand-word vocabulary in near-real time, knowing that no single algorithm could do it, that many kinds of expertise had to compose (acoustics, phonetics, lexicon, syntax, semantics, prosody, pragmatics), and that the right sequence in which to invoke those experts could not be specified in advance because it depended on what each previous expert had concluded about the partially-heard utterance.

Their answer was to stop trying to specify a control flow at all. They put the partial state of the utterance — what acoustic features had been recognized, what phonemes those features suggested, what words those phonemes might form, what sentences those words might compose — onto a shared workspace they called the Blackboard. They wrote each expert as an independent Knowledge Source: a module with a recognition predicate ("wake me when something on the Blackboard looks like this"), an action ("when you wake, do this and write the result back to the Blackboard"), and a confidence rating on whatever it produced. A separate Control component watched the Blackboard, watched which Knowledge Sources had matching preconditions, and decided opportunistically which one to invoke next. The system solved problems that the predecessors could not, not by being smarter at any individual step but by being structurally permissive about the order of steps.

The pattern was generalized beyond speech understanding within a decade. It became, for a while, one of the canonical architectures for distributed AI problem-solving — Englemore and Morgan's 1988 *Blackboard Systems* collected fifty applications. The pattern fell out of fashion when neural approaches subsumed many of its individual use cases, but the architectural idea — *opportunistic problem-solving over a shared structured workspace with independent contributing experts and a separate control* — has remained the right shape whenever the conditions of the original problem return.

Those conditions have returned. They have returned in legacy-modernization, where many kinds of expertise (structural extraction, semantic extraction, data-layer derivation, persistence mapping, integration mapping, business-feature discovery, domain-model derivation, target-platform implementation mapping) must compose, where no single sequence of operations is correct in advance because each step's relevance depends on what the previous step found, and where many of the judgments are uncertain enough that proposing with a confidence score is honest while committing as fact would be a lie. We did not come to the Blackboard pattern by reading the 1980 paper and looking for an excuse to apply it. We came to it because we were standing in the middle of building the thing it describes, and Bill recognized what we were doing.

## II. The mapping onto Solution Intelligence

The substrate that Solution Intelligence has been building over the last week looks like Hearsay-II in almost every part, with some pieces already in place and some not.

The **Blackboard** is the SIG — the Solution Intelligence Graph. It is structured (typed nodes, typed edges, properties carrying timestamps and provenance). It is shared (a persistent backend, queryable by every agent). It holds partial solutions at multiple levels of abstraction (the views — `/code` for as-found artifacts, `/biz` for derived business reality, `/dom` for the new domain model, `/imp` for the ServiceNow implementation). The PolyGraph storage layer or the Neo4j storage layer provides the persistence; the contract-loader and the events-spine integration provide the writes. We have this.

The **Knowledge Sources** are the agents. Today we have two — CompletenessAgent and BookendAuditAgent — but both are pure-read sweeps. They look at the Blackboard, report findings, do not contribute. Tomorrow we will have the Visitor (the Archaeologist) writing the data-layer view. Eventually we will have the Feature-Discoverer reading the Visitor's output and proposing Features, the Persistence-Mapper cataloguing DataStores, the Integration-Mapper enriching boundary crossings, the Domain-Deriver proposing `/dom` entities from `/biz` Features, the Implementation-Mapper proposing `/imp` ServiceNow Update Sets. Each is its own Knowledge Source. Each has a narrow remit. Each writes back to the same Blackboard. We have two pure-read Knowledge Sources today; we need write-capable ones tomorrow.

The **notification fabric** is events-spine. When a SIG mutation happens, events-spine is the substrate that broadcasts it to subscribers. The contract for events-spine is already loaded in the SIG with seven hypotheses (H1–H7), four of which are held at this writing. The runtime — a NATS bus, a Scribe subscriber, the publisher SDK — exists in `archetypes-solution-intelligence` and is consumed by the identity service. We have this in the substrate; we do not yet have every SIG mutation emitting events. Today `commitContract` writes directly to the graph, `seed-solution` writes directly to the graph, the Phase 2.B loaders write directly to the graph, and only the identity service publishes through events-spine. The Blackboard pattern requires every workspace mutation to be observable; the substrate has the fabric but does not yet route every write through it.

The **Knowledge Source registry** does not exist. Today, agents are invoked by direct CLI calls: `stores agents completeness run`. A KS in the Blackboard pattern registers a subscription ("wake me when these node-label deltas appear") and is dispatched by the Control. The agents package today has no `register()` surface, no subscription concept, no daemon process holding subscriptions and dispatching. This is one of the three missing things.

The **proposal lifecycle** does not exist as a first-class concept. Today a node is committed to the graph as fact when an agent writes it. There is no `status: proposed` distinct from `status: committed`, no confidence score property the Control can route on, no `ProposalReview` node recording a human-or-agent decision to accept or reject. The Visitor will need this — its low-confidence classifications need to live as proposals until reviewed — and so will every later Knowledge Source that produces uncertain output. This is the second missing thing.

The **Control** does not exist. There is no scheduler watching the Blackboard, watching which Knowledge Sources' subscriptions are now satisfied, and choosing which one to wake. Hearsay-II's Control was the heart of the system; ours is missing entirely. Today everything is operator-invoked. This is the third missing thing.

So: we have the Blackboard (the SIG), the notification fabric (events-spine, partially wired), and two early Knowledge Sources (read-only). We do not have the KS registry, the proposal lifecycle, or the Control. The Blackboard archetype's reference implementation is exactly these three missing things, packaged together with the wrappers around graph-db and events-spine that already exist.

## III. The proposal lifecycle in more detail

Of the three missing things, the proposal lifecycle is the one that most affects the rest of the ontology and therefore needs the most careful thought up front.

Today a node in the SIG has a label (`Contract`, `Hypothesis`, `DataObject` in the future, `Feature` in the future) and properties (`status`, `verifiedAt`, etc., per the ontology). The Blackboard pattern asks for one more concept on every node: a *proposal state*. A node can be **proposed** (an agent contributed it; it carries a confidence score; it has not yet been blessed for downstream consumption), **committed** (some review process accepted it, either explicit human acceptance or automatic acceptance because confidence was high enough), or **rejected** (a review process rejected it; it is kept on the Blackboard with `status: rejected` so the audit trail remembers, but downstream Knowledge Sources skip it).

This is not a property hack. It is a first-class concern that affects how every agent reads. The Feature-Discoverer reading DataObjects must skip rejected ones and treat proposed ones differently from committed ones (perhaps the Feature-Discoverer ignores proposed DataObjects until they commit, or perhaps it generates *its own* proposals that are conditional on the DataObject's commit, with an explicit `DEPENDS_ON_PROPOSAL` edge). The audit ledger must record every state transition with the actor (agent or human) and the reason. The Control must be able to query "what proposals are pending review with confidence below 0.7?" and route them.

The Visitor's `intent: persisted` field tag from §III of THE-ARCHAEOLOGIST is an example of where this matters. When the Visitor classifies a field as persisted but the DataStore it persists into has not yet been catalogued (the Persistence-Mapper hasn't run on that area of the codebase), the Visitor cannot draw the `PERSISTED_IN` edge to a node that doesn't exist. The Blackboard pattern's answer: the Visitor commits a *deferred-reference proposal*. The node and edge are written with `status: proposed-deferred`, the edge has a target that is a stub DataObject of `status: proposed-placeholder`. When the Persistence-Mapper later catalogues the real DataStore and recognizes (by set-not-list discipline) that the Visitor's placeholder matches its new node, the placeholder resolves into the real node, the deferred-reference proposal commits, and the audit ledger records the cross-Knowledge-Source completion.

This pattern — agents writing partial state that completes only when other agents later contribute — is the proposal lifecycle's core value. Without it, every agent would have to either wait for full information (Control becomes serialized and the system becomes a script) or write incomplete information as if it were complete (the Blackboard becomes a lie). With it, agents can contribute opportunistically and the Blackboard remains honest about what is settled versus what is in flight.

## IV. The Control in more detail

Hearsay-II's Control was a separate module that watched the Blackboard, watched the registered Knowledge Sources' preconditions, computed which Knowledge Sources had matching preconditions at any moment, scored each one for expected utility, and invoked the highest-scoring candidate. It was the engine that turned a passive workspace into an active problem-solving system.

For Solution Intelligence, we can be more pragmatic. We do not need to start with utility scoring. We need to start with the simplest thing that works: a dispatcher that maintains a registry of `(label-pattern, Knowledge-Source)` tuples, listens to the events-spine for SIG-mutation events, and for each event finds all registered Knowledge Sources whose precondition matches and invokes them. If multiple Knowledge Sources match, the dispatcher invokes all of them — there is no contention over which to pick because each writes to a different region of the Blackboard. Concurrency is allowed because the workspace structure (typed nodes, edge constraints) prevents most conflicts; what conflicts remain are resolved by the set-not-list discipline at write time (two Knowledge Sources both trying to create `DataObject(name='Customer')` race; whoever loses the race finds the existing node and contributes to it instead of creating a duplicate).

Later, when the Knowledge Source population grows, we add scoring. A Knowledge Source can declare an estimated cost ("this run costs me 30 seconds and one LLM call") and an estimated value ("this run will likely resolve 5 deferred proposals"). The Control prefers high-value-per-cost invocations. Later still, the Control can learn from outcomes — if a Knowledge Source consistently produces low-confidence findings that get rejected, the Control deprioritizes its invocations. None of this is urgent for the first implementation. The first implementation just needs the dispatcher.

The Control is also where *transient versus persistent* lives. A transient Blackboard creates a Control instance, runs it for the duration of a session (a conversation, a single problem-solving run, a single CLI invocation that needs multi-agent coordination), and tears it down. A persistent Blackboard's Control runs as a daemon, surviving across sessions, accumulating subscriptions over time. Both modes use the same dispatcher; the difference is lifecycle. The `code-explorer` blackboard is persistent: legacy-modernization understanding accumulates across weeks of engagement. A future conversational-coordination blackboard for a constellation of agents talking to a user might be transient: the Blackboard exists only for the duration of the conversation.

## V. The Knowledge Source registry

The third missing thing is the registry: the surface by which a Knowledge Source tells the substrate "here is my precondition, here is my action, here is my confidence convention." Without it, the Control has nothing to dispatch.

The shape of a Knowledge Source registration:

- **Identity** — a stable name (`the-visitor`, `the-feature-discoverer`), a version (`0.1.0-pre`), a package the substrate can resolve to find the executable
- **Precondition** — a declarative predicate over Blackboard state. The simplest form is "wake on these events": a list of `(event-type, label-filter, property-filter)` tuples. Richer forms can express "wake when these N conditions are all satisfied" or "wake at a regular cadence regardless of events" (for cleanup or audit-style Knowledge Sources).
- **Action** — the executable the substrate invokes when the precondition matches. The action receives a context (which Blackboard nodes triggered the wake), executes, and writes back to the Blackboard. The substrate logs the action's start, completion, and any proposals emitted.
- **Confidence convention** — the Knowledge Source declares the range of confidence scores it produces and the threshold above which its outputs commit directly versus the threshold below which they require review. This lets the Control route appropriately without inspecting the Knowledge Source's internals.
- **Cost and value estimates** (later, for scoring) — declarative hints the Control uses for prioritization

A registration is itself a node on the Blackboard: `KnowledgeSource(name='the-visitor', version='0.1.0-pre', precondition=…)`. This means the Blackboard is its own registry. New Knowledge Sources register by writing a node and an edge to the Blackboard; the dispatcher subscribes to changes in the `KnowledgeSource` label and updates its routing table. Deregistration is the inverse. This recursion — the Blackboard hosts the metadata that controls the Blackboard — is intentional. It is the same recursion that makes the audit ledger trustworthy (the ledger is on the Blackboard; mutations to the ledger are also recorded). The Blackboard is the only source of truth, including about itself.

## VI. The composition story

The Blackboard archetype composes:

- `graph-db` — the workspace storage. PolyGraph or Neo4j; the choice is per-adoption.
- `events-spine` — the notification fabric. NATS as the canonical bus; the Scribe is the canonical durable recorder.
- (probably) `simple-auth` — Knowledge Sources need identity for audit-ledger provenance; multi-operator environments need this to distinguish whose contributions are whose.

The Blackboard archetype provides:

- The Knowledge Source registry surface (a TypeScript SDK; a small daemon)
- The Control / dispatcher (a daemon that listens to events-spine and routes to Knowledge Sources)
- The proposal lifecycle (a small surface on the graph layer that wraps node writes to track `status: proposed | committed | rejected` and propagates proposal state through derived edges)
- The wrappers around graph-db and events-spine that the Knowledge Source SDK uses
- The CLI surface for operators to query the Blackboard, list registered Knowledge Sources, force-invoke a Knowledge Source for testing, review pending proposals, accept or reject

What it does *not* provide:

- Any specific Knowledge Source. Those are domain-specific. The Visitor lives in the archetype that adopts Blackboard for legacy-modernization (likely `solution-intel`'s biz-deriver phase). Conversational-coordination Knowledge Sources would live in a different adoption.
- Any specific ontology. Adoptions define their own labels and edge types. The Blackboard substrate is ontology-agnostic; only Knowledge Sources and the adopter care about specific labels.
- Any specific Control policy. The default Control is "dispatch every matching Knowledge Source on every event." Adoptions can replace the Control with a smarter policy if their use case warrants it.

## VII. Transient and persistent modes

A Blackboard can be transient or persistent. The archetype supports both with the same code.

A **transient** Blackboard is created at the start of a problem-solving session, hosts the Knowledge Sources needed for that session, accumulates partial solutions, produces a result (or a set of proposals for an operator), and is torn down when the session ends. Use cases: a conversational constellation of agents coordinating a multi-turn response to a user; a one-shot multi-agent analysis run; an ephemeral planning session where several agents propose and critique. The workspace storage for a transient Blackboard can be in-memory (a PolyGraph instance with a memory adapter) or a temporary on-disk leveldb that the substrate deletes at session end.

A **persistent** Blackboard runs continuously, accumulates understanding over time, survives across operator sessions, and is the long-running home of cumulative work. Use cases: legacy-modernization understanding-building (the `code-explorer` blackboard); ongoing solution-intelligence engagements; any task where the value of the work is the accumulated state rather than a single session's output. Workspace storage is persistent (PolyGraph leveldb or Neo4j on disk).

The same Knowledge Source can run on either mode — the Visitor doesn't care whether its Blackboard lives for an hour or for a year. The mode affects only the Control's lifecycle and the workspace storage's adapter. The Knowledge Source SDK is identical.

The first target adoption is persistent: `code-explorer` inside `solution-intel`. A future target adoption — likely a conversational-coordination case — would be transient.

## VIII. What this archetype is not

It is not a workflow engine. Workflow engines specify control flow declaratively (BPMN, state machines, DAGs). The Blackboard pattern is the opposite — it deliberately *avoids* specifying control flow because the right flow is opportunistic and emerges from the workspace state.

It is not a message bus. A message bus is the transport layer the Blackboard uses (events-spine in our case). The Blackboard is the *workspace* the messages refer to, plus the *Knowledge Sources* that subscribe to the messages, plus the *Control* that decides which subscribers matter at any moment. Without those, the bus is just a bus.

It is not a multi-agent framework in the LangChain/AutoGen sense. Those frameworks compose agents around LLM tool-calling and conversational turn-taking. The Blackboard composes Knowledge Sources around a shared structured workspace and opportunistic dispatch. The two patterns can interoperate (a Blackboard Knowledge Source could internally use an LLM, and a multi-agent LLM framework could write to a Blackboard), but they are different architectural shapes.

It is not an inference engine in the rule-based sense. Rule engines forward-chain or backward-chain over fact bases. The Blackboard is more permissive — Knowledge Sources can be anything (rule engines, LLMs, regex matchers, AST visitors, human prompts), and the Control composes them by event-driven dispatch rather than by chained inference.

## IX. The reference implementation we have not built yet

When this archetype's first reference implementation is built, it will live at `archetypes/blackboard/reference-impl/` and provide:

- `@blackboard/registry` — the Knowledge Source SDK: register, deregister, declare precondition, declare action, declare confidence convention
- `@blackboard/dispatcher` — the Control daemon: listens to events-spine, maintains the routing table, invokes matching Knowledge Sources, records audit-ledger entries for every dispatch
- `@blackboard/proposals` — the proposal-lifecycle surface: wraps node writes to track proposal state, propagates state through derived edges, provides query helpers for the Control and for review tools
- `@blackboard/cli` — the operator surface: list KSes, force-invoke for testing, list pending proposals, accept/reject

The first adoption that consumes this — `code-explorer` inside `solution-intel` — is where the Visitor and its sibling Knowledge Sources live. The Visitor's story is in `archetypes-solution-intelligence`'s docs (`THE-ARCHAEOLOGIST.md`); the Visitor's *code* will live in the adopter. The Blackboard archetype provides the substrate. The adopter provides the Knowledge Sources. Same shape as every other archetype-adopter relationship in the registry.

When this is built, the doctrine documents become the build's primary specification. The Archaeologist tells you what one Knowledge Source does. This document tells you what the substrate that hosts it must look like. Together they describe a system that does not yet exist but is now sufficiently specified to be built. Build it from the specification. If the build needs to diverge from the specification, fix the specification first.

🖇️

---

*This document was prompted by Bill's observation 2026-05-22 19:53 EDT: "BTW, this is a perfect use for a blackboard." The architectural framing that followed — Solution Intelligence's substrate as the Blackboard, the agents as Knowledge Sources, the missing pieces (registry, proposal lifecycle, Control) — emerged in the conversation immediately after. This document codifies what was discussed. Companion to `THE-ARCHAEOLOGIST.md` in `archetypes-solution-intelligence/docs/`. When code that claims to implement this archetype diverges from this document, fix the code, not the document.*
