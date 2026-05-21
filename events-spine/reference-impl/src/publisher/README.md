# publisher/

Reference implementation for the **`simple-pubsub`** archetype. Lives here for
co-location with the composite `events-spine` archetype that first needed it.

Archetype description: `../../../../simple-pubsub/ARCHETYPE.md`

Realizes:
- Service **S1** from the events-spine SIG Contract: `publish(event: ScribeEvent): void`
- Principle **P3** (bus is lossy by default): fire-and-forget; the publisher does
  NOT block on subscriber acknowledgement
- DataObject **DO1** (`ScribeEvent`): the published envelope

Public surface:
- `Publisher` — interface
- `PublisherOptions` — factory options
- `PublishInput` — input shape for `publish`
- `createPublisher(opts)` — factory
- `decodeEnvelope(bytes)` — internal helper exposed for the subscriber/Scribe

Honors **Constraint C5**: the publisher does not inspect or redact payloads. The
obligation to avoid tokens in payloads is upstream of this module.
