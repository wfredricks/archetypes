# Reference implementation pointer

The reference implementation for `simple-pubsub` lives in-tree, co-located with
the composite archetype that first needed it:

**`../../events-spine/reference-impl/src/publisher/`**

The TypeScript reference is canonical (per `../../METHODOLOGY.md §Reference
language`). When a future non-events-spine consumer adopts `simple-pubsub`
directly, the reference may be lifted into `simple-pubsub/reference-impl/`
proper. Until then, co-location is correct.
