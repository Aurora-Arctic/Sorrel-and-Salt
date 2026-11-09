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

The long form of `CLAUDE.md`'s GitHub task tracking section. claude-docs/task-tracking.md is the board's shape and the mechanics these rules rest on, and claude-docs/design-decisions/process.md, "Task tracking on GitHub Issues and Projects" why the board moved from Asana. Nothing is written to Asana again: the workspace stays, archived, only so older PR bodies' permalinks resolve.

The issues and `TASKS.md` are expected to agree. A task minted as an issue gets its entry in `claude-docs/tasks/<milestone>.md` in the same pass, or the docs silently fall behind; and **an entry edited afterwards is synced to its issue in the same pass**, `node scripts/task-board.mjs sync <ID> …`, which brings the title, body and `Estimate` to the entry (claude-docs/task-tracking.md, "Sync").

A closed task's entry is its heading line only; its body is in `claude-docs/archive/tasks-closed-waves.tar.gz`. Never run `task-board.mjs sync` on a closed id: it would blank the issue body.

## Everything goes through `gh`

Issues, milestones, sub-issues, issue types, dependencies and Projects are on GitHub's free plan, and `gh` in the devcontainer carries `--parent`, `--type`, `--add-blocked-by` and the `project` commands. A skill's board calls are `scripts/task-board.mjs`'s commands (claude-docs/task-tracking.md, "scripts/task-board.mjs"); the repo, the Project and its `Status` and `Estimate` fields are tabled under "The board" there.

## Board layout

The objects (repo, Project, fields, milestones, issue types, labels, sub-issues) are tabled in claude-docs/task-tracking.md, "The board". The rules for keeping them:

- **One issue per task, titled `<Task ID> — <title>`**, exactly as its entry in `claude-docs/tasks/` heads it. The id is the first thing in the title and nothing precedes it: no marker, no emoji. Status is a field, not a prefix, so a status change never rewrites a title.
- **A wave's milestone description is its id list, then a link.** The first line holds the wave's task ids in execution order; a blank line follows; then the link to its wave file on `staging`, `https://github.com/Aurora-Arctic/Sorrel-and-Salt/blob/staging/claude-docs/waves/wave-<NN>.md`. The ordering reasoning lives in that file alone. A task added to a wave is added to the first line in the same pass, and `reorder` reports a first line that differs from the wave's row. The wave number is two digits because GitHub sorts milestones alphabetically.
- **Every issue has a milestone**; a retired task sits in the closed `Retired — not done` one.
- **A bug is a failure that reached a PR, staging or production; new work, a refactor, a doc or a sweep is a `Task` whatever its id.** The id prefix decides nothing: an `MB.*` id is new work as often as a fix. The `hotfix` label marks a bug that ships straight to `main`, and the label, not the type, decides the branch skill; `start-task` asks when the issue is ambiguous.
- **Every tracked issue carries the `tracked` label**, the Project's auto-add filter. A public repo lets anyone open an issue, so an issue without the label is a visitor's until someone triages it onto the board.
- **The board is kept in execution order**, `TASKS.md`'s wave table read wave by wave: `node scripts/task-board.mjs reorder` prints the moves that restore it and `--apply` makes them; a task on a milestone with no wave row is placed with `move <ID> --after <ID>` or `move <ID> --last`, and moved to another milestone with `milestone <ID> "<title>"` (claude-docs/task-tracking.md, "Order").
- **A retired task is closed as `not planned`**, its title reading `<ID> — [RETIRED] <title>`; a done task is closed as `completed`. `node scripts/task-board.mjs retire <ID>` closes it and moves it to that milestone; the `[RETIRED]` heading is a hand edit, synced before `retire` runs.

## Status

| Status        | Set it when                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Not Started` | Never set by hand: the Project's **Item added to project** workflow sets it once the auto-add has placed the issue, seconds after `gh issue create --label tracked`. `find` printing `status: null` means the auto-add has not run yet. |
| `In Progress` | The feature branch for the task exists and work has started — not when the task is merely read or planned.                                                                                                                              |
| `In Review`   | The PR is open. Set it in the same turn the PR is created, alongside the comment carrying the PR link.                                                                                                                                  |
| `Done`        | The PR is **merged** — by mechanism, never by hand, and a green CI run is not a merge. The issue's closing on merge sets it (claude-docs/task-tracking.md, "Status").                                                                   |

`node scripts/task-board.mjs status <ID> "<Status>"` sets it: a status left stale says work is happening that is not. It never skips a state — a task that goes `Not Started` → `Done` hides the review step — and a closed issue outranks its field. A PR closed without merging sends its task back to `In Progress` by hand, since the script refuses a step back — not to `Done`, not to `Not Started`. The Project's own workflows set the first and last states, so never `gh project item-add` a task and never set `Not Started` (claude-docs/task-tracking.md, "Status").

## Finding a task by its id

`node scripts/task-board.mjs find M2.6` is the lookup: it keeps the tracked issue whose title starts with `M2.6 — `, and the space-padded dash is what makes the match exact (claude-docs/task-tracking.md, "The title rule"). Never look a task up with `gh issue list`, whose GraphQL query trips the secondary rate limit, or a `--search` query, which tokenises on punctuation. Zero matches, or more than one: stop and say so, never guess.

## PR bodies and comments

- **A PR body opens with a single `Closes #N` line**, then a blank line — or `Refs #N` for a PR that does not finish the task. That line is what the Action reads on merge, and on a PR into `staging` it is the only link from the PR to the task.
- **`node scripts/task-board.mjs comment <ID> "<text>"` posts, under `CLAUDE.md`'s names-never-values line**, because the repo is public and a comment is indexed before anyone reads it; the script refuses text that looks like a value (claude-docs/task-tracking.md, "Comments"). Comment as work proceeds; the status field summarises the comments, not replaces them.

## Minting a task

Re-check the next free id right before minting — another session may have taken it — then:

```sh
gh issue create --title "<ID> — <title>" --type Task --label tracked --milestone "Wave 07 — GraphQL" --body-file <notes>
node scripts/task-board.mjs estimate <ID> 3
node scripts/task-board.mjs reorder --apply
```

The notes are the entry's text in `claude-docs/tasks/<milestone>.md`. The entry, the wave's row in `TASKS.md`'s execution-order table, its wave file in `claude-docs/waves/` where the reasoning changes, `tasks/v1/mb.md`'s summary table and the first line of the milestone's description are edited in the same pass, the row before `reorder --apply` runs, since that places the new item by the row. An issue minted into a closed milestone takes it after creation (claude-docs/task-tracking.md, "Minting a task").
