---
name: project-progress
description: Use when the user asks how far along the project is (e.g. "project progress", "task progress", "how many hours are left", "how much is done", "/project-progress"). Prints tasks and hours completed, remaining and total, from local data — TASKS.md estimates and git merge history — with no Asana calls unless the user asks to verify against the board.
---

# project-progress

Show a summary of completed, remaining and total **tasks** and **hours**, sized for a quick read. It runs on local data. The Asana board is the source of truth for status, but reading it costs one call per wave card (about 25), so the default mode leaves the board alone.

| Figure | Local source                                                                                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hours  | The `· Nh` on each `**ID — title**` heading in `claude-docs/TASKS.md`. A `**RETIRED …**` heading is excluded from every figure.                                                                                                           |
| Done   | Merged into `origin/staging`, taken from the merge commit's `feature/<id>-…`/`hotfix/<id>-…` branch name, an id that opens a subject (`M2.4/M2.5/M0.27 — …`), or a trailing `(MB.13)`, plus `tally.mjs`'s list of tasks done outside git. |
| Total  | Every non-retired id in TASKS.md, plus any merged id that has no heading, counted at 0h.                                                                                                                                                  |

Both sources are read at the same ref (`git show origin/staging:claude-docs/TASKS.md`), so an unmerged edit to TASKS.md on the current branch does not skew the figures.

## Steps

1. **Refresh the ref.** Run `git fetch -q origin staging`. If it fails (offline, for example), continue and say the figures are as of the last fetch.

2. **Tally.** Run `node .claude/skills/project-progress/tally.mjs` from the repo root. Pass `--ref <ref>` only if the user names another branch, such as `origin/main` for what has shipped to production.

3. **Show the output verbatim.** It is already markdown: a Completed / Remaining / Total table, two progress bars, and a line counting open branches and retired tasks. Add nothing unless there is something to flag. Do not re-derive or round the numbers.

## Verify mode

Run this only when the user asks to check against the board ("verify", "check with Asana"). It is the one path that calls the API.

- Fetch every leaf task: `asana_get_tasks` on project `1218814916390986` (`opt_fields=name,completed,num_subtasks`), then `asana_get_task` with `opt_fields=subtasks.name,subtasks.completed` on each card whose `num_subtasks` is above 0. Match ids exactly as [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section describes. Older names use `-` where newer ones use `—`, and cards named `[RETIRED]` are retired.
- Compare the board's completed set with the local one and report each disagreement.
- **Ticked on the board, silent in git:** the work happened outside the repo (a dashboard or console change). Offer to add the id to the done-outside-git list in `tally.mjs`.
- **Merged in git, open on the board:** the board is stale. Say so, but do not tick it here. Status changes belong to `create-pr` and the merge.

## Notes

- Everything is read-only: the skill changes no files, branches or Asana tasks. The one exception is an edit to `tally.mjs` that the user approves in verify mode.
- The open-branch count is any `feature/*`/`hotfix/*` branch, local or pushed, whose id has not merged — even one with no commits yet. It measures work under way, not open PRs.
- A task done in a PR whose branch and subject both omit its id will read as remaining. Verify mode catches it, and the fix is the done-outside-git list, not a looser regex. An id mentioned mid-sentence is a reference, not a completion.
