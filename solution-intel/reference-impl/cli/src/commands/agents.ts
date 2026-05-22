/**
 * Provenance:
 *   Lifted into archetypes/solution-intel/reference-impl/ on 2026-05-22
 *   from wfredricks/archetypes-solution-intelligence/cli/src/commands/agents.ts
 *   @ commit 195096307965d7ccd1a5ddac5da1b09db6b77b60.
 *
 *   Ownership: solution-intel canonical. Adopter copies replace
 *   `@adopt:` markers with adopter-specific values.
 */

/**
 * `si agents <name> run` — operator entry point for the read-only
 * agents shipped by `@solution-intelligence/agents`.
 *
 * // Why: agents are reports, not tool failures. Exit codes:
 * //   0 — agent ran (even with `error`-severity findings)
 * //   1 — connection / usage error
 * //   2 — unknown agent name / missing required flag
 *
 * @module commands/agents
 */

import {
  runCompletenessAgent,
  runBookendAuditAgent,
  formatCompletenessMarkdown,
  formatCompletenessJson,
  formatBookendAuditMarkdown,
  formatBookendAuditJson,
} from '@solution-intelligence/agents';

// @adopt:default-namespace
// Q: Solution namespace the `si agents` subcommands query when no
//    `--namespace` flag is given. Must match `@adopt:namespace` in
//    identity/src/index.ts.
// Default: asi  (matches the asi reference adoption)
// Format: [a-z][a-z0-9-]{1,15}
const DEFAULT_NAMESPACE = 'asi';

/** Format selector accepted by the run-style commands. */
export type AgentsOutputFormat = 'markdown' | 'json';

/** Options common to every agents subcommand. */
export interface AgentsCommandOptions {
  namespace?: string;
  graphUrl?: string;
  graphUser?: string;
  graphPass?: string;
  format?: AgentsOutputFormat;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

/** Options for `si agents bookend-audit run`. */
export interface BookendAuditCommandOptions extends AgentsCommandOptions {
  archetype?: string;
  archetypesRepo?: string;
}

function resolveCommon(options: AgentsCommandOptions): {
  namespace: string;
  format: AgentsOutputFormat;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  graphUrl?: string;
  graphUser?: string;
  graphPass?: string;
} {
  return {
    namespace: options.namespace ?? DEFAULT_NAMESPACE,
    format: options.format ?? 'markdown',
    stdout: options.stdout ?? process.stdout,
    stderr: options.stderr ?? process.stderr,
    graphUrl: options.graphUrl,
    graphUser: options.graphUser,
    graphPass: options.graphPass,
  };
}

/**
 * `si agents list` — print the two registered agents and their
 * one-line descriptions. Always exits 0.
 */
export function agentsListCommand(options: AgentsCommandOptions = {}): number {
  const opts = resolveCommon(options);
  opts.stdout.write('Available agents (run with `si agents <name> run`):\n\n');
  opts.stdout.write('  completeness    Walk the SIG and report gaps in archetype contracts.\n');
  opts.stdout.write('  bookend-audit   Diff a SIG-regenerated right-bookend snapshot against the committed file.\n');
  opts.stdout.write('\nReports are read-only; neither agent writes to the SIG.\n');
  return 0;
}

/**
 * `si agents completeness run` — run the CompletenessAgent and print
 * its report in the requested format.
 */
export async function completenessRunCommand(
  options: AgentsCommandOptions = {},
): Promise<number> {
  const opts = resolveCommon(options);
  try {
    const report = await runCompletenessAgent({
      namespace: opts.namespace,
      graphUrl: opts.graphUrl,
      graphUser: opts.graphUser,
      graphPass: opts.graphPass,
    });
    opts.stdout.write(
      opts.format === 'json'
        ? formatCompletenessJson(report) + '\n'
        : formatCompletenessMarkdown(report),
    );
    return 0;
  } catch (err) {
    opts.stderr.write(`si agents completeness run: ${(err as Error).message}\n`);
    return 1;
  }
}

/**
 * `si agents bookend-audit run` — run the BookendAuditAgent and print
 * its report. Requires `--archetype` and `--archetypes-repo`.
 */
export async function bookendAuditRunCommand(
  options: BookendAuditCommandOptions = {},
): Promise<number> {
  const opts = resolveCommon(options);
  const archetype = options.archetype;
  const archetypesRepo = options.archetypesRepo;
  if (!archetype) {
    opts.stderr.write('si agents bookend-audit run: --archetype is required\n');
    return 2;
  }
  if (!archetypesRepo) {
    opts.stderr.write(
      'si agents bookend-audit run: --archetypes-repo is required (path to a wfredricks/archetypes checkout)\n',
    );
    return 2;
  }
  try {
    const report = await runBookendAuditAgent({
      archetypeName: archetype,
      archetypesRepoPath: archetypesRepo,
      namespace: opts.namespace,
      graphUrl: opts.graphUrl,
      graphUser: opts.graphUser,
      graphPass: opts.graphPass,
    });
    opts.stdout.write(
      opts.format === 'json'
        ? formatBookendAuditJson(report) + '\n'
        : formatBookendAuditMarkdown(report),
    );
    return 0;
  } catch (err) {
    opts.stderr.write(`si agents bookend-audit run: ${(err as Error).message}\n`);
    return 1;
  }
}

/**
 * Validates an `--format` value. Returns `null` when the value is
 * unsupported so callers can emit a usage error.
 */
export function parseFormat(raw: string | undefined): AgentsOutputFormat | null {
  if (raw === undefined) return 'markdown';
  if (raw === 'markdown' || raw === 'json') return raw;
  return null;
}
