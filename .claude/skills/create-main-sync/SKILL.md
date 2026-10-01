---
name: create-main-sync
description: Use when the user asks to sync main into staging, bring main-only changes (e.g. a hotfix) back down into staging, or catch staging up with main (e.g. "sync main into staging", "bring the hotfix back to staging", "/create-main-sync"). Branches off the latest `main` as `main-sync/<timestamp>`, then opens a PR into `staging` summarizing what's included.
---

# create-main-sync

Bring commits that landed on `main` but not yet on `staging` (most commonly a `hotfix/*` merged straight into `main`) back down into `staging`: branch off the latest `main` as `main-sync/<timestamp>`, push it, and open a PR into `staging`. The steps it shares with `/create-release` are [`../create-release/reference-shared.md`](../create-release/reference-shared.md)'s, with `<from>` `main` and `<into>` `staging`.

## Steps

1. **Verify GitHub authentication.**
   - Follow [`/create-pr`](../create-pr/SKILL.md) step 1 as written, then go on to step 2 here.

2. **Check for a clean working tree.**
   - Follow [`create-feature/reference-branch.md`](../create-feature/reference-branch.md) step 1 as written.

3. **Fetch the latest `main` and `staging`.**
   - `git fetch origin main staging`.

4. **Check whether there's anything to sync.**
   - `git log origin/staging..origin/main --oneline` — if this is empty, `staging` already contains everything on `main`. Tell the user and stop; don't create a branch or PR for nothing.

5. **Compute the branch name.**
   - `main-sync/<timestamp>`, where `<timestamp>` is the current UTC time formatted `YYYY-MM-DD-HH-MM-SS` (`date -u +%Y-%m-%d-%H-%M-%S`) — UTC specifically so the name doesn't depend on the contributor's local timezone.

6. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/main-sync/<timestamp>` and `git ls-remote --exit-code --heads origin main-sync/<timestamp>`. A collision is only realistically possible from running this twice within the same second — if it happens, just recompute the timestamp and retry.

7. **Create the branch off the latest `main`.**
   - `git checkout --no-track -b main-sync/<timestamp> origin/main` — `--no-track` so the branch’s upstream is its own remote branch once the next step pushes it, never `origin/main` (MB.13).

8. **Push the branch.**
   - `git push -u origin main-sync/<timestamp>`. The sync PR is the point of this skill, so it pushes directly (the shared notes say why).

9. **Gather context for the PR summary.**
   - `git diff origin/staging...HEAD` and `git log origin/staging..HEAD` (triple-dot vs double-dot — same distinction `/create-pr`/`/create-release` use) to see the full set of changes the sync will bring into `staging`.
   - **Find which merged PRs are actually included**: [`reference-shared.md`](../create-release/reference-shared.md) step 1, with `<from>` `main` and `<into>` `staging`. The branch was just cut from `origin/main` with nothing added, so `origin/main` and `HEAD` are the same commit here.

10. **Draft the PR.**
    - Title: `Sync main into staging (<timestamp>)`.
    - Body: `## Summary` (prose on what's coming down from `main` and why — usually "catch staging up after a hotfix", pulled from the commit log, not a restatement of every commit), `## Included PRs` (that file's step 2), and `## Test plan`.
    - Pass the body via a HEREDOC to `gh pr create`, same as this repo's standard PR-creation convention.

11. **Create the PR.**
    - `gh pr create --base staging --head main-sync/<timestamp> --title "..." --body "..."`.

12. **Report the result.**
    - The branch name and the PR URL. Mention that further `main-sync/*` branches are always freshly timestamped, so re-running this skill later (e.g. after another hotfix) is safe and won't collide.

## Notes

- The shared notes in [`../create-release/reference-shared.md`](../create-release/reference-shared.md) apply: the Gitflow name `gitflow.yml` enforces, no force-push or deletion, why this skill pushes its own branch, and stopping on a failed `git fetch origin main staging`.
- `main-sync/*` branches are only ever a valid source into `staging`, never into `main` or `release/*` — this skill never asks which target to use, unlike `/create-pr`.
