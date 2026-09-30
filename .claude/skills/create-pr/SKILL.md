---
name: create-pr
description: Use when the user asks to open a PR, create a pull request, or wrap up the current branch for review (e.g. "create a PR", "open a PR for this", "let's get this reviewed"). Commits (after asking) and automatically pushes the current branch's work, then opens a PR with a generated summary of the work done — proposes a target branch based on the repo's Gitflow rules for the current branch's prefix (feature/release/hotfix/staging); `hotfix/*` branches automatically get PRs into both `main` and `staging`, plus a third into an in-flight `release/*` branch if the user opts in. On creating a PR it also opens the body with `Closes #<issue>` and ends it with the `/project-progress` tally, moves the linked task to `In Review` on the GitHub board and comments the PR link on its issue.
---

# create-pr

Turn the current branch's work into a pull request against a Gitflow-appropriate target, asking before any commit. Pushing happens automatically once there's something to push. A `hotfix/*` branch must land in both production and the mainline, so it always gets PRs into `main` and `staging` rather than one asked-for target, plus a third into an in-flight `release/*` branch if the user opts in. See [reference-hotfix.md](reference-hotfix.md) for that flow.

## Steps

1. **Verify GitHub authentication.**
   - Run `gh auth status`. It is read-only and cheap, so run it every time.
   - Only if it reports not-logged-in or invalid or expired credentials, authenticate: `gh auth login --hostname github.com --git-protocol ssh --skip-ssh-key --with-token <<< "$GITHUB_PERSONAL_ACCESS_TOKEN"`. Run it directly, without first checking that `$GITHUB_PERSONAL_ACCESS_TOKEN` is set. It is non-interactive and needs nothing from the user.
   - Never use the `--web` (browser or device-code) flow. Always `--with-token`.
   - Don't run `gh auth login` when already authenticated; it interrupts the user for nothing.
   - Don't re-run `gh auth status`, or verify anything else, after `gh auth login` succeeds. Go straight to step 2.

2. **Check preconditions.**
   - Run `git branch --show-current` and note it as the source branch.
   - Run `git status`, `git diff` and `git branch -a` in parallel, to see uncommitted changes, staged changes and the available branches.
   - Take the branch's contents as given. Don't judge whether its diff "should" contain more, compare it against what another task or earlier conversation implied, or ask the user to confirm the code is complete. The PR is for whatever is committed, plus whatever step 4 commits. If something worked on earlier isn't on this branch, PR what's there and let the user raise it.
   - Check whether a PR already exists for this branch: `gh pr list --head <source> --state open --json number,url,baseRefName`. Note any number, URL and base that come back; they decide whether step 9 creates a PR or updates one for a given target.

3. **Determine the target branch(es), proposing only Gitflow-valid ones.**
   - [`.github/workflows/gitflow.yml`](../../../.github/workflows/gitflow.yml) is the source of truth for which source may PR into which target; a PR outside it fails the required `gitflow` check. If this table and the workflow disagree, the workflow wins:

     | Target      | Allowed source                                                                                                       |
     | ----------- | -------------------------------------------------------------------------------------------------------------------- |
     | `main`      | `release/MAJOR.MINOR.PATCH`, `hotfix/*`                                                                              |
     | `staging`   | `feature/*`, `release/MAJOR.MINOR.PATCH`, `hotfix/*`, `main-sync/YYYY-MM-DD-HH-MM-SS`; any branch on a Dependabot PR |
     | `release/*` | `staging`, `hotfix/*`                                                                                                |

     Any _other_ target, such as another `feature/*` branch, has no source restriction.

   - **If the source branch is `hotfix/*`, stop here and read [reference-hotfix.md](reference-hotfix.md) instead.** It is a self-contained delta covering steps 3–10 for the multi-target case (`main` and `staging`, plus optionally a `release/*` branch). The rest of this step, and steps 5–9, assume a single target.
   - Otherwise, classify the source branch by prefix and compute its valid targets:
     - `feature/*` → `staging`, plus any other existing `feature/*` branch from step 2's `git branch -a`. Stacking a feature onto a feature is unrestricted.
     - `release/*` → `main` and `staging`.
     - `main-sync/*` → `staging` only, since a sync branch's only job is to land back on `staging`.
     - `staging` → any existing `release/*` branch. There is no other valid target.
     - Anything else (a personal `name/description` branch, or `main`) → no valid target among `main`, `staging` and `release/*`.
   - Where a bucket needs concrete `release/*` or `feature/*` branches rather than the pattern, take the names from step 2's `git branch -a`.
   - Always use AskUserQuestion. Never silently assume a target, even when only one is valid. The tool needs at least two options you specify; its automatic "Other" doesn't count.
     - If there are valid targets, list them, recommending the first or most obvious one, alongside a generic "A different branch" option, so the call always has at least two real choices.
     - If there are none, don't quietly fall back to `main`. Tell the user this branch's name matches no Gitflow source pattern, so it will fail the required `gitflow` check against `main`, `staging` or `release/*`. Then ask, still with AskUserQuestion, whether to (a) proceed toward a target they type, accepting that the check will fail, or (b) stop, so they can rename the branch or start over with `/create-feature` or `/create-hotfix`.
   - If the source branch equals a chosen target, stop and tell the user they need to be on a different branch. Never open a PR from a branch into itself.
   - From here on, "target" means the branch chosen in this step.

