---
name: create-pr
model: sonnet
effort: medium
description: Use when the user asks to open a PR, create a pull request, or wrap up the current branch for review (e.g. "create a PR", "open a PR for this", "let's get this reviewed"). Commits (after asking), pushes, and opens a Gitflow-valid PR for the current branch, linked to its board task.
---

# create-pr

Turn the current branch's work into a pull request against a Gitflow-appropriate target, asking before any commit. Pushing happens automatically once there's something to push. A `hotfix/*` branch must land in both production and the mainline, so it always gets PRs into `main` and `staging`, plus a third into an in-flight `release/*` branch if the user opts in. See [reference-hotfix.md](reference-hotfix.md).

## Steps

1. **Verify GitHub authentication.**
   - Run `gh auth status` every time.
   - Only if it reports not-logged-in or invalid credentials, run `gh auth login --hostname github.com --git-protocol ssh --skip-ssh-key --with-token <<< "$GITHUB_PERSONAL_ACCESS_TOKEN"` directly. Never the `--web` flow, and never when already authenticated.
   - After a successful login go straight to step 2.

2. **Check preconditions.**
   - Run `git branch --show-current` and note it as the source branch.
   - Run `git status`, `git diff` and `git branch -a` in parallel.
   - Take the branch's contents as given: the PR is for whatever is committed, plus whatever step 4 commits. Don't judge whether the diff should contain more or ask the user to confirm it is complete.
   - Check for an existing PR: `gh pr list --head <source> --state open --json number,url,baseRefName`. Step 9 uses what comes back.

