---
name: create-feature
description: Use when the user asks to start a new feature branch (e.g. "create a feature branch", "start a new feature", "/create-feature"). Asks for the feature's name, then branches off the latest staging as `feature/<slug>`.
---

# create-feature

Start a new Gitflow feature branch off the latest `staging`, asking what to call it first.

## Steps

1. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

2. **Ask what the feature should be called, and which task it's for.**
   - Send a `PushNotification` (status `proactive`) saying input is needed for the new feature branch, then ask in plain chat — one free-text question, no multiple-choice options — for two things: what to call the feature, and its `Task ID` (the `M0.1`-style identifier that opens the issue's title on the **Sorrel & Salt** board; see [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section). Wait for the reply before continuing.
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

7. **Mark the task `In Progress`.**
   - Skip this step entirely if step 2 produced no task ID.
   - The feature branch now exists and work is starting — exactly the `Not Started → In Progress` trigger in [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section. Do it now, in this same turn.
   - `node scripts/task-board.mjs find <ID>` — prints one JSON object (`number`, `title`, `state`, `stateReason`, `url`, `milestone`, `labels`, `status`) on exactly one match and exits non-zero otherwise. It matches the title on `<ID> — ` exactly, because thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`).
   - If exactly one issue matches: `node scripts/task-board.mjs comment <ID> "Branch feature/<slug> created off origin/staging; work started."`, then — **only if its `status` is `Not Started`** — `node scripts/task-board.mjs status <ID> "In Progress"`. Status moves forward only: the script refuses a backward step, so an issue already `In Progress`, `In Review` or closed keeps what it has.
   - If zero or more than one issue matches, don't guess — tell the user you couldn't uniquely identify the task and that they'll need to move it to `In Progress` themselves.

8. **Report the result.**
   - Confirm the new branch name and that it's based on current `origin/staging`. If step 7 ran, say the task is now `In Progress`. Mention that `/create-pr` will propose `staging` as the target when it's ready for review.

## Notes

- Step 2 asks in plain chat rather than via `AskUserQuestion` — `AskUserQuestion` requires ≥2 explicit options for the name field, which is exactly the "other options" the user has said not to offer. `PushNotification` alone gets the same attention-getting side effect without forcing a choice.
- The lookup and the status values used in step 7 are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section — that section is the source of truth if they ever drift.
- Never pushes the new branch — `/create-pr` handles pushing once there's work to send.
- Never force-pushes or deletes anything; this skill only ever creates a branch.
- If `git fetch origin staging` fails (no network, no remote), stop and report the error rather than branching off a possibly-stale local `staging`.
