---
name: create-feature
description: Use when the user asks to start a new feature branch (e.g. "create a feature branch", "start a new feature", "/create-feature"). Asks for the feature's name, then branches off the latest staging as `feature/<slug>`.
---

# create-feature

Start a new Gitflow feature branch off the latest `staging`, asking what to call it first.

## Steps

1. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

2. **Ask what the feature should be called.**
   - Send a `PushNotification` (status `proactive`) saying input is needed for the new feature branch name, then ask in plain chat what to call it — a free-text question, no multiple-choice options. Wait for the reply before continuing.

3. **Slugify the name.**
   - Lowercase it, turn spaces/underscores into hyphens, strip anything outside `[a-z0-9-]`, and collapse repeated hyphens. This becomes `<slug>` in `feature/<slug>`.

4. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/feature/<slug>` and `git ls-remote --exit-code --heads origin feature/<slug>`.
   - If either finds an existing branch, tell the user and ask whether to check it out instead or pick a different name.

5. **Fetch the latest `staging`.**
   - `git fetch origin staging`.

6. **Create and switch to the new branch.**
   - `git checkout -b feature/<slug> origin/staging` — branches off the fetched remote ref directly, not a possibly-stale local `staging`.

7. **Report the result.**
   - Confirm the new branch name and that it's based on current `origin/staging`. Mention that `/create-pr` will propose `staging` as the target when it's ready for review.

## Notes

- Step 2 asks in plain chat rather than via `AskUserQuestion` — `AskUserQuestion` requires ≥2 explicit options for the name field, which is exactly the "other options" the user has said not to offer. `PushNotification` alone gets the same attention-getting side effect without forcing a choice.
- Never pushes the new branch — `/create-pr` handles pushing once there's work to send.
- Never force-pushes or deletes anything; this skill only ever creates a branch.
- If `git fetch origin staging` fails (no network, no remote), stop and report the error rather than branching off a possibly-stale local `staging`.
