---
name: create-release
description: Use when the user asks to cut/start a new release (e.g. "create a release branch", "cut a release", "/create-release"). Diffs staging against main and summarizes what's shipping, asks major/minor/patch (default patch), computes the next version from the latest git tag, creates `release/<version>` off staging plus a `v<version>` tag carrying that summary, and opens a PR into `main` summarizing every merged-to-staging PR (and its author) included in the release.
---

# create-release

Cut a new Gitflow release: compute the next semver version, branch off the latest `staging` as `release/<version>`, tag the cut point `v<version>`, and open a PR from the release branch into `main`.

## Steps

1. **Verify GitHub authentication.**
   - Run `gh auth status`. Only if it reports not-logged-in or invalid/expired credentials, authenticate: `gh auth login --hostname github.com --git-protocol ssh --skip-ssh-key --with-token <<< "$GITHUB_PERSONAL_ACCESS_TOKEN"` (never `--web`). Skip straight to step 2 if already authenticated — same convention as `/create-pr` step 1.

2. **Check for a clean working tree.**
   - Run `git status`. If there are uncommitted or unstaged changes, warn the user that they'll carry onto the new branch and use AskUserQuestion to confirm how to proceed: bring the changes along, stash them first (`git stash push -u`), or stop.

3. **Fetch the latest refs and tags.**
   - `git fetch origin --tags` — updates `origin/staging`/`origin/main` and pulls every tag, needed to compute the current version accurately.

4. **Determine the current version.**
   - `git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1` — the highest existing `vMAJOR.MINOR.PATCH` tag.
   - If none exist, treat the baseline as `v0.0.0` (this repo's first release).

5. **Diff `staging` against `main` and summarize what's shipping.**
   - `git log origin/main..origin/staging --oneline` and `git diff origin/main...origin/staging` (triple-dot: changes on `staging` since it diverged from `main`) — if both are empty, tell the user there's nothing to release and stop before asking anything else.
   - **Find which merged PRs are actually in scope**, so the summary (and later the PR body) can credit real authors instead of guessing from commit messages: `gh pr list --base staging --state merged --limit 200 --json number,title,author,mergedAt,url,mergeCommit`. Squash/rebase merges don't leave merge commits, so don't rely on `git log --merges` to find them — instead, for each PR in that list check `git merge-base --is-ancestor <mergeCommit.oid> origin/staging` (in scope) and NOT `git merge-base --is-ancestor <mergeCommit.oid> origin/main` (not already shipped) to decide whether it's part of this release. Sort the matches by `mergedAt`. The release branch is about to be cut from `origin/staging` with no intervening commits, so this list stays valid once it exists in step 8 — no need to re-query in step 11.
   - Draft a short prose summary (a few sentences to a short paragraph) of what's shipping, from the commit log/diff/matched PR titles. If the PR lookup came back empty despite commits in range (e.g. someone pushed straight to `staging`), base the summary on the commit log instead rather than inventing PRs.
   - Show this summary to the user so they have context before picking a version bump. Keep both the summary text and the matched PR list around — reused verbatim in the tag message (step 9) and the PR body (step 11) rather than recomputed there.

6. **Ask which part to bump.**
   - Use AskUserQuestion with three options — **Patch (Recommended)**, **Minor**, **Major** — each described in standard semver terms (patch: backwards-compatible fixes; minor: backwards-compatible features; major: breaking changes). Default/recommended is Patch.

7. **Compute the new version.**
   - Major → `(X+1).0.0`; Minor → `X.(Y+1).0`; Patch → `X.Y.(Z+1)`, from the baseline in step 4.
   - This gives two names: branch `release/<version>` (no `v` prefix, e.g. `release/1.2.3`) and tag `v<version>` (e.g. `v1.2.3`).

8. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/release/<version>`, `git ls-remote --exit-code --heads origin release/<version>`, and `git tag --list v<version>` (local; already fetched remote tags in step 3). Any hit means version computation is out of sync with reality — stop and tell the user rather than guessing.

9. **Create the release branch off the latest `staging`.**
   - `git checkout -b release/<version> origin/staging`.

10. **Tag the cut point.**
    - `git tag -a v<version> -m "Release <version>

<summary>"` — annotated, on the branch's current HEAD (i.e. the `staging` commit it was cut from), where `<summary>` is the prose drafted in step 5.

11. **Push the branch and the tag.**
    - `git push -u origin release/<version>` and `git push origin v<version>`. Unlike `/create-feature`/`/create-hotfix` (which leave pushing to `/create-pr`), a release branch and its tag are the point of this skill — push both directly.

12. **Open the PR into `main`, if there's anything to release.**
    - `git log origin/main..release/<version> --oneline` — if empty (shouldn't happen given step 5 already confirmed commits in range, but guards against a race), skip PR creation and say so, but still report the branch/tag created (step 13).
    - Draft the PR the same way `/create-pr` steps 7-8 do, plus one more section: title `Release <version>`; body has `## Summary` (the prose drafted in step 5, not regenerated), an `## Included PRs` section listing every PR matched in step 5 as `- [#<number>](<url>) <title> — @<author.login>` (one line per PR, so each is attributed to whoever actually authored it), and `## Test plan`. Pass the body via HEREDOC to `gh pr create --base main --head release/<version> --title "..." --body "..."`.
    - If step 5's merged-PR lookup came back empty, omit the `## Included PRs` section rather than inventing entries — the `## Summary` prose still covers those commits.

13. **Report the result.**
    - New version, the branch and tag names, and the PR URL (or the "nothing to release yet" note from step 12). Mention `/create-hotfix` can target this release branch if a fix is needed before it ships, and that further changes land on it via ordinary PRs (`staging`/`hotfix/*` are its only Gitflow-valid sources).

## Notes

- Version naming follows the Gitflow rules in [`CLAUDE.md`](../../../CLAUDE.md), which only accept `release/MAJOR.MINOR.PATCH` as a source into `main`/`staging` — this skill's naming isn't just a convention. Once M0.17/M0.20 add `.github/workflows/gitflow.yml`, PRs from a differently-named release branch will fail the required `gitflow` check.
- Never force-pushes; never deletes anything.
- Pushing the branch and tag here (rather than deferring to `/create-pr`) is a deliberate exception to this repo's normal "ask before anything visible to others" caution — invoking `/create-release` is itself the user's request for a real, shared release artifact. `.claude/settings.json`'s `permissions.ask` entry for `git push origin *` still prompts for confirmation on the actual pushes.
- If `git fetch origin --tags` fails (no network, no remote), stop and report the error rather than computing a version from a possibly-stale local tag list.
