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

The long form of `CLAUDE.md`'s GitHub task tracking section. claude-docs/task-tracking.md is the board's shape and the mechanics these rules rest on, and claude-docs/design-decisions/mb.89-plan.md why the board moved from Asana. Nothing is written to Asana again: the workspace stays, archived, only so older PR bodies' permalinks resolve (claude-docs/task-tracking.md, "Migration").

The issues and `TASKS.md` are expected to agree. A task minted as an issue gets its entry in `claude-docs/tasks/<milestone>.md` in the same pass, or the docs silently fall behind; and **an entry edited afterwards is synced to its issue in the same pass**, `node scripts/task-board.mjs sync <ID> …`, which brings the title, body and `Estimate` to the entry (claude-docs/task-tracking.md, "Sync").

## Everything goes through `gh`

Issues, milestones, sub-issues, issue types, dependencies and Projects are on GitHub's free plan, and `gh` in the devcontainer carries `--parent`, `--type`, `--add-blocked-by` and the `project` commands. A skill's board calls are `scripts/task-board.mjs`'s commands (claude-docs/task-tracking.md, "scripts/task-board.mjs"); the repo, the Project and its `Status` and `Estimate` fields are tabled under "The board" there.

## Board layout

- **One issue per task, titled `<Task ID> — <title>`**, exactly as its entry in `claude-docs/tasks/` heads it. The id is the first thing in the title and nothing precedes it — no marker, no emoji; status is a field, not a prefix, so a status change never rewrites a title.
- **One milestone per wave** (`Wave 07 — GraphQL`) and one per pre-wave feature grouping (`M0 · Repo bootstrap`), plus one closed `Retired — not done` milestone holding the tasks MB.31 retired, so that no issue is without a milestone. The wave number is two digits because GitHub sorts milestones alphabetically and offers no other order.
- **A wave's milestone description is its id list, then a link.** The first line holds the wave's task ids in execution order; a blank line follows; then the link to its wave file on `staging`, `https://github.com/Aurora-Arctic/Sorrel-and-Salt/blob/staging/claude-docs/waves/wave-<NN>.md`. The ordering reasoning lives in that file alone, never in the description. A task added to a wave is added to the first line in the same pass, and `reorder` reports a first line that differs from the wave's row.
- **Issue type `Bug` for `MB.*`, `Task` for everything else**, and the `hotfix` label on a task that is one. The label, not the id, decides the branch skill: an `MB.*` id is an ordinary bugfix as often as a hotfix, and `start-task` asks when the issue is ambiguous.
- **Every tracked issue carries the `tracked` label**, which is the Project's auto-add filter. A public repo lets anyone open an issue, so an issue without the label is a visitor's until someone triages it onto the board.
- **The board is kept in execution order**, `TASKS.md`'s wave table read wave by wave: `node scripts/task-board.mjs reorder` prints the moves that restore it and `--apply` makes them (claude-docs/task-tracking.md, "Order").
- **Sub-issues only for genuine parent/child** (`M7.A.*` under `M7.A`, or a task split mid-flight). Waves are milestones, not parent issues.
- **A retired task is closed as `not planned`**, its title reading `<ID> — [RETIRED] <title>`; a done task is closed as `completed`.

## Status

| Status        | Set it when                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Not Started` | Never set by hand: the Project's **Item added to project** workflow sets it once the auto-add has placed the issue, seconds after `gh issue create --label tracked`. `find` printing `status: null` means the auto-add has not run yet (MB.102). |
| `In Progress` | The feature branch for the task exists and work has started — not when the task is merely read or planned.                                                                                                                                       |
| `In Review`   | The PR is open. Set it in the same turn the PR is created, alongside the comment carrying the PR link.                                                                                                                                           |
| `Done`        | The PR is **merged** — by mechanism, never by hand, and a green CI run is not a merge. The issue's closing on merge sets it (claude-docs/task-tracking.md, "Status").                                                                            |

`node scripts/task-board.mjs status <ID> "<Status>"` sets it: a status left stale says work is happening that is not. It never skips a state — a task that goes `Not Started` → `Done` hides the review step — and a closed issue outranks its field. A PR closed without merging sends its task back to `In Progress` by hand, since the script refuses a step back — not to `Done`, not to `Not Started`. The Project's own workflows set the first and last states, so never `gh project item-add` a task and never set `Not Started` (claude-docs/task-tracking.md, "Status").

## Finding a task by its id

`node scripts/task-board.mjs find M2.6` is the lookup: it keeps the tracked issue whose title starts with `M2.6 — `, and the space-padded dash is what makes the match exact (claude-docs/task-tracking.md, "The title rule"). Never look a task up with `gh issue list`, whose GraphQL query trips the secondary rate limit, or a `--search` query, which tokenises on punctuation. Zero matches, or more than one: stop and say so, never guess.

## PR bodies and comments

- **A PR body opens with a single `Closes #N` line**, then a blank line — or `Refs #N` for a PR that does not finish the task. That line is what the Action reads on merge, and on a PR into `staging` it is the only link from the PR to the task.
- **`node scripts/task-board.mjs comment <ID> "<text>"` posts, under `CLAUDE.md`'s names-never-values line**, because the repo is public and a comment is indexed before anyone reads it; the script refuses text that looks like a value (claude-docs/task-tracking.md, "Comments"). Comment as work proceeds; the status field summarises the comments, not replaces them.

## Minting a task

Re-check the next free id right before minting — another session may have taken it — then:

```sh
gh issue create --title "MB.90 — <title>" --type Bug --label tracked --milestone "Wave 07 — GraphQL" --body-file <notes>
node scripts/task-board.mjs estimate MB.90 3
node scripts/task-board.mjs reorder --apply
```

The notes are the entry's text in `claude-docs/tasks/<milestone>.md`. The entry, the wave's row in `TASKS.md`'s execution-order table, its wave file in `claude-docs/waves/` where the reasoning changes, `tasks/mb.md`'s summary table and the first line of the milestone's description are edited in the same pass, the row before `reorder --apply` runs, since that places the new item by the row. An issue minted into a closed milestone takes it after creation (claude-docs/task-tracking.md, "Minting a task").
