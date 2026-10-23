# Agent skills

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

Claude skills for this repo, at `.claude/skills/<name>/SKILL.md`, invoked as
`/<name>`. [`CLAUDE.md`](../CLAUDE.md)'s Skills section is the trigger table;
this page holds the shape.

| Skill                 | Does                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start-task`          | Finds a task's issue by exact id (`scripts/task-board.mjs find`) and dispatches to `create-hotfix` on the `hotfix` label or hotfix wording, `create-feature` otherwise, passing the task through.                                                                                                                               |
| `create-feature`      | Branches `feature/<slug>` off latest `origin/staging`, asking for the name first. A wrapper over `create-feature/reference-branch.md`, the steps it shares with `create-hotfix`.                                                                                                                                                |
| `create-hotfix`       | Branches `hotfix/<slug>` off latest `origin/main` through the same `create-feature/reference-branch.md`. The two differ only in base and prefix.                                                                                                                                                                                |
| `create-pr`           | Commits (after asking), pushes, opens a PR against a target `.github/workflows/gitflow.yml` allows, and ends each PR's body with the `project-progress` tally. `hotfix/*` opens PRs into both `main` and `staging` — see `create-pr/reference-hotfix.md`.                                                                       |
| `create-release`      | Computes the next semver, branches `release/<version>` off `staging`, tags `v<version>`, opens a PR into `main`. The merged-PR lookup and the notes it shares with `create-main-sync` are `create-release/reference-shared.md`.                                                                                                 |
| `create-main-sync`    | Branches `main-sync/<timestamp>` off `main`, opens a PR bringing `main`-only commits back into `staging`, through the same `create-release/reference-shared.md`.                                                                                                                                                                |
| `create-bug-task`     | Asks for a bug and its steps to reproduce, drafts a story, acceptance criteria and a name for review, then mints an `MB.*` `Bug` issue in the `Bugfixes` milestone and its entry in `tasks/mb.md`. The mechanics it shares with `create-feature-task` are `create-bug-task/reference-mint.md`.                                  |
| `create-feature-task` | Asks for a feature, drafts the same for review, suggests a wave milestone and waits for approval, then mints an `M<wave>.<n>` `Task` issue there and its entry in that milestone's task docs.                                                                                                                                   |
| `prune-branches`      | Deletes merged/gone local branches automatically, asks about never-pushed ones. Never touches `main`/`staging`.                                                                                                                                                                                                                 |
| `project-progress`    | Tasks and hours completed, remaining and total, from local data only: the `· Nh` estimates in `claude-docs/tasks/` joined to what has merged into `origin/staging`. The issue tracker is read only in its opt-in verify mode, via `task-board.mjs list`; work done outside git is a short list in `project-progress/tally.mjs`. |

All but `start-task` and `project-progress` implement the Gitflow lane in
`CLAUDE.md` → Conventions; `.github/workflows/gitflow.yml` enforces which
source may PR into which target, and is the source of truth the skills defer
to.

**Model and effort.** A skill's frontmatter can pick the model and how hard it
thinks for as long as the skill runs; both revert on your next prompt and
neither is saved to settings. The session runs Sonnet at high effort, so the
settings below only lower cost:

| Skill                                             | Model    | Effort   | Why                                                                                                           |
| ------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `project-progress`                                | `haiku`  | `low`    | Runs one script and prints what it returns.                                                                   |
| `create-feature`, `create-hotfix`                 | `haiku`  | `low`    | Follow the fixed steps of `create-feature/reference-branch.md`.                                               |
| `create-pr`, `create-release`, `create-main-sync` | `sonnet` | `medium` | Write a summary and, for `create-pr`, choose a target. Pinning `sonnet` stops a session on Opus costing more. |
| `create-bug-task`, `create-feature-task`          | `sonnet` | `medium` | Draft prose and choose a milestone, then run fixed minting steps.                                             |
| `prune-branches`                                  | `sonnet` | `medium` | Deletes branches, so it keeps a mid-tier model.                                                               |
| `start-task`                                      | none     | none     | Step 6 implements the task, so it uses whatever the session is set to.                                        |

`project-progress` also pre-approves its three read-only commands with
`allowed-tools`. No skill pre-approves a push or a PR: the `permissions.ask`
entries below still win over `allowed-tools`, on purpose. `start-task` follows
`create-feature/reference-branch.md` itself rather than calling the two branch
skills, so their `haiku` setting only applies to a direct `/create-feature` or
`/create-hotfix`.

- **`.claude/settings.json` is shared, committed config** — it carries the
  `permissions.ask` entries (`git push origin *`, `git push -u origin *`,
  `gh pr create/view/comment/list`) the skills tell the reader to expect a
  prompt on. **Personal permission grants and MCP configuration belong in
  `.claude/settings.local.json`**, which is not committed.
- **A skill's supporting files sit beside its `SKILL.md`**:
  `create-pr/reference-hotfix.md`, `project-progress/tally.mjs`,
  `create-feature/reference-branch.md`, which `create-hotfix` also follows,
  and `create-release/reference-shared.md`, which `create-main-sync` also
  follows. A file two skills share goes inside one of them, so that every
  directory under `.claude/skills/` is a skill.
- **Adding a skill means adding its row to the table above**, in the same
  PR. `CLAUDE.md` no longer tables them, the owner's call during MB.154:
  every session already lists each skill with its description, which is its
  trigger, so the table there only repeated it, at a cost against
  `CLAUDE.md`'s 20 KB budget. (Its transcript was archived by
  M0.34, and MB.31 retired the obligation to keep writing one — a PR body
  carries what an entry would have said.)

There are deliberately **no** "testing conventions", "component documentation"
or "CI debugging" skills: that guidance lives in `CLAUDE.md` and `claude-docs/`,
and an empty skill shell would add indirection without content.

## Rule files

`CLAUDE.md` loads on every turn, so it carries only what every task obeys: the
vocabulary, ten commands, the ten architecture rules cut to their binding
sentences, the domain invariants, the testing and convention rules, a
summary of task tracking, and the token-spending rules. It stays within 20 KB. The long forms are
`.claude/rules/<area>.md`, one per area:

| Rule file       | Loads for                                                                                    | Carries                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `database`      | `src/db/`, the modules' `schema/` and `services/`, `tests/db/`, `tests/modules/`, the seed   | Rules 2–5 and 10 in full: the exemptions, audit columns, `updated_at`, hard deletes, `sql`                 |
| `graphql`       | `src/graphql/`, the modules' `graphql/` and `loaders/`, `src/gql/`, `tests/graphql/`         | Rules 8 and 9 in full, the SDL snapshot, codegen, error mapping                                            |
| `components`    | `src/components/`, `src/scss/`, the pages, `src/emails/`, `.storybook/`, `tests/components/` | Component layout, stories and docs, Sass, the measure, design-review scope, the browser floor, button case |
| `testing`       | `tests/`, the Vitest and Playwright configs                                                  | The Testing section in full, the harness, fixtures, the coverage `jq` line                                 |
| `task-tracking` | `TASKS.md`, `tasks/`, `waves/`, `task-tracking.md`, the board scripts, `.claude/skills/`     | Board layout, the status table, the lookup rule, PR bodies, comments, minting                              |
| `writing`       | every markdown file: `claude-docs/`, `.claude/`, `CLAUDE.md`, `README.md`, the `.ack.md`s    | Plain language for readers of every experience level: who reads, how, where precision wins                 |

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

**What holds it.** Review, since MB.224: code used only by agents is never
tested ([`testing/layer-ownership.md`](testing/layer-ownership.md), "What a test
may assert"). A rule file carries `paths:` (without, it would load on every
turn, `CLAUDE.md`'s cost under another name) and a glob that matches a file (or
it can never load); `CLAUDE.md` stays under 20 KB and names every rule file; an
architecture rule is never renumbered or gutted, since code cites them by
number (`CLAUDE.md rule 4`); and a rule file's citation into `claude-docs/`
resolves.
