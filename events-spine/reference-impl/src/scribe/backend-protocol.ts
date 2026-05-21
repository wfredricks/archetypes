/**
 * `ScribeBackend` — the swappable-backend protocol for the Scribe.
 *
 * Realizes Service S6 from the events-spine SIG Contract:
 *
 *   interface ScribeBackend {
 *     write(event: ScribeEvent): Promise<void>;
 *     query(filter: QueryFilter): Promise<ScribeEvent[]>;
 *     tail(filter: TailFilter): AsyncIterable<ScribeEvent>;
 *   }
 *
 * Honors:
 *   - P2 (canonical event format; backends adapt): the protocol takes
 *     `ScribeEvent` objects on the way in and returns `ScribeEvent`
 *     objects on the way out. Backends own their on-disk / on-wire
 *     `Representation`, but always round-trip back to canonical.
 *   - P5 (MCP surface is the contract): adopters interact with the
 *     Scribe via S3/S4/S5; the backend protocol is internal to the
 *     Scribe + its backend implementations. Backend-specific
 *     affordances DO NOT leak through the MCP surface.
 *
 * // Why an interface rather than an abstract class: paradigm-neutral
 * // (translates cleanly to Go interfaces, Python ABCs, Rust traits,
 * // Java interfaces).
 *
 * @module scribe/backend-protocol
 */

import type { ScribeEvent, QueryFilter, TailFilter } from '../types.js';

/**
 * Conformant backends MUST:
 *
 *   1. Round-trip `ScribeEvent` cleanly through `write` -> `query`.
 *   2. Apply `QueryFilter` semantics: subject filter (NATS wildcard),
 *      time range (`since` inclusive, `until` exclusive), free-text
 *      regex over the JSON-serialized payload, and limit.
 *   3. Return events ordered by `publishedAt` ascending from `query`
 *      and `tail`.
 *   4. Tolerate corrupt or partial records by skipping them; backends
 *      MUST NOT throw on individual record corruption.
 *
 * Optional: `close` may be implemented by backends holding file
 * handles or network connections; the Scribe calls it on shutdown
 * if present.
 */
export interface ScribeBackend {
  write(event: ScribeEvent): Promise<void>;
  query(filter: QueryFilter): Promise<ScribeEvent[]>;
  tail(filter: TailFilter): AsyncIterable<ScribeEvent>;
  close?(): Promise<void>;
}

/**
 * Internal helper: does a NATS-style subject filter match a concrete
 * subject?
 *
 * Translates the standard NATS wildcards:
 *   - `*` matches exactly one token
 *   - `>` matches one or more tokens (must be the last token)
 *   - everything else is a literal token
 *
 * // Why exposed (not pure-internal): backends share this helper, and
 * // it's a piece of substrate logic worth unit-testing in isolation.
 */
export function subjectMatches(filter: string, subject: string): boolean {
  if (filter === subject) return true;
  if (filter === '>') return true;

  const fTokens = filter.split('.');
  const sTokens = subject.split('.');

  for (let i = 0; i < fTokens.length; i++) {
    const ft = fTokens[i];
    if (ft === '>') {
      // `>` only valid as the last filter token; matches one or more
      // remaining subject tokens.
      return i < sTokens.length;
    }
    if (i >= sTokens.length) return false;
    if (ft === '*') continue;
    if (ft !== sTokens[i]) return false;
  }
  return fTokens.length === sTokens.length;
}

/**
 * Internal helper: does an event satisfy a QueryFilter?
 *
 * // Why isolated: makes both the file-backend query path and the unit
 * // test for filtering behavior easier; future backends reuse this
 * // for in-memory filtering after a backend-native pre-filter.
 */
export function eventMatchesQuery(event: ScribeEvent, filter: QueryFilter): boolean {
  if (filter.subject !== undefined && !subjectMatches(filter.subject, event.subject)) {
    return false;
  }
  if (filter.since !== undefined && event.publishedAt < filter.since) {
    return false;
  }
  if (filter.until !== undefined && event.publishedAt >= filter.until) {
    return false;
  }
  if (filter.match !== undefined) {
    // Why JSON.stringify the payload: the spec says "regex over the
    // JSON-serialized payload". Backend reproduces the same canonical
    // serialization to keep the contract uniform across backends.
    const payloadText = JSON.stringify(event.payload);
    let regex: RegExp;
    try {
      regex = new RegExp(filter.match);
    } catch {
      return false;
    }
    if (!regex.test(payloadText)) return false;
  }
  return true;
}
