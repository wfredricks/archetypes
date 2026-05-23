# BUILD-MOVE-AND-WORKSPACE-EDITS-FINDINGS

*2026-05-22 night. Combined findings from the original sub-agent run (`fb252e15`, timed out at 11m9s) and the resume sub-agent that finished the job.*

---

## Wall-clock by stage

| Stage | Owner | Duration |
|---|---|---|
| A1 (composition skeleton, commit `df4aa5c`) | original sub-agent | ~3 min |
| A2 (byte-identical move, commit `da14e61`) | original sub-agent | ~3 min |
| A3 work-tree edits (uncommitted at timeout) | original sub-agent | ~5 min |
| **Original sub-agent timeout** | — | **11m9s total** |
| Resume read-in + state verification | resume sub-agent | ~1 min |
| YAML pronoun fix + A3 commits (`b645bc3`, `919bb15`) | resume | ~2 min |
| A4 §III Workspaces insert + renumber (`f785366`) | resume | ~3 min |
| A5.3 cross-reference update (`27d4d25`) | resume | ~1 min |
| A6 blackboard YAML updates (`3cd7e32`) | resume | ~1 min |
| Phase B redirect note commit (`a5d566f`) | resume | ~1 min |
| Verification + FINDINGS + PR descriptions | resume | ~2 min |
| **Resume sub-agent total** | — | **~11 min** |

Combined wall-clock: ~22 minutes across two sub-agent runs.

---

## The YAML pronoun defect

**Discovered:** post-A2, during resume read-in of `ARCHETYPE.yaml`.
**Defect:** line 8 contained "agents (the Visitor and her siblings)" — a feminine pronoun referring to Knowledge Sources, in direct violation of plan §A3.4 ("no feminine pronouns referring to Knowledge Sources").
**Root cause:** the defect originated in Bhai's plan §A1.2 YAML template — the plan itself contained the violation, so the first sub-agent followed the plan faithfully and committed the defect into `df4aa5c`. The plan was wrong about this one phrase.
**Fix:** resume sub-agent landed commit `b645bc3` on the same branch, replacing "her" with "its" before any further A3 commits.
**Lesson:** YAML templates inside plans need the same pronoun-discipline scan as the prose sections they govern.

---

## The verbose-prose timeout mode (first sub-agent)

The first sub-agent appears to have generated extensive markdown narration between tool calls — the run summary showed 40 tokens of tool input vs. 18,000 tokens of output. This is the wrong shape for a long-running mechanical task: most tokens should be tool I/O, not internal narration.

The resume task explicitly minimized prose between tool calls (one-line status updates or none) and finished in ~11 minutes including a defect fix the first run did not need to handle.

**Lesson:** for resume-style or mechanical-execution sub-agent tasks, the prompt should explicitly instruct "lean on tool calls, minimize narration" — and the sub-agent should treat that as a hard constraint.

---

## PR state — branches pushed status

**Both branches are committed locally in `/tmp/archetypes-work/` but were NOT pushed to GitHub.** No GitHub authentication is available in this environment:

- `gh` CLI is not installed
- No `GITHUB_TOKEN` or `GH_TOKEN` env var
- No SSH keys in `~/.ssh/`
- macOS keychain `git credential-osxkeychain` has no cached credentials for `https://github.com`
- `git push` hangs on terminal username prompt (disabled with `GIT_TERMINAL_PROMPT=0` to confirm)

**What this means for Bill:** to open the PRs, push the branches manually from a terminal where credentials are available, then open PRs on GitHub from these compare URLs:

- archetypes: https://github.com/wfredricks/archetypes/compare/main...move-archaeologist-and-workspaces-2026-05-22
- solution-intelligence: https://github.com/wfredricks/solution-intelligence/compare/main...archaeologist-relocation-redirect-2026-05-22

To push:
```bash
cd /tmp/archetypes-work/archetypes && git push -u origin move-archaeologist-and-workspaces-2026-05-22
cd /tmp/archetypes-work/solution-intelligence && git push -u origin archaeologist-relocation-redirect-2026-05-22
```

PR description text (ready to paste into GitHub UI):
- `/tmp/archetypes-work/PR-DESCRIPTION-archetypes.md`
- `/tmp/archetypes-work/PR-DESCRIPTION-solution-intelligence.md`

---

## Verification — all C2 checks pass

```
THE-ARCHAEOLOGIST.md (relocated):
  'every SIG mutation' (must be 0):           0   ✅
  'every mutation in every zone' (must be 1): 1   ✅
  feminine pronouns (must be 0):              0   ✅
  §V paragraph count (must be 5):             5   ✅

ARCHETYPE.yaml (composition):
  feminine pronouns (must be 0):              0   ✅

THE-BLACKBOARD.md:
  '^## III. Workspaces' (must be 1):          1   ✅
  '^## X. The reference implementation':      1   ✅
  feminine pronouns (must be 0):              0   ✅

Byte-identity vs solution-intelligence@219d4c8:
  §II prose:                                  identical   ✅
  §VIII prose (afternoon report body):        identical   ✅
  (Footer block has one new italic paragraph per plan §A3.6, intentional)
```

All seven A-commits and the one B-commit are on their respective branches, in plan-specified order, with clean working trees on both repos.

---

## Commit roster

**archetypes** (branch `move-archaeologist-and-workspaces-2026-05-22`, 7 new commits on top of `a24806e`):

```
3cd7e32 blackboard: update ARCHETYPE.yaml to point at code-archaeology-blackboard composition
27d4d25 blackboard/docs/THE-BLACKBOARD.md: update §X to reference code-archaeology-blackboard composition
f785366 blackboard/docs/THE-BLACKBOARD.md: add §III Workspaces section; renumber later sections
919bb15 blackboard/code-archaeology-blackboard/docs: apply workspace-zone edits to THE-ARCHAEOLOGIST.md
b645bc3 blackboard/code-archaeology-blackboard: fix YAML description pronoun (its, not her)
da14e61 blackboard/code-archaeology-blackboard/docs: add THE-ARCHAEOLOGIST.md (moved from solution-intelligence)
df4aa5c blackboard/code-archaeology-blackboard: add composition archetype skeleton
```

**solution-intelligence** (branch `archaeologist-relocation-redirect-2026-05-22`, 1 new commit on top of `219d4c8`):

```
a5d566f docs: redirect THE-ARCHAEOLOGIST.md to its new home in archetypes registry
```

🖇️
