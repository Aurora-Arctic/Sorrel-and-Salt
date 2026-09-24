---
name: create-feature
description: Use when the user asks to start a new feature branch (e.g. "create a feature branch", "start a new feature", "/create-feature"). Asks for the feature's name, then branches off the latest staging as `feature/<slug>`.
---

# create-feature

Start a new Gitflow feature branch off the latest `staging`, asking what to call it first.

## Steps

1. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

2. **Ask what the feature should be called, and which Asana task it's for.**
   - Send a `PushNotification` (status `proactive`) saying input is needed for the new feature branch, then ask in plain chat — one free-text question, no multiple-choice options — for two things: what to call the feature, and its Asana `Task ID` (the `M0.1`-style identifier from the **Sorrel & Salt** board; see [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section). Wait for the reply before continuing.
   - If the user doesn't have a task ID (work not tracked yet, or they don't know it), accept that and carry on — the branch is still created and step 7 is skipped.

3. **Slugify the name.**
   - Lowercase it, turn spaces/underscores into hyphens, strip anything outside `[a-z0-9-]`, and collapse repeated hyphens. This becomes `<slug>` in `feature/<slug>`.

4. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/feature/<slug>` and `git ls-remote --exit-code --heads origin feature/<slug>`.
   - If either finds an existing branch, tell the user and ask whether to check it out instead or pick a different name.

5. **Fetch the latest `staging`.**
   - `git fetch origin staging`.

6. **Create and switch to the new branch.**
   - `git checkout --no-track -b feature/<slug> origin/staging` — branches off the fetched remote ref directly, not a possibly-stale local `staging`. `--no-track` matters: without it the new branch’s upstream becomes `origin/staging`, and a later bare `git push` then targets the protected base branch instead of this one (MB.13).

7. **Mark the Asana task `In Progress`.**
   - Skip this step entirely if step 2 produced no task ID.
   - The feature branch now exists and work is starting — exactly the `Not Started → In Progress` trigger in [`CLAUDE.md`](../../../CLAUDE.md)'s Asana section. Do it now, in this same turn.
   - Find the task by the two-call lookup in that section: `asana_get_tasks` with `project` = `1218814916390986` returns the wave cards and the top-level `MB.*` tasks; if the id isn't among them, `asana_get_task` on the wave card whose `notes` name it, with `opt_fields=subtasks.name,subtasks.gid,subtasks.completed`, and match the subtask's id segment exactly — strip the marker, then compare the text up to the `—` that follows it, because thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`). There is no text search — `asana_search_tasks` is premium and returns `payment_required`.
   - If exactly one task matches: add a short progress note with `asana_create_task_story` — e.g. "Branch `feature/<slug>` created off `origin/staging`; work started." — and, **only if its name carries no status marker** (which is what `Not Started` looks like), `asana_update_task` with `name` set to the existing name prefixed with `▶ `. Rewrite only the marker, never the id or title. Status moves forward only: if the name already starts with `▶ ` or `◔ `, or the task is ticked complete, leave it.
   - If zero or more than one task matches, don't guess — tell the user you couldn't uniquely identify the task and that they'll need to move it to `In Progress` themselves.

8. **Report the result.**
   - Confirm the new branch name and that it's based on current `origin/staging`. If step 7 ran, say the Asana task is now `In Progress`. Mention that `/create-pr` will propose `staging` as the target when it's ready for review.

## Notes

- Step 2 asks in plain chat rather than via `AskUserQuestion` — `AskUserQuestion` requires ≥2 explicit options for the name field, which is exactly the "other options" the user has said not to offer. `PushNotification` alone gets the same attention-getting side effect without forcing a choice.
- The project GID, the status markers and the lookup used in step 7 are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section — that section is the source of truth if they ever drift. The workspace is on Asana's free plan, so status lives in the task **name** and there are no custom fields to set.
- Never pushes the new branch — `/create-pr` handles pushing once there's work to send.
- Never force-pushes or deletes anything; this skill only ever creates a branch.
- If `git fetch origin staging` fails (no network, no remote), stop and report the error rather than branching off a possibly-stale local `staging`.
