# events-spine — The Story

*A story-paper for the `events-spine` archetype. Left-bookend artifact: written before any reference-impl code, capturing the intent and lived experience the archetype is meant to produce. The companion `LEFT-BOOKEND.md` captures the technical spec; this captures the picture.*

---

## I. The market square

Imagine a small town. In the middle of the town there is a square. Every morning the square opens. Vendors come and shout their wares. Children run through with messages from their mothers. A blacksmith strikes a deal with a farmer. A traveler asks for directions and three people answer at once. The square is *public*: anything said in it can be heard by anyone present.

But the square does not remember. A shout fades the moment it is finished. The deal between blacksmith and farmer is real only because two people remember it. If the children's messages mattered to someone not present, they are lost.

This is the problem `events-spine` is built to solve.

The square needs three things to become useful as a piece of civic infrastructure:

1. **A way to organize the shouting** so that a vendor calling for help with their cart does not get drowned out by a child calling for their dog. Stalls. Subjects. *Who shouts what, where.*

2. **People who come to the square specifically to listen.** Not to shout, not to trade — just to hear. They subscribe to particular kinds of cries and act on what they hear. Some carry messages elsewhere. Some make decisions. Some do nothing at all unless a very specific cry comes in.

3. **Someone who writes things down.** Not everything. The selected things. The things a future visitor to the town might need to know. The newspaper reporter walks the square with a notepad. They have a beat. They file a story at the end of each day.

That is `events-spine`. The square is the bus. The subscribers are the citizens listening. The reporter is the Scribe. The newspaper is the log. And the newspaper itself — which paper the reporter files to — is swappable. Today it's the *Town Gazette*; tomorrow it's the *Regional Herald*; whichever paper picks up the beat reporter's notes is the one that becomes the canonical record.

---

## II. A new project enters the square

Now imagine a new project moving in. It is a small business, run by two partners. The first morning, they look around the square and see other businesses publishing — the bakery announcing fresh bread, the smith announcing horseshoes ready, the schoolmaster announcing the day's schedule. They see citizens listening, picking up news that matters to them. They see the beat reporter at her booth in the corner, writing things down.

The partners decide: *we should be in the square too.*

To join the square, they don't have to build the square. They don't have to invent shouting. They go to the registry of civic patterns and find `events-spine`. The pattern says: *here is what a publisher looks like; here is what a subscriber looks like; here is the reporter; here are the newspapers she files to.* They derive each piece into their own business. They mark each derived piece with where it came from. They run the test suite the pattern ships with. The tests pass. They are now in the square.

The first event they publish is the moment their first customer signs the ledger. The subject is `business.customer.signed`. The payload includes the customer's name and the date. The shout goes into the square. The reporter, who has been listening for `business.*` on her beat, picks it up and writes it down. The local sheriff, who happens to subscribe to `business.customer.*` for tax-rolls, also picks it up and updates his ledger. The bank, which subscribes to `*.customer.signed` across all businesses for credit-rating purposes, picks it up too. **Three subscribers, one event, no coordination between the publisher and the subscribers.** None of them knew about the others. The square made the connection.

The partners did not have to know who would listen. They only had to publish. This is what the archetype gives them.

---

## III. A day on the beat

The reporter is the most interesting citizen in this story, because the reporter is what makes the square persistent.

