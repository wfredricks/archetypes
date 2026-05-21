/**
 * @solution-intelligence/identity — public entry point
 *
 * // Why: This file is the only stable re-export surface for callers
 * // (other SI runtime packages, the CLI, tests). Internal modules are
 * // free to refactor; this set of exports is the v0.x contract.
 *
 * @requirement REQ-SI-NF-052 (JSDoc on exported symbols)
 */

// @adopt:namespace
// Q: What's your project's short identifier?
//    Used in:
//      - npm package scope (`@solution-intelligence/*` → `@<ns>/*`)
//      - SI_* env-var prefix (`SI_PORT`, `SI_PROJECT_ID`, etc.)
//      - HTTP path conventions (the identity service uses /auth, /grants)
//      - audit-event type prefix (`si.role.granted` → `<ns>.role.granted`)
//      - CLI binary name (`si` → `<ns>`)
//      - default config / credentials paths (`~/.si/` → `~/.<ns>/`)
//      - service name (`si-identity` → `<ns>-identity`)
// Default: si  (and package scope `solution-intelligence`)
// Format: [a-z][a-z0-9-]{1,15}
// Notes: This marker is the canonical place to record the project-wide
//        rename. Individual call sites carry narrower markers that point
//        back here; replacing `si` consistently is a project-rename, not a
//        per-file edit. Run `grep -rn '@adopt:' .` after answering this
//        to see every call site that depends on the choice.


export { VERSION } from './version.js';
export { startServer, buildApp } from './server.js';
export type { ServerHandle } from './server.js';
export type { Role, RoleGrant, ResolveResponse } from './types.js';
export { ROLES } from './types.js';
