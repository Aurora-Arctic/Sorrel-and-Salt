# Push a Gitflow branch and PR it: shared steps

`create-release` and `create-main-sync` each cut a branch off a freshly fetched base, push it themselves, and open its PR with an `## Included PRs` section. Both follow these steps where their `SKILL.md` names them, with the parameters below, and cite them by number, so keep the numbering.

| Parameter                                    | `create-release`            | `create-main-sync`              |
| -------------------------------------------- | --------------------------- | ------------------------------- |
| `<from>`: the base, and where its PRs merged | `staging`                   | `main`                          |
| `<into>`: the PR's target                    | `main`                      | `staging`                       |
| The Gitflow name `gitflow.yml` accepts       | `release/MAJOR.MINOR.PATCH` | `main-sync/YYYY-MM-DD-HH-MM-SS` |

## Steps

1. **Find the merged PRs the branch carries**, so the summary can credit real authors instead of guessing from commit messages.
   - `gh pr list --base <from> --state merged --limit 200 --json number,title,author,mergedAt,url,mergeCommit`.
   - Squash/rebase merges don't leave merge commits, so don't rely on `git log --merges`. Instead, for each PR in that list, it is included when `git merge-base --is-ancestor <mergeCommit.oid> origin/<from>` succeeds (it is on the base) and `git merge-base --is-ancestor <mergeCommit.oid> origin/<into>` fails (the target doesn't have it yet). Sort the matches by `mergedAt`.
   - If the lookup comes back empty despite commits in range (e.g. someone pushed straight to `<from>` without a PR), work from the commit log instead, and step 2 writes no section.

2. **Write the `## Included PRs` section** of the PR body: one line per PR step 1 matched, as `- [#<number>](<url>) <title> — @<author.login>`, so each is attributed to whoever actually authored it. When step 1 matched none, omit the section rather than inventing entries.

## Notes

- The branch name follows the Gitflow rules in [`CLAUDE.md`](../../../CLAUDE.md), which accept only the table's name for this kind of source branch — the naming isn't just a convention. `.github/workflows/gitflow.yml` enforces it: a PR from a differently-named branch fails the required `gitflow` check.
- Never force-push; never delete anything.
- Pushing here, rather than deferring to `/create-pr` as `/create-feature` and `/create-hotfix` do, is a deliberate exception to this repo's normal "ask before anything visible to others" caution: invoking either skill is itself the user's request for a real, shared branch and PR, and for a release its tag. `.claude/settings.json`'s `permissions.ask` entry for `git push origin *` still prompts for confirmation on each actual push.
- If the skill's `git fetch` fails (no network, no remote), stop and report the error rather than working from possibly-stale local refs.
