# simple-auth — Known Defects

*Every defect discovered during an adoption is documented here. The next adopter
inherits this list and either fixes what applies or documents knowing acceptance
in the adopter's `ARCHETYPE.md`.*

Mirrors `ARCHETYPE.yaml#defects_known` (which carries short summaries); this file
carries full context and remediation status.

---

## Defects

### X-SI-Actor header shortcut bypasses token verification

- **Discovered:** 2026-05-20, `solution-intelligence-identity` Stage 2a.
- **Upstream status:** N/A — this defect is in the **adopter** pattern, not in
  bangauth itself. Documented here so future adopters don't repeat it.
- **Local fix:** SI/I Stage 2b (2026-05-20) retired `assertedActor(c)` in
  `grants-http.ts` and replaced it with `actorFromToken(c)` (Authorization:
  Bearer + `verifyToken` + audit context). A regression test was added asserting
  that an `X-SI-Actor` header alone is ignored.
- **Recommendation for new adopters:** Adopt **`actorFromToken(c)`** from day
  one. Do NOT ship the `X-SI-Actor` header shortcut to production. The shortcut
  existed in SI/I Stage 2a only because the CLI hadn't shipped yet and there
  was no way to issue real tokens to the test path. By Stage 2b the CLI was
  available; the shortcut had served its purpose and was removed.
- **Detail:** The shortcut accepted any string in the `X-SI-Actor` header as
  the acting user's identity, bypassing token verification. Anyone able to send
  an HTTP request to the server could impersonate any user for grant / revoke
  operations. The fix derives the actor from the bearer token via the same path
  `/resolve` uses, ensuring the actor is whoever proved possession of a valid
  HMAC-signed token.

### Unused `createHmac` import in `adapters/memory-key-store.ts`

- **Discovered:** 2026-05-20, `solution-intelligence-identity` Stage 2a.
- **Upstream status:** Flagged for upstream patch; not yet patched as of this
  writing.
- **Local fix:** Removed the unused import in the adapted copy. Trivial.
- **Recommendation for new adopters:** Remove the unused import during
  adaptation. If your adopter's `tsconfig.json` has `noUnusedLocals: true`
  (recommended), TypeScript will surface this for you.
- **Detail:** Upstream imports both `createHmac` and `randomBytes` from
  `crypto`, but only `randomBytes` is referenced. Upstream's tsconfig does not
  enforce `noUnusedLocals`. Single-line fix.

### `email.test.ts` does not import `email.ts` — exercises template concepts via inline strings

- **Discovered:** 2026-05-20, `solution-intelligence-identity` Stage 2a.
- **Upstream status:** Flagged for upstream patch. Not blocking for adopters
  but does mean the verbatim-copied test exercises *template concepts*, not the
  actual builder.
- **Local fix:** SI/I Stage 2a deferred `email.ts` to `_deferred/` (it pulls in
  AWS SDK) and did not need the real coverage. Adopters wiring `email.ts` from
  day one should extract `buildTokenEmail` / `buildRejectionEmail` HTML builders
  out of `email.ts` into a pure module so the test can actually cover them.
- **Recommendation for new adopters:** Either defer `email.ts` (and accept the
  test as a concept-check only) or extract the pure HTML builders into their
  own module and write real tests against them.
- **Detail:** Upstream's `email.ts` imports `@aws-sdk/client-sesv2`. The
  upstream test header explains the rationale for avoiding the import in the
  test, but the result is a real coverage gap on the template-builder code path.

### Naming collision: `keys-memory.ts` and `memory-key-store.ts` both export class `MemoryKeyStore`

- **Discovered:** 2026-05-20, `solution-intelligence-identity` Stage 2a.
- **Upstream status:** Flagged for upstream rename
  (`memory-key-store.ts` → `keys-memory-test.ts`).
- **Local fix:** Keep both files in the adaptation. The Stage 2a executor
  initially planned to drop `memory-key-store.ts` per the recipe; discovered the
  test fixture is load-bearing for upstream `token.test.ts` (uses `createTestKey`
  and `MemoryKeyStore` from it). Kept both.
