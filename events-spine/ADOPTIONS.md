# events-spine — Adoptions

*One row per adoption. Each adoption pins a commit, declares a maintainer,
and is followed up by a FINDINGS file flowed back here.*

---

## solution-intelligence-identity (Stage 2d, 2026-05-21)

| Field | Value |
|---|---|
| **Adopter** | [`wfredricks/solution-intelligence-identity`](https://github.com/wfredricks/solution-intelligence-identity) |
| **Adopter version** | `v0.2.2-pre` |
| **Pinned commit** | `1b334abbb354fa89dd758225e960ce5f58dcf365` (tag `events-spine-v0.1.0-pre`) |
| **Scope** | Publisher-only. Derived `simple-pubsub` primitive into `src/events/publisher/`; wrapped with SI-specific subject prefix `si.identity` and typed per-event methods in `src/events/si-publisher.ts`. |
| **Subscribers / Scribe / MCP** | Not adopted in this stage. SI/I emits; downstream consumers (Completeness Agent, future SI/G Scribe) will subscribe when they exist. |
| **Maintainer** | @wfredricks (SI core team) |
| **Refresh policy** | Review at every `events-spine` minor version bump. Emergency-refresh on any change to the canonical `ScribeEvent` shape (DO1) or to Service S1. |
| **Modifications from upstream** | Configuration-only. No source-file modification of the derived reference-impl. All adopter-owned namespacing happens in the SI publisher wrapper. (events-spine Hypothesis H6 — held.) |
| **FINDINGS** | `solution-intelligence-identity/build-history/BUILD-STAGE-02D-FINDINGS.md` |

First adoption of `events-spine`. Confirmed:

- Configuration-only adoption is workable (no `@adopt:` markers needed for a primitive composition).
- The graceful-no-op pattern on connect/publish failure is the right shape for a publisher-only adopter — events are observability, not correctness-bearing for SI/I’s primary flows.
- Constraint C5 (no credentials in payloads) is enforceable in unit and integration tests with simple JSON-string assertions; the obligation lives cleanly upstream of the events-spine substrate.
