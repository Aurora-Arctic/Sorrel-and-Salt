# Cut the tokens a task costs

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Constraints found while measuring

- Tests cite the architecture rules by number in comments (`CLAUDE.md rule 4`, 30+ files). The ten rule numbers stay in `CLAUDE.md`.
- `scripts/tasks-md.mjs` defines a wave range (`M3.3 → M3.10`) by **file order of the `**ID — title** · Nh` headings**, and `tally.mjs` reads the same headings via `git show`. So TASKS.md splits by milestone, read in a declared sequence — not into per-task files.
- `tests/guards/doc-citation.test.ts` scans code files only (`ts/tsx/mts/mjs/scss/yml/makefile`, never `claude-docs/` or `.claude/`) and resolves a `../db/README.md, "Section"` cite by **heading prefix in the cited file**. So a doc split that leaves the `## ` headings in the original file as an index leaves every code citation resolving, with no guard change.
- `CLAUDECODE=1` is set in my shell, so test output can be quiet for me and unchanged for a human on the host.
- Claude Code loads `.claude/rules/*.md` with a `paths:` frontmatter glob **only** when a matching file is read or edited; unmatched rules are absent from context. `@imports` in CLAUDE.md are eager and buy nothing. A project `.claude/settings.json` overrides user scope for `enabledPlugins`.

## Approach — six tasks, one PR each, in this order

Minted as `MB.*` housekeeping (re-check the next free id at minting; the branch's last commit minted up to MB.141). Wave 8 tooling, like MB.102/MB.103: each lands before the next branch is cut because every later task pays for it. Moves (B, D, E) are verbatim and separate from rewrites (C, F) so that each diff is reviewable as one thing.

## Task C — slim CLAUDE.md into path-scoped rules (~3h)

`CLAUDE.md` 63.5 KB → ~18 KB, loaded every turn; the rest goes to `.claude/rules/` files that load only when a matching file is touched, or is replaced by a citation into the subsystem doc that already carries the argument.

Stays in `CLAUDE.md`, unconditionally: Vocabulary; a 10-row Commands table (dev, build, pre-commit, test:coverage, test:stories, e2e, codegen, db:migrate/seed, check:destructive-ddl); the ten architecture rules **with their numbers**, each cut to its binding sentence(s) plus a citation; Domain invariants as they are (4.8 KB, all bite on any task); the Testing bullets that apply to every test; Conventions cut to one-task-per-PR, table-then-behaviour, sweep-task rule, modules, slugs, components, Sass, design-review scope, Gitflow, doc-as-you-go, the comment rule's headline, flag-architecture-friction; Out of scope; the Skills table; a ten-line task-tracking summary (repo, project number, status table, "use `task-board.mjs`, never hand-compose `gh`").

| New file                         | `paths:`                                                                                               | Carries                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `.claude/rules/database.md`      | `src/db/**`, `src/modules/*/schema/**`, `src/modules/*/services/**`, `tests/db/**`, `tests/modules/**` | Rules 2–5 and 10 in full, `updated_at` trigger, join-table hard-delete, column-drop-is-two-PRs, raw-SQL rule |
| `.claude/rules/graphql.md`       | `src/graphql/**`, `src/modules/*/graphql/**`, `src/modules/*/loaders/**`, `src/gql/**`, `codegen.ts`   | Rules 6–9 in full, codegen staleness                                                                         |
| `.claude/rules/components.md`    | `src/components/**`, `src/scss/**`, `src/app/**`, `.ladle/**`, `tests/components/**`                   | Components layout, stories guard, Sass, measure, print styles, design-review scope, title-case buttons       |
| `.claude/rules/testing.md`       | `tests/**`, `vitest*.mts`, `playwright.config.ts`                                                      | The Testing section in full, fixture rules, the `jq` line for a coverage threshold failure                   |
| `.claude/rules/task-tracking.md` | `claude-docs/TASKS.md`, `claude-docs/tasks/**`, `claude-docs/waves/**`, `scripts/task-board.mjs`       | Board layout, minting procedure, comment rule                                                                |
| `claude-docs/commands.md` (new)  | —                                                                                                      | The long command table (docker, studio, act, seeds, workshop)                                                |

Also in C, the redundancy that is CLAUDE.md's own:

- **`TASKS.md` "Standing rules"**: delete all eleven; one line cites `CLAUDE.md`.
- **The skills**: `create-pr` loses the stale notes (the `gitflow` check "until it lands" — it has; "task identification moved to step 7 (previously…)") and every paragraph that restates CLAUDE.md; `create-feature` and `create-hotfix` become ten-line wrappers over one shared `reference-branch.md` (base branch is the only difference). The skills table in CLAUDE.md is unchanged, so `start-task`'s routing is unchanged.
- **`task-tracking.md`** keeps the argument; CLAUDE.md's summary and the rule file cite it rather than restate it.
- Precedence line added to `CLAUDE.md`: `DESIGN.md` wins over `CLAUDE.md`, which wins over `.claude/rules/`; a rule file is the long form of a `CLAUDE.md` line, never a rule of its own.

Verification: `wc -c CLAUDE.md .claude/rules/*.md`; grep tests for `CLAUDE.md rule` and confirm each number still names the same rule; open a file under `src/db/` in a fresh session and confirm the database rule is in context, then one under `src/components/` and confirm it is not.

## Decisions taken with the owner

- The Vercel plugin is disabled for this repo (project scope); user scope keeps it elsewhere.
- No project effort override: `xhigh` is a one-off, not the owner's usual setting.
- TASKS.md splits by milestone (confirmed), not by task.
- The doc splits (D, E) are in scope, not deferred; consolidation (F) follows them as its own pass so that moves and rewrites are reviewed separately.
- Six tasks, minted as `MB.*`, one PR each, A → F, each off `staging`.
