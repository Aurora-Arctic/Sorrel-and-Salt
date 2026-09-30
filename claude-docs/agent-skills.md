# Agent skills

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

Claude skills for this repo, at `.claude/skills/<name>/SKILL.md`, invoked as
`/<name>`. [`CLAUDE.md`](../CLAUDE.md)'s Skills section is the trigger table;
this page holds the shape.

| Skill              | Does                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start-task`       | Finds a task's issue by exact id (`scripts/task-board.mjs find`) and dispatches to `create-hotfix` on the `hotfix` label or hotfix wording, `create-feature` otherwise, passing the task through.                                                                                                                               |
| `create-feature`   | Branches `feature/<slug>` off latest `origin/staging`, asking for the name first. A wrapper over `create-feature/reference-branch.md`, the steps it shares with `create-hotfix`.                                                                                                                                                |
| `create-hotfix`    | Branches `hotfix/<slug>` off latest `origin/main` through the same `create-feature/reference-branch.md`. The two differ only in base and prefix.                                                                                                                                                                                |
| `create-pr`        | Commits (after asking), pushes, opens a PR against a target `.github/workflows/gitflow.yml` allows, and ends each PR's body with the `project-progress` tally. `hotfix/*` opens PRs into both `main` and `staging` — see `create-pr/reference-hotfix.md`.                                                                       |
| `create-release`   | Computes the next semver, branches `release/<version>` off `staging`, tags `v<version>`, opens a PR into `main`.                                                                                                                                                                                                                |
| `create-main-sync` | Branches `main-sync/<timestamp>` off `main`, opens a PR bringing `main`-only commits back into `staging`.                                                                                                                                                                                                                       |
| `prune-branches`   | Deletes merged/gone local branches automatically, asks about never-pushed ones. Never touches `main`/`staging`.                                                                                                                                                                                                                 |
| `project-progress` | Tasks and hours completed, remaining and total, from local data only: the `· Nh` estimates in `claude-docs/tasks/` joined to what has merged into `origin/staging`. The issue tracker is read only in its opt-in verify mode, via `task-board.mjs list`; work done outside git is a short list in `project-progress/tally.mjs`. |

All but `start-task` and `project-progress` implement the Gitflow lane in
`CLAUDE.md` → Conventions; `.github/workflows/gitflow.yml` enforces which
source may PR into which target, and is the source of truth the skills defer
to.

- **`.claude/settings.json` is shared, committed config** — it carries the
  `permissions.ask` entries (`git push origin *`, `git push -u origin *`,
  `gh pr create/view/comment/list`) the skills tell the reader to expect a
  prompt on. **Personal permission grants and MCP configuration belong in
  `.claude/settings.local.json`**, which is not committed.
- **A skill's supporting files sit beside its `SKILL.md`**:
  `create-pr/reference-hotfix.md`, `project-progress/tally.mjs`, and
  `create-feature/reference-branch.md`, which `create-hotfix` also follows. A
  file two skills share goes inside one of them, so that every directory under
  `.claude/skills/` is a skill.
- **Adding a skill means adding its row to `CLAUDE.md`'s Skills table** and
  updating this summary, in the same PR. (Its transcript was archived by
  M0.34, and MB.31 retired the obligation to keep writing one — a PR body
  carries what an entry would have said.)

There are deliberately **no** "testing conventions", "component documentation"
or "CI debugging" skills: that guidance lives in `CLAUDE.md` and `claude-docs/`,
and an empty skill shell would add indirection without content.

## Rule files

`CLAUDE.md` loads on every turn, so it carries only what every task obeys: the
vocabulary, ten commands, the ten architecture rules cut to their binding
sentences, the domain invariants, the testing and convention rules, and a
summary of task tracking. It stays within 20 KB. The long forms are
`.claude/rules/<area>.md`, one per area:

| Rule file       | Loads for                                                                                  | Carries                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `database`      | `src/db/`, the modules' `schema/` and `services/`, `tests/db/`, `tests/modules/`, the seed | Rules 2–5 and 10 in full: the exemptions, audit columns, `updated_at`, hard deletes, `sql` |
| `graphql`       | `src/graphql/`, the modules' `graphql/` and `loaders/`, `src/gql/`, `tests/graphql/`       | Rules 8 and 9 in full, the SDL snapshot, codegen, error mapping                            |
| `components`    | `src/components/`, `src/scss/`, the pages, `src/emails/`, `.ladle/`, `tests/components/`   | Component layout, stories and docs, Sass, the measure, design-review scope, button case    |
| `testing`       | `tests/`, the Vitest and Playwright configs                                                | The Testing section in full, the harness, fixtures, the coverage `jq` line                 |
| `task-tracking` | `TASKS.md`, `tasks/`, `waves/`, `task-tracking.md`, the board scripts, `.claude/skills/`   | Board layout, the status table, the lookup rule, PR bodies, comments, minting              |

**How one loads.** Claude Code reads a rule file's `paths:` frontmatter, a list
of globs from the repo root, and adds the file to the session once the **Read
tool** opens a file one of them matches; from then on it stays. A fresh
session checked this in MB.144: reading a file under `src/db/` brought in the
database rule alone, a component brought in the components rule and not the
database's, and the same `src/db/` file read with `head` through the shell
brought in nothing. So a session that reads through the shell, as auto mode
prefers, never sees a rule file unless it opens one — which is why `CLAUDE.md`
names each, and says to.

**Precedence.** `DESIGN.md` wins over `CLAUDE.md`, which wins over a rule file.
A rule file is the long form of lines in `CLAUDE.md`, never a rule of its own:
a rule every task must know belongs in `CLAUDE.md`, and a rule file only
restates it at length.

**What holds it.** `tests/guards/claude-rules.test.ts` fails a rule file with
no `paths:` (it would load on every turn, `CLAUDE.md`'s cost under another
name), a glob that matches no file (a rule that can never load), a `CLAUDE.md`
over 20 KB or naming a rule file it omits, and a renumbered or gutted
architecture rule: code cites them by number (`CLAUDE.md rule 4`), so each rule
keeps the phrases its citations rely on. `tests/guards/doc-citation.test.ts`
reads `CLAUDE.md` and every markdown file under `.claude/`, so a rule file's
citation into `claude-docs/` has to resolve.
