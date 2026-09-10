# Agent skills

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

Claude skills for this repo, at `.claude/skills/<name>/SKILL.md`, invoked as
`/<name>`. [`CLAUDE.md`](../CLAUDE.md)'s Skills section is the trigger table;
this page holds the shape.

| Skill              | Does                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start-task`       | Reads an Asana task's `Type` and dispatches to `create-feature` (`Feature`/`Task`/`Bugfix`) or `create-hotfix` (`Hotfix`), passing the task through.                          |
| `create-feature`   | Branches `feature/<slug>` off latest `origin/staging`, asking for the name first.                                                                                             |
| `create-hotfix`    | Branches `hotfix/<slug>` off latest `origin/main`, asking for the name first.                                                                                                 |
| `create-pr`        | Commits (after asking), pushes, opens a PR against the Gitflow-appropriate target. `hotfix/*` opens PRs into both `main` and `staging` — see `create-pr/reference-hotfix.md`. |
| `create-release`   | Computes the next semver, branches `release/<version>` off `staging`, tags `v<version>`, opens a PR into `main`.                                                              |
| `create-main-sync` | Branches `main-sync/<timestamp>` off `main`, opens a PR bringing `main`-only commits back into `staging`.                                                                     |
| `prune-branches`   | Deletes merged/gone local branches automatically, asks about never-pushed ones. Never touches `main`/`staging`.                                                               |

All but `start-task` implement the Gitflow lane in `CLAUDE.md` → Conventions.

- **`.claude/settings.json` is shared, committed config** — it carries the
  `permissions.ask` entries (`git push origin *`,
  `gh pr create/view/comment/list`) the skills tell the reader to expect a
  prompt on. **Personal permission grants and MCP configuration belong in
  `.claude/settings.local.json`**, which is not committed.
- **Adding a skill means adding its row to `CLAUDE.md`'s Skills table** and an
  entry in the agent-skills transcript, in the same PR.

There are deliberately **no** "testing conventions", "component documentation"
or "CI debugging" skills: that guidance lives in `CLAUDE.md` and `claude-docs/`,
and an empty skill shell would add indirection without content.

## Hedges still to tighten

`create-pr`, `create-release`, `create-main-sync` and
`create-pr/reference-hotfix.md` still say the `gitflow` CI check is yet to land
(naming M0.17/M0.20) and treat `CLAUDE.md` as the source of truth for
branch-source rules. It landed as `.github/workflows/gitflow.yml`, which is now
that source of truth. `create-pr` also still cautions that the repo is
pre-scaffold. Both are stale and due for a skill-focused pass.
