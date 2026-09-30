---
name: create-pr
description: Use when the user asks to open a PR, create a pull request, or wrap up the current branch for review (e.g. "create a PR", "open a PR for this", "let's get this reviewed"). Commits (after asking) and automatically pushes the current branch's work, then opens a PR with a generated summary of the work done — proposes a target branch based on the repo's Gitflow rules for the current branch's prefix (feature/release/hotfix/staging); `hotfix/*` branches automatically get PRs into both `main` and `staging`, plus a third into an in-flight `release/*` branch if the user opts in. On creating a PR it also opens the body with `Closes #<issue>` and ends it with the `/project-progress` tally, moves the linked task to `In Review` on the GitHub board and comments the PR link on its issue.
---

# create-pr

Turn the current branch's work into a pull request against a Gitflow-appropriate target, asking before any commit. Pushing happens automatically once there's something to push. `hotfix/*` branches are a special case: since a hotfix must land in both production and the mainline, this always opens PRs into `main` and `staging` rather than asking for one target — and, if a release is in flight, may open a third into that `release/*` branch too. See [reference-hotfix.md](reference-hotfix.md) for that flow.

## Steps

1. **Verify GitHub authentication.**
   - Run `gh auth status` to check whether credentials are valid. This is a read-only check — safe to run every time and cheap enough not to skip.
   - Only if it reports not-logged-in or invalid/expired credentials, authenticate: `gh auth login --hostname github.com --git-protocol ssh --skip-ssh-key --with-token <<< "$GITHUB_PERSONAL_ACCESS_TOKEN"`. Run this directly — don't check whether `$GITHUB_PERSONAL_ACCESS_TOKEN` is set first, just attempt the login. Non-interactive — completes immediately, nothing for the user to do.
   - Never use the `--web` (browser/device-code) flow — always `--with-token`.
   - Don't run `gh auth login` at all when already authenticated — it's unnecessary and interrupts the user for no reason.
   - Don't re-run `gh auth status` (or any other verification) after `gh auth login` completes — trust that a successful login means auth is good, and move straight on to step 2.

2. **Check preconditions.**
   - Run `git branch --show-current`. Note it as the source branch.
   - Run `git status`, `git diff`, and `git branch -a` (in parallel) to see uncommitted changes, staged changes, and available branches.
   - Take the active branch's contents as given. Don't evaluate whether the branch's diff "should" contain more than it does, compare it against what some other task or conversation implied should be there, or ask the user to confirm the code is complete — the PR is for whatever is actually committed (plus whatever gets committed in step 4), full stop.
   - Also check whether a PR already exists for this branch: `gh pr list --head <source> --state open --json number,url,baseRefName`. Note any number/URL/base that comes back — it determines whether step 9 creates a new PR or updates an existing one for a given target.

