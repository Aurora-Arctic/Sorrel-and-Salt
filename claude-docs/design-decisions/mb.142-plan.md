# Cut the tokens a task costs

## Context

Every task on this project starts from ~30k tokens of fixed context per turn and then reads documents measured in hundreds of kilobytes. Measured on this checkout (1 token ≈ 4 bytes):

| What                                                  | Size                      | When it is paid                                                                                                          |
| ----------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md`                                           | 63.5 KB ≈ 16k             | Every turn, every session; edited in 15/30 last PRs                                                                      |
| Vercel plugin (49 skills, ~250 MCP tool names, hooks) | ≈ 10k                     | Every turn; never used — deploys are CI-only (M0.26)                                                                     |
| Memory index                                          | ≈ 2k                      | Every turn                                                                                                               |
| `claude-docs/TASKS.md`                                | 806 KB ≈ 200k             | Edited in 20/30 last PRs; `start-task` says "read the milestone" — the MB section alone is 411 KB                        |
| … its execution-order table                           | 147 KB in 78 lines        | A `grep` for any task id returns a 12 KB table row                                                                       |
| `claude-docs/DESIGN.md`                               | 248 KB ≈ 62k              | Read by §, edited in 13/30 PRs                                                                                           |
| `claude-docs/db.md`                                   | 236 KB ≈ 59k, 37 sections | Cited 105 times by section from code; read whole when not disciplined                                                    |
| `auth.md` / `ci.md` / `testing.md` / `graphql.md`     | 93 / 74 / 63 / 58 KB      | 13 / 10 / 9 / 15 sections; one `auth.md` section is 35 KB                                                                |
| `npm run test:coverage` output                        | ≈ 6–8k per run            | 3–6 runs per task: the `text` coverage table prints ~200 file rows and the default reporter one line per test file (199) |
| `create-pr` skill                                     | 16.5 KB                   | Once per PR, and it repeats CLAUDE.md's task-tracking section, already in context                                        |

The per-PR footprint (25–40 files: component + story + scss + types + test + doc + TASKS.md + codegen) is the guards' doing and is not targeted here.

### Redundancy, measured

Exact-sentence duplication across the 82 live docs and skills is small (8 KB). Paraphrase is not: 6,537 eight-word runs occur in two or more files. Where they sit, by pair:

| Pair                                          | Shared runs               | What is repeated                                                                                                              |
| --------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `TASKS.md` ↔ `design-decisions/*-plan.md`     | 725 + 197 + 150 + 121 + … | "Decided while building X" paragraphs and wave-row reasoning restate the plan records; `mb.100-plan.md` is 30% recurrence     |
| `TASKS.md` ↔ `DESIGN.md`                      | 597                       | Task entries restate the § they implement                                                                                     |
| `DESIGN.md` ↔ `db.md`                         | 460                       | `db.md` restates §5's data model rather than citing it (the identity-model section alone is 24.7 KB)                          |
| `create-feature` ↔ `create-hotfix`            | 422                       | The two skills are 31–33% identical; only the base branch differs                                                             |
| `CLAUDE.md` ↔ `TASKS.md`                      | 291                       | All eleven of `TASKS.md`'s "Standing rules" restate `CLAUDE.md`                                                               |
| `CLAUDE.md` ↔ `task-tracking.md` ↔ the skills | 227 + …                   | The board layout and status rules are stated in all three                                                                     |
| Wave reasoning                                | —                         | Three copies: the table column (147 KB), the milestone "Sequencing" preambles (9.9 KB), and each GitHub milestone description |

`withAudit` is explained in 25 live files, `server-only` in 19, the `In Review` rule in 16, `slugify` in 14. Many are legitimate mentions; the rules themselves are stated in four or five places each.

### Constraints found while measuring

- Tests cite the architecture rules by number in comments (`CLAUDE.md rule 4`, 30+ files). The ten rule numbers stay in `CLAUDE.md`.
- `scripts/tasks-md.mjs` defines a wave range (`M3.3 → M3.10`) by **file order of the `**ID — title** · Nh` headings**, and `tally.mjs` reads the same headings via `git show`. So TASKS.md splits by milestone, read in a declared sequence — not into per-task files.
- `tests/guards/doc-citation.test.ts` scans code files only (`ts/tsx/mts/mjs/scss/yml/makefile`, never `claude-docs/` or `.claude/`) and resolves a `db.md, "Section"` cite by **heading prefix in the cited file**. So a doc split that leaves the `## ` headings in the original file as an index leaves every code citation resolving, with no guard change.
- `CLAUDECODE=1` is set in my shell, so test output can be quiet for me and unchanged for a human on the host.
- Claude Code loads `.claude/rules/*.md` with a `paths:` frontmatter glob **only** when a matching file is read or edited; unmatched rules are absent from context. `@imports` in CLAUDE.md are eager and buy nothing. A project `.claude/settings.json` overrides user scope for `enabledPlugins`.

## Approach — six tasks, one PR each, in this order

Minted as `MB.*` housekeeping (re-check the next free id at minting; the branch's last commit minted up to MB.141). Wave 8 tooling, like MB.102/MB.103: each lands before the next branch is cut because every later task pays for it. Moves (B, D, E) are verbatim and separate from rewrites (C, F) so that each diff is reviewable as one thing.

### Task A — the fixed overhead (config only, ~1h)

1. `.claude/settings.json`: add `"enabledPlugins": { "vercel@claude-plugins-official": false }`. Removes the plugin's skills, agents, ~250 deferred tool names and the SessionStart "knowledge update" blob from this repo's sessions. User scope keeps it for other repos.
2. `.claude/settings.local.json`: drop the `asana` entry from `enabledMcpjsonServers` and the four `mcp__asana__*` allows — the board moved in MB.89, `.mcp.json` no longer defines the server.
3. `vitest.config.mts`: key the reporters on `process.env.CLAUDECODE`:
   - `coverage.reporter`: `text` → `text-summary` under Claude Code (keeps `lcov`, `html`, `json-summary`; the threshold is computed regardless). A threshold failure names the metric; the offending files come from `.reports/coverage/coverage-summary.json` with one `jq` line, which the testing rule file (Task C) carries.
   - `reporters`: `['default']` → `['dot']` under Claude Code — failures still print in full.
   - `vitest.stories.config.mts` keeps its story checklist; it is 51 lines and is the point of that run.
4. Memory (outside the repo, no PR): delete `feedback_asana_html_body.md` and `project_asana_wave_subtasks.md`, whose subject is gone; add `feedback_read_docs_by_section.md`: read a subsystem doc by its `## ` section and a task by its heading, never the file.

**Outcome (measured while building).** The reporters were the smaller half: a green `test:coverage` printed 11,864 lines with `dot` and `text-summary` alone, almost all of it the console output of passing tests (pg notices, React warnings) and a two-line Node `localStorage` warning from each of 185 workers. `silent: 'passed-only'` and `execArgv: ['--disable-warning=ExperimentalWarning']`, under the same `CLAUDECODE` switch, took it to 27 lines; a failing test still prints in full.

Not in scope: an `effortLevel` override. The owner does not normally run at `xhigh`; the current setting is a one-off.

Verification: a fresh session lists no `vercel:*` skills or `mcp__plugin_vercel_*` tools; `CLAUDECODE=1 npm run test:coverage` prints the 4-line summary and dots; `npm run test:coverage` on the host is unchanged.

### Task B — split TASKS.md by milestone (~3h)

`TASKS.md` becomes the index; the milestone sections become files; the execution-order table's reasoning column becomes per-wave files. Verbatim moves only.

1. **`claude-docs/tasks/<milestone>.md`** — one file per `## M0 …` / `## MB …` / `## MW …` section, moved as is. Sequence is the current section order: `m0, m1, …, m11, m7a, mb, mw`.
2. **`claude-docs/waves/wave-NN.md`** — the third column of each execution-order row, moved as is. The table keeps its first two columns (wave, id cell) and a link.
3. **`TASKS.md`** keeps the preamble, Standing rules (Task C deletes them), Deferred to v2, the execution-order table (ids only), and an index of the milestone files with their `_N tasks · N hours_` lines. ≤ 40 KB from 806.
4. **`scripts/tasks-md.mjs`**: `loadTasksMd` reads `TASKS.md` then `claude-docs/tasks/*.md` in a declared sequence (`TASKS_FILES`, exported) and concatenates before `readTasksMd`; `tally.mjs` reads the same list via `git show <ref>:<path>`. `readTasksMd(text)` and `expandIds` are unchanged, so `tests/scripts/tasks-md.test.ts` and `task-board.test.ts` stay green; add one test that the sequence names every file in `claude-docs/tasks/` (a file added but not sequenced is otherwise silently unpriced).
5. **`.claude/skills/start-task/SKILL.md` step 6**: "read the `TASKS.md` milestone" → "read the task's entry, from its `**<ID> — ` heading to the next, in `claude-docs/tasks/<milestone>.md`, and its `claude-docs/waves/wave-NN.md`". The issue body is the same text and is already fetched.
6. **`CLAUDE.md`** "Minting a task", `claude-docs/task-tracking.md` "Order", and `claude-docs/README.md` name the new paths.

Verification: `node scripts/task-board.mjs reorder` prints no moves; `node .claude/skills/project-progress/tally.mjs` prints the figures recorded before the split; `npm run pre-commit`; `npx vitest run tests/scripts tests/guards`.

### Task C — slim CLAUDE.md into path-scoped rules (~3h)

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

### Task D — split db.md (~2h)

Each of the 37 `## ` sections moves verbatim to `claude-docs/db/<slug>.md`. `db.md` keeps every `## ` heading as an index: heading, one sentence, link. The 105 section citations in code keep resolving (the guard matches a heading prefix in `db.md`) and the 159 plain-path citations keep pointing at the index, so no code file changes and the guard is untouched. Intra-doc links (`#anchor`) are rewritten to the new files; `claude-docs/README.md` names the layout. The reader lands one hop from the section, and the hop costs 6 KB (the index) instead of 236.

Verification: `npx vitest run tests/guards/doc-citation.test.ts`; grep `claude-docs/` for `db.md#` and confirm none is left.

### Task E — split auth.md, ci.md, testing.md, graphql.md (~2h)

The same move for the next four, 47 sections into `claude-docs/auth/`, `ci/`, `testing/`, `graphql/`, each original file becoming its index. `auth.md`'s 35 KB "Admin bootstrap and the self-created user" section is moved as is; its condensing is Task F's.

Verification: as D.

### Task F — one home per fact (~3h)

The rule, added to `claude-docs/README.md` beside "a summary must stand on its own": a summary stands on its own for the **current shape**; for the **argument** it cites. Each fact has one home, and every other mention is a clause plus a citation:

| Fact                                | Home                                    | Today's other copies, to become citations                                                                                                                       |
| ----------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A binding rule                      | `CLAUDE.md` / its `.claude/rules/` file | subsystem docs, TASKS entries                                                                                                                                   |
| A subsystem's current shape         | `claude-docs/<subsystem>/`              | `DESIGN.md` §5 restated in `db/identity-model.md` and others (460 runs)                                                                                         |
| The argument for a contested choice | `design-decisions/<id>.md`              | "Decided while building X" paragraphs in TASKS entries (725 runs with `mb.100-plan.md` alone), wave reasoning                                                   |
| A task's scope                      | its entry in `claude-docs/tasks/`       | the § of `DESIGN.md` it restates (597 runs)                                                                                                                     |
| Ordering reasoning                  | `claude-docs/waves/wave-NN.md`          | milestone "Sequencing" preambles (9.9 KB); the GitHub milestone description carries the id list and a link, and the task-tracking rule's "Board layout" says so |

The pass works pair by pair from the table above, largest first, and stops at the pairs under ~60 shared runs. The 8-word-shingle script that produced the map is kept as `scripts/doc-overlap.mjs` so the number can be re-read after the pass and by MW.15; it is a report, not a guard, because a threshold would penalise the legitimate mentions.

Verification: rerun `scripts/doc-overlap.mjs` and record the before/after counts in the PR body; `npx vitest run tests/guards`.

## Expected effect

| Cost                                | Before                       | After                                           |
| ----------------------------------- | ---------------------------- | ----------------------------------------------- |
| Fixed context per turn              | ≈ 30k                        | ≈ 8k (CLAUDE.md ~4.5k, memory ~1.5k, built-ins) |
| Reading a task's spec               | 40–100k (row + milestone)    | ≈ 2k (entry + wave file)                        |
| Reading one `db.md` section         | 59k whole, or grep + a guess | 2–6k, by file                                   |
| One `test:coverage` run             | 6–8k                         | < 1k                                            |
| Rules for the area being edited     | always all 16k               | 3–4k, only when relevant                        |
| Live doc words that recur elsewhere | 6,537 runs                   | measured after F                                |

## Decisions taken with the owner

- The Vercel plugin is disabled for this repo (project scope); user scope keeps it elsewhere.
- No project effort override: `xhigh` is a one-off, not the owner's usual setting.
- TASKS.md splits by milestone (confirmed), not by task.
- The doc splits (D, E) are in scope, not deferred; consolidation (F) follows them as its own pass so that moves and rewrites are reviewed separately.
- Six tasks, minted as `MB.*`, one PR each, A → F, each off `staging`.