4. **Offer to commit uncommitted work.**
   - If `git status` shows uncommitted or unstaged changes, summarize them and use AskUserQuestion to ask whether to commit them before opening the PR (yes or no, describing what would be committed). Don't commit without asking, even though the PR is the user's explicit goal.
   - If they say yes, stage the relevant files (never a blind `git add -A`) and commit following the repo's commit conventions already in context: a concise message focused on why, passed with a HEREDOC. No `Co-Authored-By` trailer and no "Generated with Claude Code" line, in the commit or in the PR body.

5. **Merge the target branch into the source branch before pushing.**
   - This keeps the source branch current with its target, so the PR's diff carries no stale or conflicting history. It is a merge into the local branch, never a rebase, so no history is rewritten.
   - Run `git fetch origin <target>`, then `git merge origin/<target>`.
   - If the merge completes cleanly, including "already up to date", continue.
   - If it conflicts, stop. Run `git merge --abort` to leave the branch as it was, then tell the user which files conflicted and that they need to resolve the merge by hand before re-running this skill. Don't try to resolve conflicts automatically.

6. **Push automatically if there's anything to push.**
   - Check whether the branch has an upstream and whether local commits are ahead of it (`git status -sb`, or `git rev-list @{u}..HEAD` if an upstream exists).
   - Run `git log <target>..HEAD --oneline` to confirm there are commits ahead of the target. If there are none, even after steps 4 and 5, stop and tell the user there's no work to open a PR for.
   - Otherwise push right away, without asking: `git push -u origin <source>`, naming the source branch explicitly. Do it whenever step 4 or 5 made a new commit, or the branch has commits that aren't on `origin`. **Never a bare `git push`**: a branch created before MB.13 added `--no-track` to the branch skills has its base branch as upstream, so a bare push sends the work straight at `staging` or `main`. Naming the branch makes that impossible rather than unlikely. Never push to `main` directly; this pushes the source branch, not the target.

7. **Gather context for the summary, and identify the task.**
   - Run `git diff <target>...HEAD` and `git log <target>..HEAD`. The triple dot diffs against the merge base and the double dot logs every commit on the branch, so together they show everything the PR will contain, not just the latest commit.
   - This is for writing the summary only, not a cue to look for gaps. If the diff is smaller, larger or different than expected, describe what is there and move on, without asking the user whether it looks right.
   - If the diff comes back empty (the source is already fully contained in the target), don't open an empty PR; say why instead.
   - Identify the tracked task now, so step 8 can link it. Try the source branch name first: a `feature/m0.29-...` or `hotfix/m3.8-...` slug carries the id as its leading `m<major>.<minor>` segment, so `M0.29`. If the name has no such segment, ask the user for the `Task ID` in plain chat (free text, no options). If they have none, skip the board for the rest of this skill: no `Closes` line in step 8, and nothing to do in step 10.
   - Run `node scripts/task-board.mjs find <ID>`. It matches the title on `<ID> — ` exactly and exits non-zero unless exactly one issue matches.
   - If zero issues match, or more than one, tell the user and skip the board for the rest of this skill. Otherwise note the issue's `number` and `url`; step 8 opens the body with the number, and step 10 reuses both without looking the task up again.

