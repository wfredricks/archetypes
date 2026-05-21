# Reference implementation pointer

The reference implementation for `simple-subscriber` lives in-tree, co-located
with the composite archetype that first needed it:

**`../../events-spine/reference-impl/src/subscriber/`**

The TypeScript reference is canonical (per `../../METHODOLOGY.md §Reference
language`). When a future non-events-spine consumer adopts `simple-subscriber`
directly, the reference may be lifted into `simple-subscriber/reference-impl/`
proper. Until then, co-location is correct.