She arrives at her booth at dawn. She subscribes to `>` — everything. By default the reporter is a generalist; she covers every beat the square knows. On her notepad each entry has the same shape: who shouted (the publisher's id), what stall they shouted from (the subject), what they shouted (the payload), and when. She writes them all down. By end of day she has a stack of notes.

Then she files.

Filing means handing the stack to whichever newspaper she's working for that month. If the *Town Gazette* is her publisher, she walks the stack to the Gazette's editor and the Gazette prints it. If she's been hired by the *Regional Herald*, she goes there instead. The Gazette and the Herald have different formats — the Gazette publishes everything chronologically in plain prose, the Herald indexes by subject and tags each entry for searchability — but the reporter doesn't write differently for either. She files her notes the same way. The newspaper transforms her notes into its own format. *The reporter is constant; the newspaper is swappable.*

This is the MCP-proxy pattern, dressed in civic clothes. The reporter (the Scribe) exposes a stable interface to the rest of the town: "you can ask me for the events of yesterday, you can ask me for everything I've ever recorded about the schoolmaster, you can ask me for a short summary of today's news." The reporter has these capabilities regardless of which newspaper she happens to be filing to. The newspaper is an implementation detail. The reporter is the contract.

At the end of each day she also produces a short narrative — one or two paragraphs in plain English summarizing what happened in the square. *"Today the bakery announced fresh bread three times, two customers signed with the new business on the corner, and the schoolmaster cancelled afternoon classes due to weather."* This narrative is for the citizens who cannot read every entry, who want the gist. The summary is generated by asking a small assistant to read the day's notes and write the gist. The notes are the truth; the summary is the affordance.

---

## IV. When the newspaper changes

A year passes. The town grows. The *Town Gazette* — a print-only newspaper kept in a single bound volume at the courthouse — cannot keep up with the volume. The town council decides to switch to the *Regional Herald*, which is digital and indexed and searchable from any home with a terminal.

This is a significant operational change. But for the reporter, it is not significant. She continues to walk the square. She continues to listen on `>`. She continues to file her notes. The only thing that changes is which paper she hands her notes to at the end of the day.

For the citizens — the publishers and the subscribers — *nothing changes at all*. They continue to shout in the square. They continue to listen. Their behavior is unchanged. The reporter is still recording. The fact that the canonical record now lives in a different newspaper is invisible to them.

This is what the MCP-proxy pattern is for. The Scribe's interface to the town is stable: `scribe.query`, `scribe.tail`, `scribe.summary`. Behind that interface, the file backend can be a flat JSONL file on disk, or CloudWatch, or OpenSearch, or any other system that can store a stream of events and serve queries against it. The choice is operational, not architectural. Swap the backend, the contract holds.

---

## V. Why the metaphor matters

The market-square framing is not decoration. It is doing two specific things:

**First**, it makes the publisher/subscriber decoupling visible. In a code-only description of NATS, the decoupling is a property of the protocol, easily overlooked. In the square, it is the *first thing you see*: the vendor shouts to no one in particular; the listener listens for nothing in particular; the connection between them is made by the square, not by either of them. Anyone who has been to a market understands this without explanation.

**Second**, it gives the Scribe a face. In a code-only description, the Scribe is "the canonical subscriber" — a phrase that is technically correct and emotionally invisible. The newspaper reporter has a notepad and a beat and a daily filing deadline. She is a *citizen*, with a role and a constraint and a workflow. When future archetypes add other constellation-level subscribers — a town crier (notifications), a bulletin board (the blackboard), a messenger (point-to-point) — the picture has room for them. They are other citizens of the same town. The square knows how to hold them all.

The metaphor pays its rent by making the architecture visible, not by being clever. We use the metaphor only as the opening frame of this story; the technical sections that follow speak in protocols, subjects, MCP surfaces. The metaphor is a door, not a wall.

---

## VI. What the archetype delivers

When a project adopts `events-spine`, it gets four things:

1. **A publisher reference implementation.** A small library (TypeScript canonical) that wraps the NATS client and adds typed event schemas, subject-naming conventions, and a clean API. The publisher does one thing: it shouts in the square, with the right subject, in the right format. About 100 lines of code.

2. **A subscriber reference implementation.** A small library that wraps the NATS subscriber, applies a subject filter, parses payloads, and hands events to a typed handler. Also small. About 100 lines.

3. **The Scribe.** A working program, not just a library. It boots, subscribes to a configurable pattern (default `>`), writes incoming events to a backend, and exposes an MCP server with three tools: `scribe.query`, `scribe.tail`, `scribe.summary`. The file backend ships with the archetype; other backends are added as adopters need them.

4. **The mcp-proxy pattern**, recognized and documented. No code — just a `README.md` explaining the pattern (stable MCP surface, swappable backend, agent-callable from anywhere). Future archetypes that need backend-pluggability will cite this README rather than re-explain the pattern.

These four pieces compose into `events-spine`. The archetype's `ARCHETYPE.yaml` declares the composition: `composes: [simple-pubsub, simple-subscriber, scribe, mcp-proxy]`. Each primitive has its own directory in the registry, with its own ARCHETYPE.md, but their reference-impls live together under `events-spine/reference-impl/` because they were first built together and have not yet earned separate reference-impl directories.

---

## VII. The first adoption

The first project to adopt `events-spine` will be `solution-intelligence-identity` (SI/I) in Stage 2d, planned for 2026-05-21 or shortly after. SI/I currently has no eventing — it accepts login codes, mints tokens, records grants, returns responses. None of that flows into the square.

After Stage 2d, every state-changing call in SI/I will emit a NATS event:

- `si.identity.login.completed` when a user successfully logs in
- `si.identity.grant.recorded` when a grant is appended to the ledger
- `si.identity.revoke.recorded` when a revoke is appended

These events will flow into the square. The Scribe will hear them and write them down. Future SI components (SI/G in Stage 3, SI/A — the agents — eventually) will be able to subscribe to them and react. The point of Stage 2d is to prove the publisher works, to put the first publisher in the square, and to verify that the Scribe captures it. The right bookend for `events-spine` will be written after Stage 2d; it will say whether the square stayed open, whether the reporter filed her story, and what we learned that we will fold back into the archetype's defects list.

---

## VIII. What we are committing to by writing this story before the build

Writing this story before the code is the discipline that the bookend practice is meant to enforce. By putting the market-square framing on paper before any TypeScript exists, we are committing to:

- **A clean publisher/subscriber decoupling.** If the build ends up requiring publishers to know about subscribers (a "callback" or a "destination" parameter on the publish call), that violates the picture and the picture catches it. We would have to update either the picture or the implementation.

- **A Scribe that does not change the square.** The Scribe is one of many possible listeners. It does not deserve special access. If the build ends up giving the Scribe back-channel privileges (e.g. a private NATS subject only it can read), the picture would catch that too.

- **A stable Scribe interface with a swappable backend.** If the build ends up making the file backend leak through the MCP surface (e.g. a `scribe.openFile` tool that only works for the file backend), that violates the MCP-proxy pattern and the picture catches it.

- **A narrative summary affordance.** The reporter's "short narrative at end of day" is a feature we are committing to ship in v1, not defer. The story makes it visible; deferring it would require explicitly acknowledging that the reporter goes home without filing the gist.

When the right bookend gets written after Stage 2d, we will compare against this story. Every place where reality drifted from the story is either a useful surprise (capture it; update the picture) or a regression (capture it; fix the implementation). The story is the hypothesis; reality is the test; the right bookend is the comparison.

---

## IX. Postscript: this story as precedent

`events-spine` is the first archetype in this registry built **fresh, in-tree, under the methodology.** The earlier archetypes — `simple-auth`, `simple-ledger`, `graph-db`, `nl-chat-substrate` — were lifts: pre-existing libraries with pre-existing adoptions, lifted into the registry after the work was already done. Their bookends, when written, will be retroactive.

`events-spine` does it forward. Story first, then spec, then recipe, then code, then right-bookend reflection. If this discipline produces a better archetype than the lifts did, we'll know — and the practice becomes load-bearing in the methodology going forward. If the discipline turns out to add cost without value, we'll learn that too, and we'll adjust.

Either way, this story is the first artifact of `events-spine`. Everything that follows — the LEFT-BOOKEND.md, the BUILD-RECIPE, the reference-impl, the Stage 2d adoption, the right bookend — is in conversation with this story. The market square is open.

🖇️ *Story by Bhai, in conversation with Bill, 2026-05-21. Left-bookend artifact. Written before code. To be tested against reality.*