8. **Draft the PR.**
   - Title: imperative mood, under about 70 characters.
   - Body, first line: if step 7 identified a task, a single `Closes #<number>` line, then a blank line. Use `Closes` on the PR that completes the task, since `.github/workflows/close-task-on-merge.yml` reads it on merge; a PR that leaves the task open (a stacked or partial one) opens with `Refs #<number>` instead.
   - Then a `## Summary` section: one to four bullets on _what_ changed and _why_, from step 7's diff and log, not a restatement of the commit messages. Then a `## Test plan` section: a checklist of how this was or should be verified, naming only the checks the diff calls for from `npm run pre-commit`, `npm run test:coverage`, `npm run test:stories` and the Playwright run.
   - Last, after a `---` rule, [`/project-progress`](../project-progress/SKILL.md)'s tally. Run `git fetch -q origin staging` (continue if it fails), then `node .claude/skills/project-progress/tally.mjs`, and append its output verbatim. Add nothing to it; it is already markdown. Its figures are `origin/staging`'s, so this PR's own task shows as under way rather than completed, which is correct: it completes on merge. It goes in the body rather than a comment so that step 9's regenerated body refreshes it instead of stacking a duplicate.
   - Pass the body to `gh pr create` through a HEREDOC, so its formatting survives.

9. **Create or update the PR.**
   - If step 2 found an open PR for this branch with a matching `baseRefName`, update it rather than opening a duplicate: `gh pr edit <number> --title "..." --body "$(cat <<'EOF' ... EOF)"`. Don't ask first; updating the open PR to the branch's current state is the expected result of re-running this skill.
   - Otherwise run `gh pr create --base <target> --title "..." --body "$(cat <<'EOF' ... EOF)"`.
   - Report the PR URL to the user.

10. **Move the task to `In Review` and post the PR link.**
    - Do this now, in the same turn the PR is created, not as a follow-up.
    - Use the task step 7 identified. If it found none, or couldn't match one uniquely, skip this step; step 7 already said so.
    - When step 9 **created** a PR, run `node scripts/task-board.mjs comment <ID> "PR opened into <target>: <url>"`, then `node scripts/task-board.mjs status <ID> "In Review"`. A `hotfix/*` branch lists every PR it opened in one comment and sets `In Review` once; see [reference-hotfix.md](reference-hotfix.md).
    - When step 9 only **updated** an open PR, the task is already `In Review`. Post a `task-board.mjs comment` saying the PR was updated, and leave the status alone.
    - Never close the issue by hand. The merge closes it (claude-docs/task-tracking.md, "Status").

## Notes

- `.claude/settings.json` puts `git push origin *`, `git push -u origin *` and `gh pr create/view/comment/list` under `permissions.ask`, so expect a confirmation prompt on those calls, and don't try to suppress it. `task-board.mjs` runs `gh issue comment` and `gh project item-edit` underneath, which the user may be prompted for too.
- Never force-push, never push to `main`, and never skip the pre-commit hook (`--no-verify`) to make a commit succeed.
- Target selection follows step 3's Gitflow rules; don't default to `main` out of habit. A `hotfix/*` branch is never asked about `main` or `staging`, only about an optional third `release/*` target ([reference-hotfix.md](reference-hotfix.md)).
- `/create-main-sync` normally creates and PRs a `main-sync/*` branch itself, without this skill, as `/create-release` does for its release branch. This skill handles `main-sync/*` so that re-running `/create-pr` from an existing sync branch still proposes its one valid target.
- If the user asked only for a summary of the work, not a PR, skip `gh pr create` and present step 7's summary instead.
