# simple-auth — Adoption Recipe

*The mechanical recipe to derive `simple-auth` (via the bangauth reference
implementation) into a new project. Generalized from the
`solution-intelligence-identity` Stage 2a adoption (2026-05-20). An executor —
sub-agent or human — can run this top-to-bottom and produce a working adoption.*

---

## Source pinning

- **Reference repo:** `https://github.com/wfredricks/bangauth`
- **Recommended commit pin:** `3ae510649b2450c71099ab1e43d9350bc11d7087` (bangauth
  v0.1.1, the commit the first adoption pinned). Later adopters should pin the
  current `main` HEAD as of their adoption date and bump SI/I-style modifications
  if upstream has changed.
- **Tag:** none — pin to commit. Tags are mutable.
- **Local clone path (executor):** clone to a path *outside* the adopter repo, e.g.
  `<workspace>/artifacts/bangauth/`. Read-only.

The adopter's provenance headers cite the exact commit hash above.

## Destination

`simple-auth` lands as a subdirectory inside the adopter's source tree (typical
layout: `<adopter>/src/auth/`). It is **not** a peer repo, not a git submodule, not
an npm dependency. Whole-cloth copy.

The adopter additionally writes:

- Top-level `ARCHETYPE.md` in the adopter repo (the project-local twin of this
  registry's description — see §"Adopter's ownership artifact").
- Optional top-level `ARCHETYPE.yaml` in the adopter repo (machine-readable).

## Files to drop entirely (NOT copied)

The bangauth reference implementation has surface area no `simple-auth` adoption
needs. By default, drop:

- **`src/handlers/`** — Lambda-shaped handlers. If your adopter uses Hono (the
  bangauth `server.ts` route shape), the handlers are redundant. If your adopter
  uses Lambda, drop `server.ts` instead.
- **`src/twin-id.ts`** and **`src/__tests__/twin-id.test.ts`** — bangauth-specific
  derivative concept. Not part of the `simple-auth` contract.
- **`src/adapters/nats-publisher.ts`** — NATS pub/sub. Compose with your own audit
  substrate instead (e.g. `simple-ledger`); see §"New files (not from upstream)".
- **`src/index.ts`** — bangauth's public API export shape. Your adopter has its
  own (different) public API.
- **`src/__tests__/mfa.test.ts`** and **`src/__tests__/recovery.test.ts`** — these
  test code paths whose source files will be deferred (see §"Files copied with
  modifications" — modification #6).

Adopters that wire MFA, recovery, or browser-flow login from day one will keep
more files than this default. Document the deviation in your adopter's
`ARCHETYPE.md`.

## Files copied verbatim (provenance header only)

These come over byte-for-byte with only an added top-of-file JSDoc header:

| Upstream source | Adopter destination |
|---|---|
| `src/adapters/email-console.ts` | `src/auth/adapters/email-console.ts` |
| `src/adapters/keys-memory.ts` | `src/auth/adapters/keys-memory.ts` |
| `src/adapters/users-memory.ts` | `src/auth/adapters/users-memory.ts` |
| `src/adapters/memory-key-store.ts` | `src/auth/adapters/memory-key-store.ts` (KEEP — see DEFECTS.md naming collision; load-bearing for `token.test.ts`) |
| `src/domain.ts` | `src/auth/domain.ts` |
| `src/mfa-session.ts` | `src/auth/_deferred/mfa-session.ts` |
| `src/mfa-store.ts` | `src/auth/_deferred/mfa-store.ts` |
| `src/totp.ts` | `src/auth/_deferred/totp.ts` |
| `src/recovery.ts` | `src/auth/_deferred/recovery.ts` |
| `src/login-page.ts` | `src/auth/_deferred/login-page.ts` |
| `src/__tests__/domain.test.ts` | `src/auth/__tests__/domain.test.ts` |
| `src/__tests__/email.test.ts` | `src/auth/__tests__/email.test.ts` (note coverage gap — see DEFECTS.md) |
| `src/__tests__/memory-key-store.test.ts` | `src/auth/__tests__/memory-key-store.test.ts` |

**Provenance header template** (TypeScript / JavaScript):

```ts
/**
 * Adapted from bangauth — https://github.com/wfredricks/bangauth
 * Source commit: <commit-sha>
 * Source path: <upstream path>
 *
 * Pattern: simple-auth (this registry).
 * Adapted for: <adopter project name and version>.
 *
 * Maintenance ownership: <team / @user>. CVE watch on node:crypto.
 * Upstream refresh policy: review at every <adopter> minor version bump.
 *
 * Modifications from upstream: none — copied verbatim.
 */
```

**`_deferred/` convention.** Files kept for archetype completeness but not wired in
the current adoption live under `src/auth/_deferred/`. Each one carries a one-line
header: `// Archetype: deferred from <adopter> <version> wiring; bring online when <trigger>.`
Add `src/auth/_deferred` to `tsconfig.json#exclude` and `.eslintrc.json#ignorePatterns`
so the AWS / SES / SSM imports inside those files don't reach the runtime.

## Files copied with modifications

### 1. `src/auth/token.ts` (from `src/token.ts`)

- **Provenance header.**
- **No code logic changes.** HMAC primitives, base64url encoding, monthly key
  derivation, grace-period handling — all preserved.
- The semantic field rename in `types.ts` (#2) propagates through `token.ts` if
  the adopter renames `constellationId` to their scope concept.

### 2. `src/auth/types.ts` (from `src/types.ts`)

- **Provenance header.**
- **Semantic rename.** Bangauth's `TokenPayload.constellationId` carries
  bangauth-specific scope semantics. Most adopters will rename it to their
  per-project / per-tenant / per-application scope concept. The SI/I adoption
  renamed it to `projectId` for per-project role scoping. Pick the name that
  matches your domain; do the rename consistently across `types.ts`, `token.ts`
  (`generateToken` param + `verifyToken` result), and the token-test assertions.
- All other types preserved.

### 3. `src/auth/config.ts` (from `src/config.ts`)

The bangauth `config.ts` pulls in `@aws-sdk/client-ssm` and
`@aws-sdk/client-secrets-manager` for production config loading. Most v0.1
adoptions don't need this on day one. **Decision per adopter:**

- **Defer to `_deferred/config.ts`** (SI/I Stage 2a's choice). Use an
  env-var-only `loadAuthConfig` helper in `src/auth/types.ts` or a small
  `src/auth/env-config.ts`. Avoids pulling AWS SDK packages into the v0.1
  install.
- **Wire from day one** if your adopter already depends on AWS SDK and SSM is
  the canonical config source.

If you wire it:

- **Provenance header.**
- **Env-var prefix rename.** `BANGAUTH_APP_NAME` → `<ADOPTER>_APP_NAME`, etc.
  Anywhere `BANGAUTH_*` appears, rename consistently.
- **Drop / rename** `BANGAUTH_CONSTELLATION_ID` to match your scope-concept
  rename (#2).

### 4. `src/auth/email.ts` (from `src/email.ts`)

The bangauth `email.ts` pulls in `@aws-sdk/client-sesv2`. Same decision as #3:

- **Defer to `_deferred/email.ts`** and use `ConsoleEmailAdapter` for v0.1.
- **Wire from day one** if SES is your real email path.

If you wire it:

- **Provenance header.**
- **User-facing string updates.** "BangAuth" → your adopter's product name
  everywhere a user sees text (subject lines, email body greetings, "from"
  sender names).
- **No protocol changes.**

### 5. `src/auth/domain.ts` (from `src/domain.ts`)

- **Provenance header only.** No code changes.

### 6. `src/auth/server.ts` (from `src/server.ts` — HEAVY MODIFICATIONS)

The most-modified file. Becomes a *Hono router*, not a top-level server. The
adopter's top-level server (separate file, e.g. `src/server.ts`) mounts this
router under `/auth`.

- **Provenance header** noting the file diverges substantially.
- **Drop imports** for MFA, TOTP, recovery, login-page (their source is in
  `_deferred/`).
- **Drop the four MFA routes** (`/auth/mfa/enroll`, `/auth/mfa/verify`) and the
  recovery routes.
- **Drop the HTML login page route** (`GET /auth/login`) and the catch-all
  redirect (CLI / API clients only in v0.1).
- **Keep the two core routes** `POST /auth/request-code` and
  `POST /auth/verify-code`.
- **Keep the JWKS endpoint** `GET /auth/.well-known/jwks.json` if peer services
  will verify tokens locally.
- **Modify `/auth/verify-code` response:** the SI/I adoption simplified to
  `{ authenticated, email, token }` (dropped bangauth's `twinId` field).
- **Export the Hono router** (not the server) so the adopter's top-level
  `src/server.ts` can mount it.
- **Drop the NATS publisher wiring.** Audit flows through your audit substrate
  (e.g. a `src/audit.ts` chainblocks wrapper — see §"New files").
- **Convert module-scope singletons to lazy accessors.** Bangauth constructs
  `_config`, `_keyStore`, `_userStore`, `_emailAdapter` at module-load time. In
  a test harness setting env vars in `beforeAll`, the singletons capture the
  pre-set values and tests fail. Replace with lazy `getAuthConfig()`,
  `getAuthKeyStore()`, etc. that read env on first call. Expose
  `_resetAuthSingletonsForTests` for vitest. See DEFECTS.md.
- **Move side effects out of the import path.** Boot banner and signal handlers
  belong in your top-level `src/server.ts`'s direct-invocation guard
  (`isCliEntry()` helper using `pathToFileURL` for macOS-correct
  `/Volumes/...` handling — see DEFECTS.md).

### 7. `src/auth/__tests__/token.test.ts` (from `src/__tests__/token.test.ts`)

- **Provenance header.**
- **Rename assertions** to match the scope-concept rename (#2). Wherever the test
  asserts `payload.constellationId`, rename to your field name. Wherever the
  test calls `generateToken({...constellationId: 'x'...})`, rename to your
  field.
- **No behavioral test changes** — crypto behavior is unchanged.

## New files (not from upstream)

These are the adopter's additions. The archetype provides primitives; the adopter
composes them.

- **`src/version.ts`** — adopter's version constant. Imported by the top-level
  server's `/health` handler and by `src/index.ts`.
- **`src/types.ts`** (different file from `src/auth/types.ts`) — the adopter's
  domain types. Role definitions, audit-event shapes, public response
  envelopes. The SI/I adoption defined `Role`, `RoleGrant`, `ResolveResponse`
  here per its MODEL.md §6.
- **`src/audit.ts`** — audit-emission wrapper. Encapsulates the audit substrate
  (chainblocks for the SI/I adoption; a JSONL fallback otherwise). Function
  shape: `async emit<Event>(payload): Promise<number>` returning the
  audit-block sequence.
- **Domain-specific server files** — `src/grants.ts`, `src/resolve.ts`,
  `src/grants-http.ts`, top-level `src/server.ts`. These are NOT part of the
  archetype; they are the adopter's own surface. The archetype contributes
  `src/auth/server.ts` (router) and its dependencies.
- **Actor identification at HTTP layer.** Adopt **`actorFromToken(c)`** from
  day one (Authorization: Bearer + `verifyToken` + your audit context). Do NOT
  ship an `X-SI-Actor`-style header shortcut to production — see DEFECTS.md.

## Package / build / config modifications

### `package.json`

- Bump adopter version per SemVer-pre convention (e.g. to `0.2.0-pre`).
- Update `description` to cite the archetype: `"Wraps the simple-auth archetype
  (passwordless email-and-code authentication with monthly-rotating HMAC
  tokens)..."`.
- **Add dependencies** if your adopter uses Hono: `hono`, `@hono/node-server`,
  plus `yaml` (or your config-file parser).
- **Drop dependencies** that come in via bangauth's full surface but aren't used
  by `simple-auth`'s router-shape: `nats`, AWS SDK packages (if you deferred
  `email.ts` and `config.ts`).

### `tsup.config.ts` (or equivalent build config)

Add the top-level server as an entry alongside any library entry:

```ts
export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
});
```

### `tsconfig.json`

Exclude `src/auth/_deferred` so the AWS / SES / SSM imports there don't reach
the compile graph:

```json
"exclude": ["dist", "node_modules", "src/auth/_deferred"]
```

### `.eslintrc.json`

Add `src/auth/_deferred` to `ignorePatterns` so the lint pass doesn't flag the
unused deferred code.

### `vitest.config.ts`

If your adopter has a coverage threshold gate, the command files at the top of
the adopter's stack (the HTTP handler files, the CLI commands) are mostly
happy-path-then-error-tail-then-exit shapes. Their error tails require fault
injection that adds noise without changing risk. Excluding them from the
unit-coverage gate and relying on the integration test for structural coverage
is the SI/I pattern — same for `grants-http.ts`.

### `CHANGELOG.md`

Cite the archetype adoption explicitly:

```
### Added

- **<Adopter name>** — Stage Nx deliverable. Per <MODEL.md or equivalent>.
- **simple-auth archetype integration** — passwordless email-and-code
  authentication with monthly-rotating HMAC-SHA256 tokens. Sourced from
  `wfredricks/bangauth@<commit>` and brought into the codebase via the archetype
  methodology (whole-cloth copy + documented modification + provenance tagging).
  See `ARCHETYPE.md`.
```

## Adopter's ownership artifact (top-level `ARCHETYPE.md`)

The adopter writes an `ARCHETYPE.md` at its repo root with this shape:

```markdown
# Archetype Manifest — <Adopter>

This document declares the archetype methodology adoptions inside <adopter>.

## Why archetype, not dependency

[ATO scope reduction, sovereignty, AI-flattened maintenance — see registry
METHODOLOGY.md]

## Adopted archetypes

### simple-auth → `src/auth/`

| Field | Value |
|---|---|
| **Registry** | https://github.com/wfredricks/archetypes/tree/main/simple-auth |
| **Source repo (library)** | https://github.com/wfredricks/bangauth |
| **Source commit** | <full-sha> |
| **Source version** | bangauth v<x.y.z> |
| **Adopted on** | <YYYY-MM-DD> (Stage Nx) |
| **Pattern** | Passwordless email-and-code authentication with monthly-rotating HMAC-SHA256 tokens |

**Files adopted:** [list, citing the commit in each provenance header]

**Files explicitly NOT adopted:** [list with reasons]

**Modifications from upstream:** [the full modifications list — this IS the
recipe to re-apply on refresh]

**Refresh policy:** [e.g. review at every minor-version bump]

**Refresh procedure:** [the eight-step procedure from
solution-intelligence-identity/ARCHETYPE.md, adapted]

**Maintenance ownership:** [team / @user]

**Intended controls satisfied:** [NIST 800-53 mapping, or your compliance
framework]
```

This adopter artifact is the project-local twin of this registry's per-archetype
description. They cross-reference each other; refreshes update both.

## Executor phases

Mirror the SI/I `ARCHETYPE-COPY-PLAN.md` phase shape:

### Phase A: Setup

1. Confirm the adopter repo is at a clean checkpoint.
2. Create branch (e.g. `stage-Nx`).
3. Confirm bangauth is cloned locally at the read-only source path.

### Phase B: Vendor the archetype

4. `mkdir -p src/auth/adapters src/auth/_deferred src/auth/__tests__`
5. Copy verbatim files (§"Files copied verbatim"). Per file: read, prepend
   provenance header, write. No batching — one file at a time.
6. Copy and modify files (§"Files copied with modifications"). Per file: read,
   apply modifications, write. Verify each compiles before moving on.
7. Run the archetype tests in isolation:
   `cd src/auth && npx vitest run __tests__/`. `domain.test.ts`,
   `email.test.ts`, `memory-key-store.test.ts` should pass verbatim.
   `token.test.ts` should pass after the field rename.

### Phase C: Adopter additions

8. Write `src/version.ts`, `src/types.ts`, `src/audit.ts`.
9. Write the adopter's domain files (e.g. SI/I had `grants.ts`, `resolve.ts`,
   `grants-http.ts`).
10. Write the top-level `src/server.ts` that mounts `auth/server.ts`'s router.
11. Write integration test(s) that walk the full canonical flow end-to-end
    against a real bound port (this is the load-bearing test).
12. Extend the smoke test to assert `startServer` imports cleanly.

### Phase D: Repo metadata

13. Update `package.json`, `tsup.config.ts`, `tsconfig.json`, `.eslintrc.json`,
    `vitest.config.ts` per §"Package / build / config modifications".
14. Update `CHANGELOG.md` with the archetype-adoption entry.
15. Write the adopter's top-level `ARCHETYPE.md`.

### Phase E: Gates

16. `npm install` succeeds.
17. `npm run typecheck` (or `npm run build`) — clean.
18. `npm run lint` — clean.
19. `npm test` — all green, including the archetype tests under
    `src/auth/__tests__/` and the integration test under `tests/`.
20. `npm run build` — `dist/` produced.
21. Runtime smoke: boot the server, curl `/health`, expect `200 OK`.

### Phase F: Commit / PR

22. `git add -A`
23. Commit with a message citing the archetype: `<Stage>: <adopter> identity
    service (simple-auth archetype + ...)`.
24. Open PR; cite the registry archetype URL in the PR body.
25. Wait for CI green.
26. Merge per your project's PR policy.

### Phase G: Findings

27. Write `build-history/BUILD-STAGE-Nx-FINDINGS.md`. Include defects discovered
    during adoption. **Update this registry's `simple-auth/DEFECTS.md`** with
    any new defects, OR open an issue here citing them.

## Hard constraints

- **Do NOT modify the bangauth repo itself.** Read-only.
- **Do NOT skip provenance headers.** Every adapted file carries one. The audit
  trail IS the methodology.
- **Do NOT batch source files into one write.** Per-file writes; verify each
  file lands cleanly before moving on.
- **Do NOT use `/tmp/`** for staging. Use `os.tmpdir()` (`os` Node module).
- **Do NOT publish modified `simple-auth` source to npm.** It's not yours to
  publish; the upstream is.
- **Do NOT delete any `_deferred/` files.** They're load-bearing for archetype
  completeness even when not wired.
- **Do NOT carry the X-SI-Actor header shortcut to production.** Token-derived
  actor from day one.
- **Watch the esbuild trap:** do not write `*/` inside `//` line comments inside
  `/** */` block comments. The lexer terminates the block comment from your
  perspective and breaks the transform. Use prose like "the matching closing
  block-comment marker" instead.
- **macOS path quirk.** `fs.mkdtemp` returns `/var/folders/...` but
  `process.cwd()` after `chdir` returns `/private/var/folders/...`. Capture
  `process.cwd()` *after* the chdir and compare against that.

## Defects-fix obligation

Before declaring the adoption done, walk [`./DEFECTS.md`](./DEFECTS.md) end to
end. For each defect: either apply the fix to your adoption, OR document
knowing-acceptance in the adopter's `ARCHETYPE.md`. Skipping this step breaks
the compounding-quality property of the methodology.

## Time budget

Target wall-clock: 90-150 minutes for a typical adoption with no surprises.
Hard cap: 180 minutes — if you exceed, stop and surface what blocked.

## Output expected at the end

- PR open (or merged) on the adopter repo containing all artifacts above.
- CI green.
- Adopter's `ARCHETYPE.md` written and committed.
- `build-history/BUILD-STAGE-Nx-FINDINGS.md` written.
- This registry's `simple-auth/DEFECTS.md` updated (or an issue opened) with
  any new defects discovered.
- Status summary sent to the orchestrator / human-of-record.
