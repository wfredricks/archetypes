# simple-pubsub

*Typed publisher for an event-driven substrate.*

---

## Description

`simple-pubsub` is the publisher half of pub/sub. The publisher takes a typed
event, wraps it in a canonical envelope (id, publisherId, publishedAt, optional
correlationId), serializes the payload, and emits to the configured subject on
the bus. Fire-and-forget: the publisher does not block on subscriber
acknowledgement. The canonical bus is NATS.

The primitive owns the envelope shape — see `events-spine/LEFT-BOOKEND.md`
`DataObject DO1: ScribeEvent` — but knows nothing about who is listening or what
they do with the event. That is the subscriber's concern (`simple-subscriber`).

## When to use

- An archetype or service needs to emit state-changing events for any number of
  downstream listeners (zero, one, or many).
- You want publishers decoupled from subscribers: the publisher should not need
  to know who will listen.
- You have a message bus available (canonical: NATS) and want a typed, ergonomic
  publisher wrapper rather than raw bus-client calls scattered through your
  code.

## When NOT to use (anti-triggers)

- **Request/response semantics.** If the caller needs a response, this is not
  pub/sub; use HTTP or NATS request/reply directly.
- **Durability is required from day one.** The default mode is lossy
  (NATS core, no JetStream). Adopters needing durability layer JetStream on
  top; not in v0.1.0.
- **The bus is untrusted.** Publishers in `simple-pubsub` do not authenticate
  themselves; the bus is assumed trusted within the constellation.

## Composition

This is a primitive archetype; it composes nothing.

## Reference implementation

In-tree, co-located with the composite that first needed it:
`../events-spine/reference-impl/src/publisher/`. The TypeScript reference is the
canonical form.

See also `./reference-impl/POINTER.md`.

## Adoption recipe

Adoption flows through the composite `events-spine` for now — see
`../events-spine/ADOPTION-RECIPE.md`. A standalone adoption recipe will exist
once a non-events-spine consumer composes `simple-pubsub` directly.

## Known defects

None recorded yet.

## Adopters

None recorded yet. (The first adopter will be SI/I via events-spine Stage 2d.)

🖇️ *Part of the events-spine composite. Born 2026-05-21.*
