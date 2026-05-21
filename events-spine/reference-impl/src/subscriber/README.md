# subscriber/

Reference implementation for the **`simple-subscriber`** archetype. Lives here
for co-location with the composite `events-spine`.

Archetype description: `../../../../simple-subscriber/ARCHETYPE.md`

Realizes:
- Service **S2** from the events-spine SIG Contract: `subscribe(filter,
  handler): Subscription`
- DataObject **DO1** (`ScribeEvent`): incoming bytes parsed back to canonical form
- DataObject **DO2** (`SubjectFilter`): NATS-style filters

Substrate-grade fail-safe: handler exceptions are caught and routed to a
configurable logger (defaults to `console`); the subscriber stays alive.