3. **Determine the target branch(es), proposing only Gitflow-valid ones.**
   - This repo follows Gitflow branch-source rules. Until the enforcing `gitflow` CI check lands (M0.17/M0.20 add `.github/workflows/gitflow.yml`), [`CLAUDE.md`](../../../CLAUDE.md)'s Conventions → Gitflow line is the source of truth — re-read it if these rules ever look out of date. Once the workflow exists, it becomes the source of truth and this table should be checked against it:

     | Target      | Allowed source                                      |
     | ----------- | --------------------------------------------------- |
     | `main`      | `release/*`, `hotfix/*`                             |
     | `staging`   | `feature/*`, `release/*`, `hotfix/*`, `main-sync/*` |
     | `release/*` | `staging`, `hotfix/*`                               |

     Any _other_ target (e.g. another `feature/*` branch) has no source restriction at all — the check only gates `main`/`staging`/`release/*` targets.

   - **If the source branch is `hotfix/*`, stop here and read [reference-hotfix.md](reference-hotfix.md) instead** — it's a self-contained delta covering steps 3-9 for the multi-target case (`main`+`staging`, plus optionally a `release/*` branch). Everything below in this step, and in steps 5-9, assumes a single target.
   - Otherwise, classify the source branch (from step 2) by prefix and compute its valid targets:
     - `feature/*` → `staging`, plus any other existing `feature/*` branch from step 2's `git branch -a` (excluding itself) — feature-into-feature stacking is unrestricted by the check.
     - `release/*` → `main` and `staging`.
     - `main-sync/*` → `staging` only — same single-target shape as `staging` itself below, since a sync branch's only job is to land back on `staging`.
     - `staging` itself → any existing `release/*` branch (there's no other valid target).
     - anything else (e.g. a personal `name/description` branch, or `main`) → no valid target among `main`/`staging`/`release/*`.
   - When a bucket needs concrete `release/*` or `feature/*` branches (not just the pattern), pull the actual names from step 2's `git branch -a` output.
   - Always use AskUserQuestion — never silently assume a target, even when only one is valid. The tool requires at least 2 manually-specified options (its automatic "Other" doesn't count toward that minimum):
     - If there are valid targets, list them (first/most obvious one recommended) alongside a generic "A different branch" fallback option so the call always has ≥2 real choices.
     - If there are zero valid targets, don't quietly fall back to `main`: tell the user this branch's name doesn't match any Gitflow source pattern, so it will fail the required `gitflow` check against `main`/`staging`/`release/*` regardless of target. Then ask (still via AskUserQuestion) whether to (a) proceed anyway toward a manually-typed target, accepting the check will fail, or (b) stop so they can rename the branch, or start over with `/create-feature`/`/create-hotfix`.
   - If the source branch (step 2) equals a chosen target branch, stop and tell the user they need to be on a different branch — do not open a PR from a branch into itself.
   - From here on, "target" refers to the branch determined in this step.

4. **Offer to commit uncommitted work.**
   - If `git status` shows uncommitted or unstaged changes, summarize what changed and use AskUserQuestion to ask whether to commit them before opening the PR (yes / no — describe what would be committed). Do not commit without asking, even though the PR is the user's explicit goal.
   - If they say yes, stage the relevant files (never blind `git add -A`) and commit following this repo's normal commit conventions (see the Git Safety Protocol / commit instructions already in context) — draft a concise message focused on why, use a HEREDOC. No `Co-Authored-By` trailer and no "Generated with Claude Code" line, in the commit or the PR body.

5. **Pull the target branch into the source branch before pushing.**
   - This keeps the source branch up to date with its target and avoids the PR's diff carrying stale/conflicting history. It's a merge into the local branch — not a rebase — so no history rewriting occurs.
   - Run `git fetch origin <target>`, then `git merge origin/<target>`.
   - If the merge completes cleanly (including "already up to date"), continue.
   - If it conflicts, stop: run `git merge --abort` to leave the branch as it was, then tell the user which files conflicted and that they'll need to resolve the merge manually before re-running this skill. Don't attempt to resolve conflicts automatically.

6. **Push automatically if there's anything to push.**
   - Check whether the current branch has an upstream and whether local commits are ahead of it (`git status -sb` or `git rev-list @{u}..HEAD` if an upstream exists).
   - Run `git log <target>..HEAD --oneline` to confirm there are commits ahead of the target. If there's nothing to push (no commits ahead even after steps 4-5), stop and tell the user there's no work to open a PR for.
   - Otherwise, push right away without asking first — run `git push -u origin <source>`, naming the source branch explicitly, whenever step 4 or step 5 produced a new commit, or whenever the branch already has commits that aren't on `origin`. Never a bare `git push`: a branch created before MB.13 added `--no-track` to the branch skills has its **base** branch as upstream, so a bare push sends the work straight at `staging` or `main`. Naming the branch makes that impossible rather than unlikely. Never push to `main` directly — this pushes the source branch, not the target.

7. **Gather context for the summary, and identify the task.**
   - Run `git diff <target>...HEAD` and `git log <target>..HEAD` (note the triple-dot vs double-dot: diff against the merge base, log of all commits on the branch) to see the full set of changes that PR will contain, not just the latest commit.
   - This is for writing the summary only — it's not a cue to go looking for gaps. If the diff looks smaller, larger, or different than expected, that's not this skill's concern; describe what's actually there and move on. Do not pause to ask the user whether it looks right.
   - If the diff against `HEAD` comes back empty (source is already fully contained in the target), skip creating the PR and say why, rather than opening an empty one.
   - Identify the tracked task, if any, now — step 8 links it in the PR body. Try the source branch name first: a `feature/m0.29-...` or `hotfix/m3.8-...` slug carries the task id as its leading `m<major>.<minor>` segment → `M0.29`. If the branch name has no such segment, ask the user for the `Task ID` in plain chat (free-text, no options). If they don't have one, skip the board entirely for the rest of this skill — no `Closes` line in step 8's body, nothing to do in step 10.
   - `node scripts/task-board.mjs find <ID>` — prints one JSON object (`number`, `title`, `state`, `stateReason`, `url`, `milestone`, `labels`, `status`) on exactly one match and exits non-zero otherwise. It matches the title on `<ID> — ` exactly, because thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`).
   - If zero or more than one issue matches, tell the user and skip the board for the rest of this skill. Note the matched issue's `number` and `url` — step 8 opens the body with the former, step 10 reuses both without looking up again.

8. **Draft the PR.**
   - Title: short, under ~70 characters, imperative mood.
   - Body: if step 7 identified a task, start with a single `Closes #<number>` line followed by a blank line — one line, not a section, so it doesn't crowd out what follows. `Closes` goes on the PR that completes the task, because `.github/workflows/close-task-on-merge.yml` reads it on merge; a PR that leaves the task open (a stacked or partial one) opens with `Refs #<number>` instead. Then a `## Summary` section (1-4 bullet points on _what_ changed and _why_, based on step 7's diff/log — not a restatement of commit messages) and a `## Test plan` section (checklist of how this was/should be verified — reference this repo's actual checks per what was actually touched: `npm run pre-commit`, `npm run test:coverage`, `npm run test:stories`, and the Playwright run. Name only the checks the diff calls for).
   - Last, after a `---` rule, [`/project-progress`](../project-progress/SKILL.md)'s tally: run `git fetch -q origin staging` (continue if it fails), then `node .claude/skills/project-progress/tally.mjs`, and append its output verbatim — add nothing to it, the output is already markdown. Its figures are `origin/staging`'s, so this PR's own task shows as under way rather than completed; that is correct, not stale, since it completes on merge. It lives in the body rather than in a comment because step 9 regenerates the body on a re-run, so the tally refreshes instead of stacking a duplicate.
   - Pass the body via a HEREDOC to `gh pr create` for correct formatting, same as this repo's standard PR-creation convention.

9. **Create or update the PR.**
   - If step 2 found an existing open PR for this branch with a matching `baseRefName`, update it instead of opening a duplicate: `gh pr edit <number> --title "..." --body "$(cat <<'EOF' ... EOF)"`. No need to ask first — updating an already-open PR with the branch's current state is the expected outcome of running this skill again, and the regenerated body carries a fresh tally.
   - Otherwise, run `gh pr create --base <target> --title "..." --body "$(cat <<'EOF' ... EOF)"`.
   - Report the PR URL back to the user.

10. **Move the task to `In Review` and post the PR link.**
    - Per [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section, `In Review` is set **in the same turn the PR is created, alongside a comment carrying the PR link** — so do this now, not as a follow-up.
    - Uses the task identified in step 7 — if that step found none, or couldn't uniquely match one, skip this step entirely (already said so at the time).
    - When step 9 **created** a new PR: in this same turn, `node scripts/task-board.mjs comment <ID> "PR opened into <target>: <url>"`, then `node scripts/task-board.mjs status <ID> "In Review"`. For a `hotfix/*` branch, list every PR opened (`main`, `staging`, and the optional `release/*`) in the one comment, and set `In Review` once — see [reference-hotfix.md](reference-hotfix.md).
    - When step 9 only **updated** an already-open PR: the task is already `In Review` — just post a `task-board.mjs comment` noting the PR was updated, and leave the status alone.
    - Status moves forward only: the script refuses a backward step and refuses `Done`. Never close the issue by hand — `.github/workflows/close-task-on-merge.yml` closes it when the PR merges into `staging`, and GitHub itself does when a PR merges into `main`; its closing keywords fire only on the default branch, which is why the Action exists.

## Notes

- This project's `.claude/settings.json` has `git push origin *` and `gh pr create/view/comment/list` under `permissions.ask` — expect (and don't try to suppress) a confirmation prompt on those calls; that's intentional, not a bug. `task-board.mjs` runs `gh issue comment` and `gh project item-edit` underneath, which are writes the user may be prompted for too.
- Step 10's lookup and status values are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section — that section is the source of truth if they ever drift. Setting the status the same turn the PR opens is a hard rule there ("A status left stale is worse than no status"), not a nicety.
- Never force-push, never push to `main`, and never skip the pre-commit hook (`--no-verify`) to make a commit succeed.
- Target selection is Gitflow-aware (see step 3) — don't default to `main` out of habit. `hotfix/*` branches use a different flow entirely — see [reference-hotfix.md](reference-hotfix.md); `main`/`staging` are never asked about there, only an optional third `release/*` target is. [`CLAUDE.md`](../../../CLAUDE.md)'s Gitflow line — later `.github/workflows/gitflow.yml`, once M0.17/M0.20 land it — is the source of truth if the rules table in step 3 ever drifts.
- `main-sync/*` branches are normally created and PR'd directly by `/create-main-sync`, which doesn't defer to this skill (same reasoning `/create-release` uses for its own release branch). This skill's `main-sync/*` handling exists so re-running `/create-pr` from an already-created sync branch still proposes the right (only) target.
- If the user only asked for a summary of work done (not a PR), skip `gh pr create` and just present the step 7 summary directly instead.
- Don't second-guess the branch's contents against prior conversation context, other branches, or what you think "should" be there. If something you worked on earlier isn't on the active branch, that's out of scope for this skill — PR what's there, and let the user raise it if it's actually a problem.
- Task identification moved to step 7 (previously part of step 10) specifically so the PR body drafted in step 8 can link the task — step 10 just reuses what step 7 already found, it doesn't search again.
