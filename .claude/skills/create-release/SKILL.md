---
name: create-release
description: Use when the user asks to cut/start a new release (e.g. "create a release branch", "cut a release", "/create-release"). Diffs staging against main and summarizes what's shipping, asks major/minor/patch (default patch), computes the next version from the latest git tag, creates `release/<version>` off staging plus a `v<version>` tag carrying that summary, and opens a PR into `main` summarizing every merged-to-staging PR (and its author) included in the release.
---

# create-release

Cut a new Gitflow release: compute the next semver version, branch off the latest `staging` as `release/<version>`, tag the cut point `v<version>`, and open a PR from the release branch into `main`. The steps it shares with `/create-main-sync` are [`reference-shared.md`](reference-shared.md)'s, with `<from>` `staging` and `<into>` `main`.

## Steps

1. **Verify GitHub authentication.**
   - Follow [`/create-pr`](../create-pr/SKILL.md) step 1 as written, then go on to step 2 here.

2. **Check for a clean working tree.**
   - Follow [`create-feature/reference-branch.md`](../create-feature/reference-branch.md) step 1 as written.

3. **Fetch the latest refs and tags.**
   - `git fetch origin --tags` — updates `origin/staging`/`origin/main` and pulls every tag, needed to compute the current version accurately.

4. **Determine the current version.**
   - `git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1` — the highest existing `vMAJOR.MINOR.PATCH` tag.
   - If none exist, treat the baseline as `v0.0.0` (this repo's first release).

5. **Diff `staging` against `main` and summarize what's shipping.**
   - `git log origin/main..origin/staging --oneline` and `git diff origin/main...origin/staging` (triple-dot: changes on `staging` since it diverged from `main`) — if both are empty, tell the user there's nothing to release and stop before asking anything else.
   - **Find which merged PRs are actually in scope**, for the summary and later the PR body: [`reference-shared.md`](reference-shared.md) step 1, with `<from>` `staging` and `<into>` `main`. The release branch is about to be cut from `origin/staging` with no intervening commits, so this list stays valid once the branch exists in step 9 — no need to re-query in step 12.
   - Draft a short prose summary (a few sentences to a short paragraph) of what's shipping, from the commit log/diff/matched PR titles — from the commit log alone when the lookup matched nothing.
   - Show this summary to the user so they have context before picking a version bump. Keep both the summary text and the matched PR list around — reused verbatim in the tag message (step 10) and the PR body (step 12) rather than recomputed there.

6. **Ask which part to bump.**
   - Use AskUserQuestion with three options — **Patch (Recommended)**, **Minor**, **Major** — each described in standard semver terms (patch: backwards-compatible fixes; minor: backwards-compatible features; major: breaking changes). Default/recommended is Patch.

7. **Compute the new version.**
   - Major → `(X+1).0.0`; Minor → `X.(Y+1).0`; Patch → `X.Y.(Z+1)`, from the baseline in step 4.
   - This gives two names: branch `release/<version>` (no `v` prefix, e.g. `release/1.2.3`) and tag `v<version>` (e.g. `v1.2.3`).

8. **Check for collisions.**
   - `git rev-parse --verify --quiet refs/heads/release/<version>`, `git ls-remote --exit-code --heads origin release/<version>`, and `git tag --list v<version>` (local; already fetched remote tags in step 3). Any hit means version computation is out of sync with reality — stop and tell the user rather than guessing.

9. **Create the release branch off the latest `staging`.**
   - `git checkout --no-track -b release/<version> origin/staging` — `--no-track` so the branch’s upstream is its own remote branch once step 11 pushes it, never `origin/staging` (MB.13).

10. **Tag the cut point.**
    - `git tag -a v<version> -m "Release <version>

<summary>"` — annotated, on the branch's current HEAD (i.e. the `staging` commit it was cut from), where `<summary>` is the prose drafted in step 5.

11. **Push the branch and the tag.**
    - `git push -u origin release/<version>` and `git push origin v<version>`. A release branch and its tag are the point of this skill, so it pushes both directly (the shared notes say why).

12. **Open the PR into `main`, if there's anything to release.**
    - `git log origin/main..release/<version> --oneline` — if empty (shouldn't happen given step 5 already confirmed commits in range, but guards against a race), skip PR creation and say so, but still report the branch/tag created (step 13).
    - Draft the PR the same way `/create-pr` steps 7-8 do, plus one more section: title `Release <version>`; body has `## Summary` (the prose drafted in step 5, not regenerated), `## Included PRs` ([`reference-shared.md`](reference-shared.md) step 2, from step 5's matches), and `## Test plan`. Pass the body via HEREDOC to `gh pr create --base main --head release/<version> --title "..." --body "..."`.
    - When step 5 matched no PRs, the `## Summary` prose still covers those commits.

13. **Report the result.**
    - New version, the branch and tag names, and the PR URL (or the "nothing to release yet" note from step 12). Mention `/create-hotfix` can target this release branch if a fix is needed before it ships, and that further changes land on it via ordinary PRs (`staging`/`hotfix/*` are its only Gitflow-valid sources).

## Notes

- The shared notes in [`reference-shared.md`](reference-shared.md) apply: the Gitflow name `gitflow.yml` enforces, no force-push or deletion, why this skill pushes its own branch and tag, and stopping on a failed fetch.
- Above all, stop on a failed `git fetch origin --tags`: the version would otherwise come from a possibly-stale local tag list.
