---
name: create-main-sync
description: Use when the user asks to sync main into staging, bring main-only changes (e.g. a hotfix) back down into staging, or catch staging up with main (e.g. "sync main into staging", "bring the hotfix back to staging", "/create-main-sync"). Branches off the latest `main` as `main-sync/<timestamp>`, then opens a PR into `staging` summarizing what's included.
---

# create-main-sync

Bring commits that landed on `main` but not yet on `staging` (most commonly a `hotfix/*` merged straight into `main`) back down into `staging`: branch off the latest `main` as `main-sync/<timestamp>`, push it, and open a PR into `staging`.

## Steps

1. **Verify GitHub authentication.**
   - Run `gh auth status`. Only if it reports not-logged-in or invalid/expired credentials, authenticate: `gh auth login --hostname github.com --git-protocol ssh --skip-ssh-key --with-token <<< "$GITHUB_PERSONAL_ACCESS_TOKEN"` (never `--web`). Skip straight to step 2 if already authenticated — same convention as `/create-pr` step 1.

2. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

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
   - `git push -u origin main-sync/<timestamp>`. Unlike `/create-feature`/`/create-hotfix` (which leave pushing to `/create-pr`), the sync PR is the point of this skill — push directly, same as `/create-release` does for its release branch.

9. **Gather context for the PR summary.**
   - `git diff origin/staging...HEAD` and `git log origin/staging..HEAD` (triple-dot vs double-dot — same distinction `/create-pr`/`/create-release` use) to see the full set of changes the sync will bring into `staging`.
   - **Find which merged PRs are actually included**, so the summary can credit real authors instead of guessing from commit messages: `gh pr list --base main --state merged --limit 200 --json number,title,author,mergedAt,url,mergeCommit`. Squash/rebase merges don't leave merge commits, so don't rely on `git log --merges` — instead, for each PR in that list check `git merge-base --is-ancestor <mergeCommit.oid> HEAD` (it's in this sync) and NOT `git merge-base --is-ancestor <mergeCommit.oid> origin/staging` (not already in `staging`) to decide whether it's part of this sync. Sort the matches by `mergedAt`.
   - If the merged-PR lookup comes back empty despite there being commits in range (e.g. someone pushed straight to `main` without a PR), just omit the `## Included PRs` section rather than inventing entries.

10. **Draft the PR.**
    - Title: `Sync main into staging (<timestamp>)`.
    - Body: `## Summary` (prose on what's coming down from `main` and why — usually "catch staging up after a hotfix", pulled from the commit log, not a restatement of every commit), `## Included PRs` (when step 9 found matches: one line per PR as `- [#<number>](<url>) <title> — @<author.login>`), and `## Test plan`.
    - Pass the body via a HEREDOC to `gh pr create`, same as this repo's standard PR-creation convention.

11. **Create the PR.**
    - `gh pr create --base staging --head main-sync/<timestamp> --title "..." --body "..."`.

12. **Report the result.**
    - The branch name and the PR URL. Mention that further `main-sync/*` branches are always freshly timestamped, so re-running this skill later (e.g. after another hotfix) is safe and won't collide.

## Notes

- Branch naming follows the Gitflow rules in [`CLAUDE.md`](../../../CLAUDE.md), which only accept `main-sync/YYYY-MM-DD-HH-MM-SS` as a source into `staging` — this skill's naming isn't just a convention. Once M0.17/M0.20 add `.github/workflows/gitflow.yml`, PRs from a differently-named sync branch will fail the required `gitflow` check.
- `main-sync/*` branches are only ever a valid source into `staging`, never into `main` or `release/*` — this skill never asks which target to use, unlike `/create-pr`.
- Never force-pushes; never deletes anything.
- Pushing the branch here (rather than deferring to `/create-pr`) is a deliberate exception to this repo's normal "ask before anything visible to others" caution — invoking `/create-main-sync` is itself the user's request for a real, shared sync PR, same reasoning `/create-release` uses for its own push. `.claude/settings.json`'s `permissions.ask` entry for `git push origin *` still prompts for confirmation on the actual push.
- If `git fetch origin main staging` fails (no network, no remote), stop and report the error rather than computing a diff from possibly-stale local refs.