3. **Determine the target branch(es), proposing only Gitflow-valid ones.**
   - [`.github/workflows/gitflow.yml`](../../../.github/workflows/gitflow.yml) decides which source may PR into which target; a PR outside it fails the required `gitflow` check, and the workflow wins over this table:

     | Target      | Allowed source                                                                                                       |
     | ----------- | -------------------------------------------------------------------------------------------------------------------- |
     | `main`      | `release/MAJOR.MINOR.PATCH`, `hotfix/*`                                                                              |
     | `staging`   | `feature/*`, `release/MAJOR.MINOR.PATCH`, `hotfix/*`, `main-sync/YYYY-MM-DD-HH-MM-SS`; any branch on a Dependabot PR |
     | `release/*` | `staging`, `hotfix/*`                                                                                                |

     Any _other_ target, such as another `feature/*` branch, has no source restriction.

   - **If the source branch is `hotfix/*`, stop here and read [reference-hotfix.md](reference-hotfix.md) instead.** It covers steps 3–10 for the multi-target case. The rest of this step, and steps 5–9, assume a single target.
   - Otherwise, classify the source branch by prefix:
     - `feature/*` → `staging`, plus any other existing `feature/*` branch.
     - `release/*` → `main` and `staging`.
     - `main-sync/*` → `staging` only.
     - `staging` → any existing `release/*` branch.
     - Anything else (a personal branch, or `main`) → no valid target among `main`, `staging` and `release/*`.
   - Take concrete `release/*` and `feature/*` names from step 2's `git branch -a`.
   - Always use AskUserQuestion, even when only one target is valid, with at least two options you specify (the automatic "Other" doesn't count).
     - With valid targets, list them, recommend the most obvious, and add "A different branch".
     - With none, don't fall back to `main`. Say the branch name matches no Gitflow source pattern and will fail the `gitflow` check, then ask whether to (a) proceed toward a target they type, or (b) stop, to rename the branch or start over with `/create-feature` or `/create-hotfix`.
   - If the source equals the chosen target, stop and say so.
   - From here on, "target" means the branch chosen in this step.

4. **Offer to commit uncommitted work.**
   - If `git status` shows uncommitted changes, summarize them and use AskUserQuestion to ask whether to commit them first. Never commit without asking.
   - If yes, stage the relevant files (never `git add -A`) and commit with a concise message focused on why, passed with a HEREDOC. No `Co-Authored-By` trailer and no "Generated with Claude Code" line, in the commit or the PR body.

5. **Merge the target branch into the source branch before pushing.**
   - Run `git fetch origin <target>`, then `git merge origin/<target>`. Never a rebase.
   - If it completes cleanly, including "already up to date", continue.
   - If it conflicts, run `git merge --abort`, tell the user which files conflicted, and stop. Don't resolve conflicts automatically.

6. **Push automatically if there's anything to push.**
   - Run `git log <target>..HEAD --oneline`. If nothing is ahead of the target, even after steps 4 and 5, stop and say there is no work to open a PR for.
   - Otherwise, when step 4 or 5 made a commit or the branch has commits not on `origin`, push without asking: `git push -u origin <source>`. **Never a bare `git push`**: an older branch may have its base branch as upstream, and a bare push would send the work straight at `staging` or `main`.

7. **Gather context for the summary, and identify the task.**
   - Run `git diff <target>...HEAD` and `git log <target>..HEAD`, which together show everything the PR contains. This is for the summary only: describe what is there without asking whether it looks right. If the diff is empty, open no PR and say why.
   - Identify the tracked task. A `feature/m0.29-...` or `hotfix/m3.8-...` slug carries the id as its leading `m<major>.<minor>` segment, so `M0.29`. Without one, ask for the `Task ID` in plain chat. With none, skip the board for the rest of this skill.
   - Run `node scripts/task-board.mjs find <ID>` (it exits non-zero unless exactly one issue matches). On zero or several matches, tell the user and skip the board. Otherwise keep the issue's `number` and `url` for steps 8 and 10.

8. **Draft the PR.**
   - Title: `<ID> — ` then an imperative phrase of under about 70 characters. Every PR title opens with its task id, because GitHub writes the title into the merge commit and the progress tally reads the ids from it. A PR that closes several tasks opens with all their ids, `M15.32/M15.33/M15.49 — Support revision`. The ids do not count toward the 70 characters.
   - Body, first line: if step 7 identified a task, a `Closes #<number>` line (one per task the PR finishes), then a blank line. A PR that leaves the task open opens with `Refs #<number>` instead; `.github/workflows/close-task-on-merge.yml` reads `Closes` on merge.
   - Then a `## Summary` section: one to four bullets on _what_ changed and _why_, not a restatement of the commit messages. Then a `## Test plan` checklist naming only the checks the diff calls for from `npm run pre-commit`, `npm run test:coverage`, `npm run test:stories` and the Playwright run.
   - Last, after a `---` rule, [`/project-progress`](../project-progress/SKILL.md)'s tally. Run `git fetch -q origin staging` (continue if it fails), then `node .claude/skills/project-progress/tally.mjs --task <ID>`, with the PR's first task id, so the tally is that task's Project's, and append its output verbatim. Its figures are `origin/staging`'s, so this PR's own task shows as under way, which is correct. It sits in the body so step 9's regenerated body refreshes it.
   - Pass the body to `gh pr create` through a HEREDOC.

9. **Create or update the PR.**
   - If step 2 found an open PR for this branch with a matching `baseRefName`, update it without asking: `gh pr edit <number> --title "..." --body "$(cat <<'EOF' ... EOF)"`.
   - Otherwise run `gh pr create --base <target> --title "..." --body "$(cat <<'EOF' ... EOF)"`.
   - Report the PR URL to the user.

10. **Move the task to `In Review` and post the PR link.**
    - Do this in the same turn the PR is created, for the task step 7 identified. Skip it if step 7 found none.
    - When step 9 **created** a PR, run `node scripts/task-board.mjs comment <ID> "PR opened into <target>: <url>"`, then `node scripts/task-board.mjs status <ID> "In Review"`. A `hotfix/*` branch lists every PR it opened in one comment and sets `In Review` once; see [reference-hotfix.md](reference-hotfix.md).
    - When step 9 only **updated** an open PR, post a `task-board.mjs comment` saying so, and leave the status alone.
    - Never close the issue by hand; the merge does (claude-docs/task-tracking.md, "Status").

## Notes

- `.claude/settings.json` puts `git push` and `gh pr create/view/comment/list` under `permissions.ask`; expect a confirmation prompt and don't suppress it. `task-board.mjs` may prompt too.
- Never force-push, never push to `main`, and never use `--no-verify`.
- A `hotfix/*` branch is never asked about `main` or `staging`, only about an optional third `release/*` target ([reference-hotfix.md](reference-hotfix.md)).
- `/create-main-sync` and `/create-release` open their own PRs; this skill handles `main-sync/*` so that re-running it from a sync branch still proposes `staging`.
- If the user asked only for a summary, skip `gh pr create` and present step 7's summary.
