---
name: create-hotfix
description: Use when the user asks to start a new hotfix branch (e.g. "create a hotfix branch", "start a hotfix", "/create-hotfix"). Asks for the hotfix's name, then branches off the latest main as `hotfix/<slug>`.
---

# create-hotfix

Start a new Gitflow hotfix branch off the latest `main`, asking what to call it first.

## Steps

1. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

2. **Ask what the hotfix should be called.**
   - Send a `PushNotification` (status `proactive`) saying input is needed for the new hotfix branch name, then ask in plain chat what to call it — a free-text question, no multiple-choice options. Wait for the reply before continuing.

3. **Slugify the name.**
   - Lowercase it, turn spaces/underscores into hyphens, strip anything outside `[a-z0-9-]`, and collapse repeated hyphens. This becomes `<slug>` in `hotfix/<slug>`.

4. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/hotfix/<slug>` and `git ls-remote --exit-code --heads origin hotfix/<slug>`.
   - If either finds an existing branch, tell the user and ask whether to check it out instead or pick a different name.

5. **Fetch the latest `main`.**
   - `git fetch origin main`.

6. **Create and switch to the new branch.**
   - `git checkout -b hotfix/<slug> origin/main` — branches off the fetched remote ref directly, not a possibly-stale local `main`.

7. **Report the result.**
   - Confirm the new branch name and that it's based on current `origin/main`. Note that `/create-pr` will always open PRs into both `main` and `staging` for it, and — if a `release/*` branch is in flight — will ask whether to also back-port the fix into it as a third PR.

## Notes

- Never pushes the new branch — `/create-pr` handles pushing once there's work to send.
- Never force-pushes or deletes anything; this skill only ever creates a branch.
- If `git fetch origin main` fails (no network, no remote), stop and report the error rather than branching off a possibly-stale local `main`.
