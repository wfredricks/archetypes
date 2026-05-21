# simple-subscriber

*Typed subscriber for an event-driven substrate.*

---

## Description

`simple-subscriber` is the receive half of pub/sub. The subscriber registers a
handler against a subject filter, parses each incoming message into a canonical
`ScribeEvent`, and hands it to the handler. Handler exceptions are caught and
logged so a single bad handler does not crash the subscriber. Unsubscribe is
explicit.

Subject filters use NATS semantics (e.g. `si.identity.*`, `>` for everything).
The primitive owns the canonical event shape (see `events-spine/LEFT-BOOKEND.md`
`DataObject DO1`) and the parse step from bus message to event.

## When to use

- A service needs to react to events emitted by other services without coupling
  to who emits them.
- You want a typed, ergonomic subscriber rather than raw bus-client
  message-loops scattered through your code.
- You need the substrate-grade fail-safe behavior: one bad handler does not
  take down the listener.

## When NOT to use (anti-triggers)

- **You need durable replay of missed events.** Not in v0.1.0 — JetStream or
  equivalent is deferred.
- **You need fine-grained payload filtering at subscribe time.** Filter at the
  subject level (NATS filters); content-level filtering happens in the handler.

## Composition

This is a primitive archetype; it composes nothing.

## Reference implementation

In-tree, co-located with the composite that first needed it:
`../events-spine/reference-impl/src/subscriber/`.

See also `./reference-impl/POINTER.md`.

## Adoption recipe

Adoption flows through the composite `events-spine` for now — see
`../events-spine/ADOPTION-RECIPE.md`.

## Known defects

None recorded yet.

## Adopters

None recorded yet.

🖇️ *Part of the events-spine composite. Born 2026-05-21.*
