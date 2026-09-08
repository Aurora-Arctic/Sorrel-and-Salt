---
name: create-pr
description: Use when the user asks to open a PR, create a pull request, or wrap up the current branch for review (e.g. "create a PR", "open a PR for this", "let's get this reviewed"). Commits (after asking) and automatically pushes the current branch's work, then opens a PR with a generated summary of the work done — proposes a target branch based on the repo's Gitflow rules for the current branch's prefix (feature/release/hotfix/staging); `hotfix/*` branches automatically get PRs into both `main` and `staging`, plus a third into an in-flight `release/*` branch if the user opts in. On creating a PR it also moves the linked Asana task to `In Review` and comments the PR link on it.
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
   - If they say yes, stage the relevant files (never blind `git add -A`) and commit following this repo's normal commit conventions (see the Git Safety Protocol / commit instructions already in context) — draft a concise message focused on why, use a HEREDOC, include the `Co-Authored-By` trailer.

5. **Pull the target branch into the source branch before pushing.**
   - This keeps the source branch up to date with its target and avoids the PR's diff carrying stale/conflicting history. It's a merge into the local branch — not a rebase — so no history rewriting occurs.
   - Run `git fetch origin <target>`, then `git merge origin/<target>`.
   - If the merge completes cleanly (including "already up to date"), continue.
   - If it conflicts, stop: run `git merge --abort` to leave the branch as it was, then tell the user which files conflicted and that they'll need to resolve the merge manually before re-running this skill. Don't attempt to resolve conflicts automatically.

6. **Push automatically if there's anything to push.**
   - Check whether the current branch has an upstream and whether local commits are ahead of it (`git status -sb` or `git rev-list @{u}..HEAD` if an upstream exists).
   - Run `git log <target>..HEAD --oneline` to confirm there are commits ahead of the target. If there's nothing to push (no commits ahead even after steps 4-5), stop and tell the user there's no work to open a PR for.
   - Otherwise, push right away without asking first — run `git push` (or `git push -u origin <branch>` if no upstream is set yet) whenever step 4 or step 5 produced a new commit, or whenever the branch already has commits that aren't on `origin`. Never push to `main` directly — this pushes the source branch, not the target.

7. **Gather context for the summary.**
   - Run `git diff <target>...HEAD` and `git log <target>..HEAD` (note the triple-dot vs double-dot: diff against the merge base, log of all commits on the branch) to see the full set of changes that PR will contain, not just the latest commit.
   - This is for writing the summary only — it's not a cue to go looking for gaps. If the diff looks smaller, larger, or different than expected, that's not this skill's concern; describe what's actually there and move on. Do not pause to ask the user whether it looks right.
   - If the diff against `HEAD` comes back empty (source is already fully contained in the target), skip creating the PR and say why, rather than opening an empty one.

8. **Draft the PR.**
   - Title: short, under ~70 characters, imperative mood.
   - Body: a `## Summary` section (1-4 bullet points on _what_ changed and _why_, based on step 7's diff/log — not a restatement of commit messages) and a `## Test plan` section (checklist of how this was/should be verified — reference this repo's actual checks where relevant, per what was actually touched: `npm run pre-commit` today, plus `npm run test:coverage`, `make test-stories`, or the Playwright e2e run once the M1+ tasks wire them up. Only name a check that exists — this repo is pre-scaffold, so confirm a script is real before citing it).
   - Pass the body via a HEREDOC to `gh pr create` for correct formatting, same as this repo's standard PR-creation convention.

9. **Create or update the PR.**
   - If step 2 found an existing open PR for this branch with a matching `baseRefName`, update it instead of opening a duplicate: `gh pr edit <number> --title "..." --body "$(cat <<'EOF' ... EOF)"`. No need to ask first — updating an already-open PR with the branch's current state is the expected outcome of running this skill again.
   - Otherwise, run `gh pr create --base <target> --title "..." --body "$(cat <<'EOF' ... EOF)"`.
   - Report the PR URL back to the user.

10. **Move the Asana task to `In Review` and post the PR link.**
    - Per [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section, `In Review` is set **in the same turn the PR is created, alongside a comment carrying the PR link** — so do this now, not as a follow-up.
    - Identify the task ID. First try the source branch name: a `feature/m0.29-...` or `hotfix/m3.8-...` slug carries it as the leading `m<major>.<minor>` segment → `M0.29`. If the branch name has no such segment, ask the user for the Asana `Task ID` in plain chat (free-text, no options). If they don't have one, skip this step and say so.
    - Find the task: `asana_search_tasks` with `projects.any` = `1218257926462425` and `text` = the task ID, then match a result whose `Task ID` custom field equals it exactly (the text search is fuzzy — don't rely on it alone). If zero or more than one task matches, don't guess — tell the user and skip the rest of this step.
    - When step 9 **created** a new PR: in this same turn, `asana_create_task_story` with a comment carrying the PR URL, then `asana_update_task` with `custom_fields` = `{"1218259502689548": "1218259502689551"}` (the `In Review` option). For a `hotfix/*` branch, list every PR opened (`main`, `staging`, and the optional `release/*`) in the one comment, and set `In Review` once — see [reference-hotfix.md](reference-hotfix.md).
    - When step 9 only **updated** an already-open PR: the task is already `In Review` — just add an `asana_create_task_story` comment noting the PR was updated, and leave the status field alone.
    - Status moves one direction only: never set `Completed` here (that happens on merge), and never move a task backward. If the task is already `In Review` or `Completed`, don't re-set it — just add the comment.

## Notes

- This project's `.claude/settings.json` has `git push origin *` and `gh pr create/view/comment/list` under `permissions.ask` — expect (and don't try to suppress) a confirmation prompt on those calls; that's intentional, not a bug.
- Step 10's Asana project / field / option GIDs are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" table — that table is the source of truth if they ever drift. Setting the status the same turn the PR opens is a hard rule there ("A status left stale is worse than no status"), not a nicety.
- Never force-push, never push to `main`, and never skip the pre-commit hook (`--no-verify`) to make a commit succeed.
- Target selection is Gitflow-aware (see step 3) — don't default to `main` out of habit. `hotfix/*` branches use a different flow entirely — see [reference-hotfix.md](reference-hotfix.md); `main`/`staging` are never asked about there, only an optional third `release/*` target is. [`CLAUDE.md`](../../../CLAUDE.md)'s Gitflow line — later `.github/workflows/gitflow.yml`, once M0.17/M0.20 land it — is the source of truth if the rules table in step 3 ever drifts.
- `main-sync/*` branches are normally created and PR'd directly by `/create-main-sync`, which doesn't defer to this skill (same reasoning `/create-release` uses for its own release branch). This skill's `main-sync/*` handling exists so re-running `/create-pr` from an already-created sync branch still proposes the right (only) target.
- If the user only asked for a summary of work done (not a PR), skip `gh pr create` and just present the step 7 summary directly instead.
- Don't second-guess the branch's contents against prior conversation context, other branches, or what you think "should" be there. If something you worked on earlier isn't on the active branch, that's out of scope for this skill — PR what's there, and let the user raise it if it's actually a problem.
