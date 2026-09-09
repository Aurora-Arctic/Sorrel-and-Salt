# Agent skills

Transcript: [`transcripts/agent-skills.md`](transcripts/agent-skills.md).

Claude skills packaged for this repo. They live in `.claude/skills/<name>/SKILL.md`
and are invoked as `/<name>`. `CLAUDE.md`'s Skills section is the short reference —
the table of triggers — and this page holds the shape and the reasoning.

## What is here

Seven skills. Six Gitflow branch/PR skills ported from `resume-2026` in M0.10,
plus `start-task`, written for this repo afterwards:

| Skill              | Does                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-feature`   | Branches `feature/<slug>` off latest `origin/staging`, asking for the name first.                                                                                             |
| `create-hotfix`    | Branches `hotfix/<slug>` off latest `origin/main`, asking for the name first.                                                                                                 |
| `create-pr`        | Commits (after asking), pushes, opens a PR against the Gitflow-appropriate target. `hotfix/*` opens PRs into both `main` and `staging` — see `create-pr/reference-hotfix.md`. |
| `create-release`   | Computes the next semver, branches `release/<version>` off `staging`, tags `v<version>`, opens a PR into `main`.                                                              |
| `create-main-sync` | Branches `main-sync/<timestamp>` off `main`, opens a PR bringing `main`-only commits back into `staging`.                                                                     |
| `prune-branches`   | Deletes merged/gone local branches automatically, asks about never-pushed ones. Never touches `main`/`staging`.                                                               |
| `start-task`       | Not a port. Reads an Asana task's `Type` and dispatches to `create-feature` (`Feature`/`Task`/`Bugfix`) or `create-hotfix` (`Hotfix`), passing the task through.              |

The first six implement the Gitflow lane described in `CLAUDE.md` → Conventions:
`feature/*` → `staging`; `staging` → `main` via `release/MAJOR.MINOR.PATCH`;
`hotfix/*` opens both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down.

## What is not here, and why

- **No Gatsby-specific skills to exclude.** `resume-2026` has exactly these six
  skills and every one is toolchain-agnostic Git/GitHub workflow.
- **No "testing conventions", "component documentation", or "CI debugging"
  skill.** The M0.10 breakdown anticipated these, but they are not skills in
  `resume-2026` — that guidance lives in its `claude-docs/` (`CI-SETUP.md`,
  `ACCESSIBILITY.md`, `components/`) and `CLAUDE.md`. The equivalents are already
  carried in this repo: the Testing section of `CLAUDE.md`, and `claude-docs/`.
  Porting empty skill shells for them would add indirection without content.

## Adjustments made on the way in

The skill text is otherwise `resume-2026`'s, verbatim. Only repo-specific
references changed:

- **The `gitflow` CI check did not exist yet** when the skills were ported in
  M0.10. It arrived in M0.22 (`.github/workflows/gitflow.yml`). Until then the
  skills named `CLAUDE.md`'s Gitflow convention as the source of truth for
  branch-source rules, and said so; see "When the CI workflow lands" below.
- **`.claude/settings.json` created** with the `permissions.ask` entries
  (`git push origin *`, `gh pr create/view/comment/list`) the skills tell the
  reader to expect a prompt on. Without the file the note was describing nothing.
- **`create-pr` test-plan guidance** points at this repo's real check surface:
  `npm run pre-commit` today; `npm run test:coverage`, `make test-stories`, and
  Playwright e2e once the M1+ tasks wire them. The skill warns that the repo is
  pre-scaffold and a script must be confirmed real before it is cited.
- **`prune-branches` protects `staging`** alongside `main` (and keeps `master`
  defensively), replacing `resume-2026`'s `develop`.

## Hedges still to tighten

M0.22 added `.github/workflows/gitflow.yml` — it is now the source of truth
for the branch-source table. The skill files themselves still carry
`create-pr`, `create-release`, `create-main-sync` and
`create-pr/reference-hotfix.md`'s original "until the `gitflow` check lands
(M0.17/M0.20)" hedges and `create-pr`'s "this repo is pre-scaffold" caution —
both now stale and due for a tightening pass in a skill-focused task, not
this one.