- **Recommendation for new adopters:** Keep both files. If your linter is strict
  about duplicate exports across the module surface, rename the test fixture's
  export locally (e.g. `MemoryKeyStoreTestFixture`) and update the import in
  `memory-key-store.test.ts` accordingly.
- **Detail:** The two files have very different shapes:
  - `keys-memory.ts` — production adapter; no parameters; generates one key on
    boot.
  - `memory-key-store.ts` — test fixture (~70 lines); accepts an initial key,
    has `addKey`, `setCurrentKid`, `createTestKey`, `createMemoryKeyStore`
    helpers.

### Module-scope singleton capture in `auth/server.ts`

- **Discovered:** 2026-05-20, `solution-intelligence-identity` Stage 2a.
- **Upstream status:** Flagged for upstream consideration. The upstream
  use-case (one-process bangauth boot) doesn't hit the issue; the defect is
  visible only in test harnesses that set env in `beforeAll`.
- **Local fix:** SI/I converted module-scope `_config`, `_keyStore`,
  `_userStore`, `_emailAdapter` to lazy accessors (`getAuthConfig()`,
  `getAuthKeyStore()`, etc.) that read env on first call. Exposed a
  `_resetAuthSingletonsForTests` helper for vitest cleanup.
- **Recommendation for new adopters:** Apply the lazy-accessor pattern from
  day one. Without it, integration tests that boot the server fresh per test
  will fail in confusing ways (the singletons captured pre-test env values).
- **Detail:** Bangauth's `server.ts` constructs the four singletons at module
  load time. Vitest's `beforeAll` runs *after* `import`, so test-time env vars
  never reach the singletons. SI/I's integration test failed with "expected []
  to include 'Operator'" because the token was signed with project `si-default`
  (the default at module-load) while the grant was tagged `p-integration` (set
  in `beforeAll`).

### macOS `pathToFileURL` quirk in CLI-entry detection

- **Discovered:** 2026-05-20, `solution-intelligence-identity` Stage 2a.
- **Upstream status:** Not present upstream (bangauth doesn't ship a CLI entry
  using `import.meta.url` comparison). The defect is in adopter code that adds
  a top-level `src/server.ts` direct-invocation guard.
- **Local fix:** Use `pathToFileURL(process.argv[1]).href` for the comparison
  against `import.meta.url`. The naive string comparison
  `import.meta.url === \`file://${process.argv[1]}\`` fails on macOS when the
  workspace lives under a path with spaces (e.g. `/Volumes/Mini Me/...`):
  spaces get percent-encoded in `import.meta.url` but not in
  `process.argv[1]`, so the comparison always returns false and the CLI exits
  without binding.
- **Recommendation for new adopters:** Use `pathToFileURL` from day one.
  Document the "Why" in the file so future maintainers don't naive-revert it.
- **Detail:** This is more a "didn't know to look for it" gotcha than a defect
  in `simple-auth`. Documenting here because it surfaces during a typical
  adoption when the adopter adds a CLI entry to the top-level server file.

### esbuild lexer trap — `*/` inside `//` inside `/** */`

- **Discovered:** 2026-05-20, `solution-intelligence-cli` Stage 2b.
- **Upstream status:** N/A — esbuild lexer behavior, not a bangauth defect.
- **Local fix:** Rewrite the offending comment without the literal `*/`
  sequence.
- **Recommendation for new adopters:** Never write the literal `*/` inside a
  `//` line comment that itself sits inside a `/** */` block comment. The
  esbuild lexer terminates the surrounding block comment from its perspective
  and aborts the transform with `Unexpected "."`. Document in your project's
  coding conventions.
- **Detail:** The original offending comment was
  `// Why: A token leaking via cat /home/*/.si/credentials ...`. The `*/`
  inside the line comment closed the surrounding block comment from esbuild's
  perspective. The fix used prose like "the matching closing block-comment
  marker" or restructured the example so the literal `*/` sequence never
  appeared.

## Format reference

Defects new adopters discover during a build add an entry here, following:

```markdown
### <short-name>

- **Discovered:** <date>, <adopter project / stage>
- **Upstream status:** <flagged | patched | won't-fix | unknown | N/A>
- **Local fix:** <how the discovering adopter fixed it>
- **Recommendation for new adopters:** <what to do>
- **Detail:** <full context>
```
