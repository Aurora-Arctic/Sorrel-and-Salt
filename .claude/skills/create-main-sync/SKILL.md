---
name: create-main-sync
model: sonnet
effort: medium
description: Use when the user asks to sync main into staging, bring main-only changes (e.g. a hotfix) back down into staging, or catch staging up with main (e.g. "sync main into staging", "bring the hotfix back to staging", "/create-main-sync"). Branches off the latest `main` as `main-sync/<timestamp>`, then opens a PR into `staging` summarizing what's included.
---

# create-main-sync

Bring commits that are on `main` but not `staging` (usually a `hotfix/*` merged straight into `main`) down into `staging`: branch off the latest `main` as `main-sync/<timestamp>`, push it, open a PR into `staging`. The shared notes and steps are [`../create-release/reference-shared.md`](../create-release/reference-shared.md)'s, with `<from>` `main` and `<into>` `staging`. `main-sync/*` is a valid source only into `staging`, so this skill never asks for a target.

## Steps

1. **Authenticate.** Follow [`/create-pr`](../create-pr/SKILL.md) step 1 as written.

2. **Check the working tree is clean.** Follow [`create-feature/reference-branch.md`](../create-feature/reference-branch.md) step 1 as written.

3. **Fetch.** `git fetch origin main staging`. If it fails, stop and report.

4. **Check there is something to sync.** `git log origin/staging..origin/main --oneline`. If empty, tell the user and stop; create no branch or PR.

5. **Name and check the branch.** `main-sync/<timestamp>`, the UTC time from `date -u +%Y-%m-%d-%H-%M-%S`. Check `git rev-parse --verify --quiet refs/heads/main-sync/<timestamp>` and `git ls-remote --exit-code --heads origin main-sync/<timestamp>`; on a collision (the same second) recompute.

6. **Create and push.** `git checkout --no-track -b main-sync/<timestamp> origin/main`, then `git push -u origin main-sync/<timestamp>`. `--no-track` keeps the upstream off `origin/main` (MB.13).

7. **Gather the PR context.** `git diff origin/staging...HEAD` and `git log origin/staging..HEAD`. For the merged PRs included, follow `reference-shared.md` step 1; `origin/main` and `HEAD` are the same commit here.

8. **Draft and open the PR.** Title `Sync main into staging (<timestamp>)`. Body: `## Summary` (why it is coming down, usually "catch staging up after a hotfix", not every commit restated), `## Included PRs` (`reference-shared.md` step 2) and `## Test plan`. Pass the body by HEREDOC: `gh pr create --base staging --head main-sync/<timestamp> --title "..." --body "..."`.

9. **Report** the branch name and PR URL.
