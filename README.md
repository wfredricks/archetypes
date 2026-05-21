# archetypes

*Pattern archetypes for declarative software development. The vocabulary the methodology speaks in.*

---

## What is this repo

This is the **archetypes registry** — a versioned, single-source-of-truth catalog of the
patterns out of which software gets composed under the declarative-software discipline.

Each archetype is a small, named, well-understood pattern (e.g. `simple-auth`,
`events-spine`, `graph-db`) with:

- A **description** of the pattern (`ARCHETYPE.md`) — what it is, when to use it, when not to.
- A **machine-readable manifest** (`ARCHETYPE.yaml`) — name, kind, composition, reference impl, adopters, known defects.
- An **adoption recipe** (`ADOPTION-RECIPE.md`) — the mechanical steps to derive a working library into a new project.
- A **known-defects log** (`DEFECTS.md`) — every defect discovered during an adoption is documented here so the next adopter fixes it (or knowingly accepts it).
- An **adopters log** (`ADOPTIONS.md`) — every project that has lifted this archetype, what stage, what tag.
- A **reference implementation** (`reference-impl/`) — either in-tree code or a `POINTER.md` to an external repo that satisfies the contract.

The registry is the *vocabulary* the declarative-software methodology speaks in. New
solutions get expressed as "compose these archetypes." New patterns earn a place here
only when there's evidence of repeat use.

## Two tiers, not three

The morning of **2026-05-21** clarified a distinction that had been muddled:

- **Archetype** = the *pattern name*. E.g. `simple-auth`. This is the abstract shape.
- **Reference implementation** = a working *library instance* of the pattern. E.g.
  [`wfredricks/bangauth`](https://github.com/wfredricks/bangauth) is the reference
  implementation of the `simple-auth` archetype.
- **Adoption** = a *project applying the archetype* by lifting (or wrapping) the
  reference implementation. E.g. `solution-intelligence-identity` is an adoption of
  `simple-auth` via the bangauth library.

There are **two tiers** above the adopter, not three: the *pattern* (archetype) and
the *library instance* (reference implementation). The library is not the archetype;
the archetype is not the library. The same archetype can have multiple library
instances over time (e.g. someone could ship a `pyauth` library that satisfies the
`simple-auth` contract in Python).

The directory name in this registry is the **pattern name**, not the library name.
`simple-auth/` not `bangauth/`. The library name lives inside, as a pointer.

## Composition

Archetypes can compose other archetypes. A *primitive* archetype stands alone (e.g.
`simple-pubsub`). A *composite* archetype is built from other archetypes (e.g.
`events-spine` = `simple-pubsub` + `simple-subscriber` + `scribe` + `mcp-proxy`).

Composition is first-class. See [COMPOSITION.md](./COMPOSITION.md) for the format and
mechanics. The `ARCHETYPE.yaml` `composes:` field lists the constituent archetypes
for composite kinds.

## How to add an archetype

1. Copy `_template/` to a new directory whose name is the pattern name.
2. Fill out `ARCHETYPE.md` — what is the pattern, when to use it, when not to.
3. Fill out `ARCHETYPE.yaml` — the machine-readable manifest. Set `kind: primitive`
   or `kind: composite`; list `composes:` if composite.
4. Fill out `ADOPTION-RECIPE.md` — the mechanical steps to derive into a new project.
   Generalize from prior adoptions; do not assume one specific target.
5. Seed `DEFECTS.md` with any known defects of the reference implementation. Empty if
   none yet — the first adopter will start filling it.
6. Start `ADOPTIONS.md` empty (or with the first adopter if one already exists).
7. Decide reference-impl placement:
   - **In-tree** (preferred for new archetypes): write working code under
     `reference-impl/` against this registry's discipline.
   - **External pointer** (for pre-existing libraries that predate this registry):
     write a `reference-impl/POINTER.md` citing the external repo, with rationale.

See [METHODOLOGY.md](./METHODOLOGY.md) for the marking conventions, anti-triggers,
and defects-fix discipline that govern every adoption.

## Current archetypes

| Name | Kind | Status | Reference impl | Adopters |
|---|---|---|---|---|
| [`simple-auth`](./simple-auth/) | primitive | **lifted** | external → [`wfredricks/bangauth`](https://github.com/wfredricks/bangauth) | `solution-intelligence-identity` (Stage 2a, v0.2.0-pre) |
| [`simple-ledger`](./simple-ledger/) | primitive | stub | external → [`wfredricks/chainblocks`](https://github.com/wfredricks/chainblocks) | none yet |
| [`graph-db`](./graph-db/) | primitive | stub | external → [`wfredricks/polygraph`](https://github.com/wfredricks/polygraph) | none yet |
| [`nl-chat-substrate`](./nl-chat-substrate/) | composite | stub | external → SIG/MCP NL pipeline | none yet |
| [`blackboard`](./blackboard/) | primitive | stub | none yet | none yet |
| [`events-spine`](./events-spine/) | composite | placeholder | (in-tree, planned) | none yet |

- **lifted** — archetype description is fully populated; ready to adopt.
- **stub** — archetype name is reserved; description will be written when the trigger condition lands (see each `ARCHETYPE.md`).
- **placeholder** — directory exists but content is deferred to a later build step.

## Why this registry exists

Decisions get made faster when the building blocks have names. The declarative-software
methodology — to be written up as a paper this registry will be cited from — expresses
solutions as "compose these archetypes." Without a registry, that vocabulary drifts
across projects, conversations, and weeks. With it, the vocabulary is durable, citable,
and reviewable.

The historical analog is GoF design patterns, but at a coarser grain: an archetype is
the size of a *library*, not a class. Where GoF gave us "iterator" and "visitor," this
registry gives us "simple-auth" and "events-spine." Same intent; different altitude.

## Status

Pre-1.0. No npm publishes. No version tags yet on this repo. Main branch only. The
registry is being seeded as adoptions happen; the methodology paper will follow.

## License

MIT. See [LICENSE](./LICENSE).
