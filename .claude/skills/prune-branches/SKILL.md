---
name: prune-branches
model: sonnet
effort: medium
description: Use when the user asks to clean up, prune, or delete stale local branches (e.g. "clean up my branches", "delete branches that are gone on remote", "prune old branches"). Deletes local branches whose remote counterpart was removed automatically; for local branches that were never pushed, asks which ones to delete and shows what commits each has that the default branch doesn't.
---

# prune-branches

Delete local branches the remote already dropped; ask about ones that never existed on the remote. It only deletes **local** branches and never runs `git push`.

## Steps

1. **Fetch and prune.** Run `git fetch --prune`. If it fails (no network, no remote), stop and report the error; a stale view of the branches is worse than none.

2. **Classify.** Run `git for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads/`. Exclude the current branch (`git branch --show-current`) and `main`, `staging` and `master`, whatever their tracking state. Bucket the rest by the track field:
   - **Gone**: upstream set and track contains `[gone]`.
   - **Never pushed**: upstream empty.
   - Anything else is live on the remote; leave it.

3. **Delete the gone branches without asking.** List them, then `git branch -D <branch>` each. Use `-D`, not `-d`: squash and rebase merges are not seen as merged by `-d`, and `[gone]` is the signal to trust. If the bucket is empty, say so.

4. **Ask about the never-pushed branches**, if any.
   - Default branch: `git symbolic-ref refs/remotes/origin/HEAD --short` without the `origin/` prefix, else `main`.
   - Per branch: `git log <default>..<branch> --oneline` and `git log -1 --format=%cr <branch>`.
   - AskUserQuestion with `multiSelect: true`, one option per branch, its description the commit summary and age (or "0 commits, same as `<default>`"). Selecting nothing keeps all.
   - `git branch -D` each selected branch. There is no remote copy to recover from, so always ask.

5. **Report** what was deleted and what was kept. If nothing was deleted, say so.
