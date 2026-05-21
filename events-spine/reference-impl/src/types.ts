/**
 * Canonical type vocabulary for events-spine.
 *
 * Realizes (per the SIG Contract anchored at
 * `Solution {namespace: "asi"} -[:HAS_CONTRACT]-> Contract {archetypeName: "events-spine"}`):
 *   - DataObject DO1: `ScribeEvent`
 *   - DataObject DO2: `SubjectFilter`
 *
 * Plus the supporting protocol-level types referenced from the Service
 * declarations: `QueryFilter` and `TailFilter` for S3/S4/S6,
 * `SummaryEntry` for S5.
 *
 * // Why a single types module: the canonical event shape is the contract
 * // surface the rest of the substrate depends on. Co-locating it here
 * // makes it the single import point for adopters and translators (Go /
 * // Python / Rust transpositions read this file first).
 *
 * Contract reference: events-spine LEFT-BOOKEND.md §VI; SIG node
 * `DataObject {key: "DO1", contractId: "events-spine-v0.1.0-pre"}`.
 *
 * @module types
 */

/**
 * DO1 — Canonical event shape. Owned by the Scribe; backends serialize
 * their own representation but must round-trip back to this canonical form.
 *
 * // Why payload is `Record<string, unknown>`: publishers own their
 * // per-subject payload schema; the substrate stays schema-agnostic.
 * // Adopters MAY (and should) narrow the type at their own boundary —
 * // e.g. with a discriminated union keyed by `subject` — but the
 * // canonical event accepts any JSON-serializable record.
 *
 * Constraint C5: payloads MUST NOT contain bearer tokens, login codes,
 * or other credentials. The Scribe records faithfully and does not
 * redact; the obligation is upstream.
 */
export interface ScribeEvent {
  /** Stable, unique event id. Reference uses UUID v7 for time-ordering. */
  id: string;
  /** NATS subject the event was published on. */
  subject: string;
  /** ISO-8601 UTC timestamp when published. */
  publishedAt: string;
  /** Publisher's id; informational, not authenticated (P3: bus is trusted). */
  publisherId: string;
  /** Free-form payload; publishers own the schema for their subject. */
  payload: Record<string, unknown>;
  /** Optional correlation id linking related events across publishers. */
  correlationId?: string;
}

/**
 * DO2 — A NATS-style subject filter string.
 *
 * Examples:
 *   - `>`             — match every subject
 *   - `si.>`          — match anything under `si`
 *   - `si.identity.*` — match exactly three segments, `si.identity.*`
 *   - `*.identity.>`  — match any first segment, then `identity`, then anything
 *
 * Standard NATS subject-filter semantics; no extension by this archetype.
 *
 * // Why a string alias rather than a branded type: NATS subject filters
 * // are strings on the wire; introducing a brand here would force every
 * // adopter to wrap raw strings at every boundary for no semantic
 * // benefit. The contract is "valid NATS filter," documented here.
 */
export type SubjectFilter = string;

/**
 * Parameters for `ScribeBackend.query` and the `scribe.query` MCP tool (S3).
 *
 * // Why all fields are optional: the Scribe's MCP surface accepts open
 * // queries (no filter = recent across all subjects). Defaults are
 * // applied by the consuming layer (file backend defaults `limit` to
 * // 100; MCP tool surfaces the limit explicitly).
 */
export interface QueryFilter {
  /** NATS-style subject filter to match against `event.subject`. */
  subject?: SubjectFilter;
  /** ISO-8601 timestamp, inclusive lower bound on `event.publishedAt`. */
  since?: string;
  /** ISO-8601 timestamp, exclusive upper bound on `event.publishedAt`. */
  until?: string;
  /** Regex applied to the JSON-serialized payload. */
  match?: string;
  /** Maximum events to return. Backend default applies if omitted. */
  limit?: number;
}

/**
 * Parameters for `ScribeBackend.tail` and the `scribe.tail` MCP tool (S4).
 *
 * Tail semantics: return the most-recent N events matching `subject`,
 * newest last.
 */
export interface TailFilter {
  /** NATS-style subject filter to match against `event.subject`. */
  subject?: SubjectFilter;
  /** Number of most-recent events to return. Backend default applies if omitted. */
  last?: number;
}

/**
 * The cached daily-narrative summary surfaced by the `scribe.summary`
 * MCP tool (S5).
 *
 * // Why `sourceEventIds` and not the full source events: the events
 * // themselves remain queryable via S3 (`scribe.query`); the summary
 * // record stays compact and the citation trail stays explicit.
 *
 * Constraint C1: One LLM generation per `(subject, date)` per day; the
 * cache is the enforcement mechanism. `partial: true` indicates a cache
 * miss returning a placeholder narrative.
 */
export interface SummaryEntry {
  /** ISO-8601 date (YYYY-MM-DD) the summary covers (UTC). */
  date: string;
  /** Subject filter the summary was generated against. */
  subject: SubjectFilter;
  /** Plain-English narrative of the day. May be a placeholder if `partial`. */
  narrative: string;
  /** Number of events the summary covered. */
  eventCount: number;
  /** Event ids contributing to the summary; cited for traceability. */
  sourceEventIds: string[];
  /** ISO-8601 timestamp when the summary was generated. */
  generatedAt: string;
  /**
   * True if the narrative is a placeholder (cache miss; not yet generated).
   * False once a real LLM-generated narrative is cached.
   */
  partial: boolean;
}
