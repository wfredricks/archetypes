/**
 * Provenance:
 *   Lifted into archetypes/solution-intel/reference-impl/ on 2026-05-22
 *   from wfredricks/archetypes-solution-intelligence/cli/src/commands/contracts.ts
 *   @ commit 195096307965d7ccd1a5ddac5da1b09db6b77b60.
 *
 *   Ownership: solution-intel canonical. Adopter copies replace
 *   `@adopt:` markers with adopter-specific values.
 */

/**
 * `si contracts list` and `si contracts show <archetypeName>` — read-side
 * surface for the SIG's loaded archetype contracts.
 *
 * // Why: Contracts loaded by the contract-loader live in PolyGraph; the
 * // CLI needs a queryable surface so operators can confirm what's
 * // anchored to the Solution without firing up cypher-shell. This is
 * // the operator-facing manifestation of the SIG+SDD+DSD loop.
 *
 * Exit codes:
 *   0 — success (zero or more contracts found)
 *   1 — `show` did not find a matching contract
 *   2 — connection / usage error
 *
 * @module commands/contracts
 */

import { listContracts, showContract } from '@solution-intelligence/contract-loader';

/**
 * Options common to both subcommands.
 *
 * `namespace` defaults to the archetype's reference value ("asi" — the
 * first proving-ground adoption profile, also flagged with
 * `@adopt:default-namespace`). Adopters override either with the
 * `--namespace` CLI flag or by replacing the literal.
 */
export interface ContractsCommandOptions {
  namespace?: string;
  graphUrl?: string;
  graphUser?: string;
  graphPass?: string;
  /**
   * Stream to write human-readable output to.
   *
   * // Why: defaulting to `process.stdout` keeps the CLI ergonomic; tests
   * // pass a captured stream so we can assert on output without hijacking
   * // global stdout.
   */
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

// @adopt:default-namespace
// Q: Solution namespace the `si contracts` subcommands query when no
//    `--namespace` flag is given. Must match `@adopt:namespace` in
//    identity/src/index.ts.
// Default: asi  (matches the asi reference adoption)
// Format: [a-z][a-z0-9-]{1,15}
const DEFAULT_NAMESPACE = 'asi';

function resolveOptions(options: ContractsCommandOptions): Required<
  Omit<ContractsCommandOptions, 'graphUrl' | 'graphUser' | 'graphPass'>
> & {
  graphUrl?: string;
  graphUser?: string;
  graphPass?: string;
} {
  return {
    namespace: options.namespace ?? DEFAULT_NAMESPACE,
    stdout: options.stdout ?? process.stdout,
    stderr: options.stderr ?? process.stderr,
    graphUrl: options.graphUrl,
    graphUser: options.graphUser,
    graphPass: options.graphPass,
  };
}

/**
 * `si contracts list` — prints a table of contracts anchored to the
 * Solution root.
 */
export async function contractsListCommand(
  options: ContractsCommandOptions = {},
): Promise<number> {
  const opts = resolveOptions(options);
  try {
    const entries = await listContracts(opts.namespace, {
      graphUrl: opts.graphUrl,
      graphUser: opts.graphUser,
      graphPass: opts.graphPass,
    });
    if (entries.length === 0) {
      opts.stdout.write(`No contracts loaded in namespace "${opts.namespace}".\n`);
      return 0;
    }
    const header = `${pad('ARCHETYPE', 24)}  ${pad('KIND', 12)}  ${pad('VERSION', 28)}  CONTRACT ID`;
    opts.stdout.write(header + '\n');
    opts.stdout.write('-'.repeat(header.length) + '\n');
    for (const e of entries) {
      opts.stdout.write(
        `${pad(e.archetypeName, 24)}  ${pad(e.archetypeKind, 12)}  ${pad(
          e.archetypeVersion,
          28,
        )}  ${e.contractId}\n`,
      );
    }
    return 0;
  } catch (err) {
    opts.stderr.write(`si contracts list: ${(err as Error).message}\n`);
    return 2;
  }
}

/**
 * `si contracts show <archetypeName>` — prints the structured detail
 * for one contract (principles, constraints, services, etc.).
 */
export async function contractsShowCommand(
  archetypeName: string,
  options: ContractsCommandOptions = {},
): Promise<number> {
  const opts = resolveOptions(options);
  if (!archetypeName) {
    opts.stderr.write('si contracts show: archetype name is required\n');
    return 2;
  }
  try {
    const detail = await showContract(archetypeName, opts.namespace, {
      graphUrl: opts.graphUrl,
      graphUser: opts.graphUser,
      graphPass: opts.graphPass,
    });
    if (!detail) {
      opts.stderr.write(
        `si contracts show: no contract found for archetype "${archetypeName}" in namespace "${opts.namespace}"\n`,
      );
      return 1;
    }
    const out = opts.stdout;
    out.write(`# Contract: ${detail.archetypeName}\n`);
    out.write(`  kind:        ${detail.archetypeKind}\n`);
    out.write(`  version:     ${detail.archetypeVersion}\n`);
    out.write(`  contractId:  ${detail.contractId}\n`);
    out.write(`  source:      ${detail.sourceBookend}\n`);
    if (detail.composes.length > 0) {
      out.write(`  composes:    ${detail.composes.join(', ')}\n`);
    }
    writeSection(out, 'Principles', detail.principles, (p) => `${p.key}: ${p.name}`);
    writeSection(out, 'Constraints', detail.constraints, (c) => `${c.key}: ${c.name}`);
    writeSection(out, 'Services', detail.services, (s) => `${s.key}: ${s.name}`);
    writeSection(out, 'Processes', detail.processes, (p) => `${p.key}: ${p.name}`);
    writeSection(
      out,
      'DataObjects',
      detail.dataObjects,
      (d) => `${d.key}: ${d.name}`,
    );
    // Why: Stage 2d wrote hypothesis status back to the SIG, but the
    // operator-facing view still rendered only `text`. Surfacing
    // `[status]` + optional ` verified=<ISO>` inline closes the loop —
    // operators no longer need cypher to see which hypotheses are
    // `held` and when. F1.b (Phase 1a).
    writeSection(out, 'Hypotheses', detail.hypotheses, (h) => {
      const status = pad(`[${h.status}]`, 10);
      const verified = h.verifiedAt ? ` verified=${h.verifiedAt}` : '';
      return `${h.key}: ${status} ${h.text}${verified}`;
    });
    return 0;
  } catch (err) {
    opts.stderr.write(`si contracts show: ${(err as Error).message}\n`);
    return 2;
  }
}

function writeSection<T>(
  out: NodeJS.WritableStream,
  label: string,
  items: T[],
  fmt: (item: T) => string,
): void {
  if (items.length === 0) return;
  out.write(`\n## ${label} (${items.length})\n`);
  for (const item of items) {
    out.write(`  - ${fmt(item)}\n`);
  }
}

function pad(value: string, width: number): string {
  if (value.length >= width) return value;
  return value + ' '.repeat(width - value.length);
}
