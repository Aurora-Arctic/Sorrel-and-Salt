---
name: project-progress
model: haiku
effort: low
allowed-tools: Bash(git fetch -q origin staging) Bash(node .claude/skills/project-progress/tally.mjs *) Bash(node scripts/task-board.mjs list)
description: Use when the user asks how far along the project is (e.g. "project progress", "task progress", "how many hours are left", "how much is done", "/project-progress"). Prints tasks and hours completed, remaining and total, from local data — the breakdown's task-heading estimates and git merge history — with no board calls unless the user asks to verify against the GitHub issues.
---

# project-progress

Show completed, remaining and total **tasks** and **hours** for each Project in `scripts/task-projects.mjs`, from local data, with no board call; verify mode reads the board in one.

| Figure | Local source                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hours  | The `· Nh` on each `**ID — title**` heading in the breakdown — `claude-docs/TASKS.md` and `claude-docs/tasks/`, the files `scripts/tasks-md.mjs` names. A task counts toward the Project whose `claude-docs/tasks/<slug>/` holds its entry, or, for an id with no entry there, the Project its prefix letter names. A `**RETIRED …**` heading is excluded from every figure.                                                 |
| Done   | Merged into `origin/staging`, taken from the merge commit's `feature/<id>-…`/`hotfix/<id>-…` branch name, an id that opens a subject or the first line of the commit's body (`M2.4/M2.5/M0.27 — …`; GitHub writes a PR's title there), or a single trailing `(MB.13)` whose id has a heading in the breakdown (a list of ids, or a code that is no task, does not count), plus `tally.mjs`'s list of tasks done outside git. |
| Total  | Every non-retired id in the breakdown, plus any merged id that has no heading, counted at 0h.                                                                                                                                                                                                                                                                                                                                |

Both sources are read at the same ref — `git show origin/staging:<file>` for each breakdown file the ref holds, in `orderTaskFiles`'s order, so a ref from before a split still tallies — and an unmerged edit to the breakdown on the current branch does not skew the figures.

## Steps

1. **Refresh the ref.** Run `git fetch -q origin staging`. If it fails (offline, for example), continue and say the figures are as of the last fetch.

2. **Tally.** Run `node .claude/skills/project-progress/tally.mjs` from the repo root. With no option it prints one report per Project; `--project <number>` or `--task <ID>` prints one. Pass `--ref <ref>` only if the user names another branch, such as `origin/main` for what has shipped to production.

3. **Show the output verbatim.** It is already markdown: per Project, a Completed / Remaining / Total table, two progress bars, and a line counting open branches and retired tasks. Add nothing unless there is something to flag. Do not re-derive or round the numbers.

## Verify mode

Run this only when the user asks to check against the board ("verify", "check the issues"). It is the one path that reads the tracker.

- `node scripts/task-board.mjs list` — one call, printing a JSON array of every tracked issue (`number`, `title`, `state`, `stateReason`, `milestone`, `url`). The id is what precedes the space-padded dash in the title (`<ID> — `), matched exactly as [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section describes. Completed is `state == "CLOSED"` with `stateReason == "COMPLETED"`; retired is `stateReason == "NOT_PLANNED"` or a `[RETIRED]` title.
- Compare the board's completed set with the local one and report each disagreement.
- **Done in git, open on the board, and the board is right:** a commit named the task in a completion form without finishing it (an edit to its entry). Offer to add that commit's full hash to `NOT_COMPLETIONS` in `tally.mjs`.
- **Closed on the board, silent in git:** the work happened outside the repo (a dashboard or console change). Offer to add the id to the done-outside-git list in `tally.mjs`.
- **Merged in git, open on the board:** first check that the commit finished the task (the case above). If it did, the board is stale. Say so, but do not close it here. Status changes belong to `create-pr` and the merge.

## Notes

- Read-only, except an edit to `tally.mjs` the user approves in verify mode. `create-pr` ends each PR body with `tally.mjs`'s output; that write is `create-pr`'s.
- The open-branch count is any `feature/*` or `hotfix/*` branch, local or pushed, whose id has not merged, even with no commits yet. A retired id is excluded.
- A task merged in a PR whose branch, subject and title all omit its id reads as remaining. Verify mode catches it; the fix is the done-outside-git list, not a looser regex. An id mentioned mid-sentence is a reference, not a completion.
