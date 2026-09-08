---
name: prune-branches
description: Use when the user asks to clean up, prune, or delete stale local branches (e.g. "clean up my branches", "delete branches that are gone on remote", "prune old branches"). Deletes local branches whose remote counterpart was removed automatically; for local branches that were never pushed, asks which ones to delete and shows what commits each has that the default branch doesn't.
---

# prune-branches

Clean up local branches that are no longer relevant: ones the remote already dropped get deleted automatically, ones that never existed on remote get asked about individually.

## Steps

1. **Fetch and prune remote-tracking refs.**
   - Run `git fetch --prune` (or `git fetch -p origin`). This only updates `refs/remotes/origin/*` to match what's actually on the remote — it doesn't touch any local branch — but it's required first, otherwise stale remote-tracking refs make deleted-on-remote branches look like they're still there.

2. **Classify local branches.**
   - Run `git for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads/` to list every local branch along with its upstream and tracking status in one pass.
   - Note the current branch (`git branch --show-current`) and exclude it — never delete the branch that's currently checked out.
   - Also exclude protected branches by name if they somehow appear in this list: `main`, `staging`, `master`. This repo's long-lived branches are `main` and `staging` (Gitflow — `staging` carries the same protections as production); `master` is kept in the list defensively. None should ever be deleted by this skill even if their tracking state looks stale.
   - Bucket the rest by the `%(upstream:track)` field:
     - **Gone**: upstream field is non-empty and track contains `[gone]` — this branch had a remote counterpart that's since been deleted (typically because its PR was merged or closed).
     - **Never pushed**: upstream field is empty — this branch has no upstream at all, meaning it was never pushed to remote in the first place.
     - Anything else (upstream exists, track is empty or shows ahead/behind but not gone) is still live on remote — leave it alone, it's out of scope for this skill.

3. **Delete "gone" branches automatically.**
   - If the gone bucket is non-empty, list the branch names to the user, then delete each with `git branch -D <branch>`. No need to ask first — the remote already confirms these are done with, and the user has already opted into this behavior by invoking this skill.
   - Use `-D` (force), not `-d`: many of these were merged via squash or rebase, which `git branch -d` won't recognize as "merged" even though the remote branch is gone — the tracking state (`[gone]`) is the actual signal to trust here, not git's local merge detection.
   - If the bucket is empty, just note that there's nothing to clean up in this category.

4. **Ask about "never pushed" branches.**
   - If this bucket is empty, skip to step 5.
   - Determine the default branch to diff against: `git symbolic-ref refs/remotes/origin/HEAD --short 2>/dev/null` (strip the `origin/` prefix), falling back to `main` if that fails.
   - For each never-pushed branch, run `git log <default>..<branch> --oneline` to see what commits it has that the default branch doesn't, and `git log -1 --format=%cr <branch>` for a sense of how stale it is.
   - Use AskUserQuestion (multiSelect: true) to ask which of these branches to delete. Present each branch as an option whose description summarizes its commit log from above (e.g. "3 commits: <short log>, last commit 2 months ago" or "0 commits — same as `<default>`" if it never diverged). Include a "None — keep all" implicit path by letting the user select nothing.
   - Delete whichever branches the user selects with `git branch -D <branch>`.

5. **Report a summary.**
   - List what was actually deleted (both buckets combined) and what was kept (any never-pushed branches the user chose not to delete). If nothing was deleted at all, say so plainly.

## Notes

- This only ever deletes **local** branches — it never touches `origin` or runs `git push`. Nothing here is destructive to the remote.
- Never delete the current branch or `main`/`staging`/`master`, regardless of their tracking state.
- `git branch -D` is a hard-to-reverse operation (the commits become unreachable outside the reflog) — this skill accepts that tradeoff for the "gone" bucket per the user's explicit intent in invoking it, but always asks first for "never pushed" branches since there's no remote confirmation that those are safe to lose.
- If `git fetch --prune` fails (e.g. no network, no remote configured), stop and report the error rather than guessing at branch state from a possibly-stale local view.
