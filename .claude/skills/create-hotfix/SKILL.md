---
name: create-hotfix
description: Use when the user asks to start a new hotfix branch (e.g. "create a hotfix branch", "start a hotfix", "/create-hotfix"). Asks for the hotfix's name, then branches off the latest main as `hotfix/<slug>`.
---

# create-hotfix

Start a new Gitflow hotfix branch off the latest `main`, asking what to call it first.

## Steps

1. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

2. **Ask what the hotfix should be called, and which task it's for.**
   - Send a `PushNotification` (status `proactive`) saying input is needed for the new hotfix branch, then ask in plain chat — one free-text question, no multiple-choice options — for two things: what to call the hotfix, and its `Task ID` (the `M0.1`-style identifier that opens the issue's title on the **Sorrel & Salt** board; see [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section). Wait for the reply before continuing.
   - If the user doesn't have a task ID (work not tracked yet, or they don't know it), accept that and carry on — the branch is still created and step 7 is skipped.

3. **Slugify the name.**
   - Lowercase it, turn spaces/underscores into hyphens, strip anything outside `[a-z0-9-]`, and collapse repeated hyphens. This becomes `<slug>` in `hotfix/<slug>`.

4. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/hotfix/<slug>` and `git ls-remote --exit-code --heads origin hotfix/<slug>`.
   - If either finds an existing branch, tell the user and ask whether to check it out instead or pick a different name.

5. **Fetch the latest `main`.**
   - `git fetch origin main`.

6. **Create and switch to the new branch.**
   - `git checkout --no-track -b hotfix/<slug> origin/main` — branches off the fetched remote ref directly, not a possibly-stale local `main`. `--no-track` matters: without it the new branch’s upstream becomes `origin/main`, and a later bare `git push` then targets production instead of this branch (MB.13).

7. **Mark the task `In Progress`.**
   - Skip this step entirely if step 2 produced no task ID.
   - The hotfix branch now exists and work is starting — exactly the `Not Started → In Progress` trigger in [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section. Do it now, in this same turn.
   - `node scripts/task-board.mjs find <ID>` — prints one JSON object (`number`, `title`, `state`, `stateReason`, `url`, `milestone`, `labels`, `status`) on exactly one match and exits non-zero otherwise. It matches the title on `<ID> — ` exactly, because thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`).
   - If exactly one issue matches: `node scripts/task-board.mjs comment <ID> "Branch hotfix/<slug> created off origin/main; work started."`, then — **only if its `status` is `Not Started`** — `node scripts/task-board.mjs status <ID> "In Progress"`. Status moves forward only: the script refuses a backward step, so an issue already `In Progress`, `In Review` or closed keeps what it has.
   - If zero or more than one issue matches, don't guess — tell the user you couldn't uniquely identify the task and that they'll need to move it to `In Progress` themselves.

8. **Report the result.**
   - Confirm the new branch name and that it's based on current `origin/main`. If step 7 ran, say the task is now `In Progress`. Note that `/create-pr` will always open PRs into both `main` and `staging` for it, and — if a `release/*` branch is in flight — will ask whether to also back-port the fix into it as a third PR.

## Notes

- Never pushes the new branch — `/create-pr` handles pushing once there's work to send.
- Never force-pushes or deletes anything; this skill only ever creates a branch.
- If `git fetch origin main` fails (no network, no remote), stop and report the error rather than branching off a possibly-stale local `main`.
- The lookup and the status values used in step 7 are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section — that section is the source of truth if they ever drift.
