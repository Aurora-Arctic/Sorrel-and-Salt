---
paths:
  - 'claude-docs/TASKS.md'
  - 'claude-docs/tasks/**'
  - 'claude-docs/waves/**'
  - 'claude-docs/task-tracking.md'
  - 'scripts/task-board.mjs'
  - 'scripts/tasks-md.mjs'
  - '.claude/skills/**'
  - '.github/workflows/close-task-on-merge.yml'
---

# Task-tracking rules

The long form of `CLAUDE.md`'s GitHub task tracking section. `CLAUDE.md` wins over this file; claude-docs/task-tracking.md carries the argument, and claude-docs/design-decisions/mb.89-plan.md why the board moved from Asana. The Asana workspace stays alive and archived so the `Asana task:` permalinks in older PR bodies still resolve, and nothing is written there again.

`TASKS.md` is the reasoning behind the breakdown and the issues are what to work on; the two are expected to agree. When a task is minted as an issue, its entry goes into `claude-docs/tasks/<milestone>.md` in the same pass, or the docs silently fall behind.

## Everything goes through `gh`

Issues, milestones, sub-issues, issue types, dependencies and Projects are on GitHub's free plan, and `gh` in the devcontainer carries `--parent`, `--type`, `--add-blocked-by` and the `project` commands. `scripts/task-board.mjs` wraps the calls the skills make — `find`, `status`, `estimate`, `comment`, `list`, `reorder` — so the lookup rule and the Project's field ids live in one file rather than four skills. A skill runs it; it does not compose `gh issue` by hand.

| Object         | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Repo           | `Aurora-Arctic/Sorrel-and-Salt`                                                                               |
| Project        | Org project **Sorrel & Salt**, number `1` (`scripts/task-board.mjs` carries it as `PROJECT`)                  |
| Project fields | `Status` — single select: `Not Started` · `In Progress` · `In Review` · `Done`; `Estimate` — number, in hours |

## Board layout

- **One issue per task, titled `<Task ID> — <title>`**, exactly as its entry in `claude-docs/tasks/` heads it. The id is the first thing in the title and nothing precedes it — no marker, no emoji; status is a field, not a prefix, so a status change never rewrites a title.
- **One milestone per wave** (`Wave 07 — GraphQL`) and one per pre-wave feature grouping (`M0 · Repo bootstrap`), plus one closed `Retired — not done` milestone holding the tasks MB.31 retired, so that no issue is without a milestone. The wave number is two digits because GitHub sorts milestones alphabetically and offers no other order. The milestone description carries the task ids it contains in execution order, then the deferral reasoning; a task added to a wave is added to its milestone's description in the same pass.
- **Issue type `Bug` for `MB.*`, `Task` for everything else**, and the `hotfix` label on a task that is one. The label, not the id, decides the branch skill: `MB.*` covers ordinary bugfixes and hotfixes alike, and `start-task` still asks when nothing marks it either way.
- **Every tracked issue carries the `tracked` label**, which is the Project's auto-add filter. A public repo lets anyone open an issue, so an issue without the label is a visitor's until someone triages it onto the board.
- **The Project's manual item order is execution order** — the wave table's rows, wave by wave. `node scripts/task-board.mjs reorder` prints the moves that restore it and `--apply` makes them (claude-docs/task-tracking.md, "Order").
- **Sub-issues only for genuine parent/child** (`M7.A.*` under `M7.A`, or a task split mid-flight). Waves are milestones, not parent issues.
- **A retired task is closed as `not planned`**, its title reading `<ID> — [RETIRED] <title>`; a done task is closed as `completed`.

## Status

| Status        | Set it when                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Not Started` | The Project's **Item added to project** workflow sets it, seconds after `gh issue create --label tracked` and the auto-add place the issue. Never set by hand: `find` printing `status: null` means the auto-add has not run yet (MB.102).              |
| `In Progress` | The feature branch for the task exists and work has started — not when the task is merely read or planned.                                                                                                                                              |
| `In Review`   | The PR is open. Set it in the same turn the PR is created, alongside the comment carrying the PR link.                                                                                                                                                  |
| `Done`        | The PR is **merged** — by mechanism, never by hand. `close-task-on-merge.yml` closes the issue a PR body names in `Closes #N` when that PR merges into `staging`; GitHub does it for a PR into `main`; the Project then sets `Done` on the closed item. |

`node scripts/task-board.mjs status <ID> "<Status>"` sets it, in the same turn as the event: a status left stale says work is happening that is not. Status moves forward only and never skips a state — a task that goes `Not Started` → `Done` hides the review step. A closed issue outranks its field. A PR closed without merging sends its task back to `In Progress`. The Project's workflows own the ends and the script owns the middle, since GitHub links a `Closes #N` only on a PR into the default branch: never `gh project item-add` a task, and never set `Not Started` (claude-docs/task-tracking.md, "Status").

## Finding a task by its id

`node scripts/task-board.mjs find M2.6` reads the tracked issues through the REST issues endpoint (never `gh issue list`, whose GraphQL query trips the secondary rate limit) and filters on `title.startsWith('M2.6 — ')`. The space-padded dash is the exact-match rule: thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`), and GitHub's search tokenises on punctuation. Zero matches, or more than one: stop and say so, never guess.

## PR bodies and comments

- **A PR body opens with a single `Closes #N` line**, then a blank line — or `Refs #N` for a PR that does not finish the task. That line is what the Action reads on merge, and on a PR into `staging` it is the only link from the PR to the task.
- **`node scripts/task-board.mjs comment <ID> "<text>"`, names never values**: a comment may name an env var, a file or a provider, and never carries a value, a token, a connection string, an address or a dashboard URL — the repo is public and a comment is indexed before anyone reads it. Comment as work proceeds; the status field summarises the comments, not replaces them. A comment carried over from Asana opens with `[YYYY-MM-DD HH:MM UTC]`, its true date.

## Minting a task

Re-check the next free id right before minting — another session may have taken it — then:

```sh
gh issue create --title "MB.90 — <title>" --type Bug --label tracked --milestone "Wave 07 — GraphQL" --body-file <notes>
node scripts/task-board.mjs estimate MB.90 3
node scripts/task-board.mjs reorder --apply
```

The notes are the entry's text in `claude-docs/tasks/<milestone>.md`. The entry, the wave's row in `TASKS.md`'s execution-order table, its wave file in `claude-docs/waves/` where the reasoning changes, `tasks/mb.md`'s summary table and the milestone's description are edited in the same pass. The auto-add appends the new item at the bottom of the Project, and `reorder --apply` moves it to the row's place — so the row is edited before it runs (claude-docs/task-tracking.md, "Minting a task").
