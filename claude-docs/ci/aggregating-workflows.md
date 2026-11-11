## Aggregating workflows

- **`pr-gate.yml`** path-filters `lint`/`typecheck`/`build`/`destructive-ddl`/`migration-order`
  (passed to `checks.yml` as its five `run-*` inputs), `vitest` and
  `playwright` via `dorny/paths-filter`; `format`, `audit` and `gitflow` always
  run. It calls `checks.yml` **once**, as the `checks` job, so a change to
  `checks.yml` flips the lint, typecheck, build, destructive-ddl and migration-order
  filters together, which is what sharing one workflow costs. `vitest` and
  `playwright` are `workflow_call` jobs under stable job names, so a required
  status check never needs renaming. `stories` calls `playwright.yml` again with
  `suite: stories`, on `playwright`'s two images and under its own path filter,
  and is never a required check ([Reusable checks](reusable-checks.md)).
  `workshop` runs `npm run e2e:workshop` in the e2e image as a job of its own,
  Storybook its one server, under its own `workshop` path filter (Storybook's
  config and stories, `*.stories.tsx`, `src/**`, the workshop specs and their
  config, the e2e image) as a step-level `if:`; it carries `continue-on-error`
  and is never a required check. `playwright-coverage` merges the coverage
  artifacts of `playwright` and `stories` after both, whether they passed or
  failed; it carries `continue-on-error` and is never a required check.
  `pr-comments` starts this run's Vitest and Playwright comments once
  `gitflow` finishes, whatever its result; nothing needs it
  ([`pr-comments.md`](pr-comments.md)). These two are the jobs with a
  job-level `!cancelled()`, which ignores a failed need, so each names the
  stand-down beside it.
- **One concurrency group per PR, and every job in it cancellable.**
  `pr-gate.yml`'s workflow-level group is `PR Gate-<pr number>` with
  `cancel-in-progress: ${{ github.event.action != 'edited' }}`, so a push, a
  reopen or a close cancels the PR's run in flight, whole, and an edit waits
  (below). The check jobs and `gitflow` also carry job-level groups that cancel
  in progress; the workflow's group already covers them, and they are left
  alone. **The three image builds are cancellable too**, with no job-level group
  of their own: one cannot outlast the workflow cancelling the whole run, and a
  cancelled build has no half-written layer to protect. A push writes the tag
  with the manifest, after every blob it names, so a cancelled one leaves no tag
  for `build-image`'s `imagetools inspect` to find, and the layer cache commits
  each blob whole and writes its index last. The next run just rebuilds.
- **A closed PR's gate runs are cancelled.** `closed` is in the gate's trigger
  types. Closing or merging a PR starts a run in the PR's group, which cancels
  every queued or in-progress gate run for that PR; the close's own run then
  stands down (see the next item), as does an `edited` event on a closed PR. The
  runs cancelled are the other runs of a PR that is gone, so a cancelled check
  there blocks nothing.
  - **Why.** A bulk edit of old PR bodies starts a gate run per PR, and a merge
    can leave a gate run in flight that runs to the end. Both are free on
    GitHub's runners and billed on a metered one.
  - **Why the group, not a workflow that lists the branch's runs.** A hotfix
    branch is open as two PRs, into `main` and `staging`, with one head branch
    and one SHA. Cancelling by branch when one merges would cancel the other's
    gate, while the group is keyed by PR number.
  - `deploy.yml`'s own `closed` handler, which tears a hotfix preview down, is
    separate and unaffected.
- **An edited PR's gate run waits, then stands down unless the edit retargeted
  the base or the PR's head commit is untested.** `edited` is in the trigger
  types so a retarget re-runs the gate against the new base, but an edit to a
  title or a description changes nothing the gate checks. An edit that cancelled
  the run in flight like a push wedged it: a bot or a person editing a body
  mid-run left `build-image` neither running nor cancelled and the group held,
  so the second run never started. So the group's `cancel-in-progress` is
  `github.event.action != 'edited'`: an edit's run joins the group and waits
  (GitHub holds one pending run per group, a later edit replacing an earlier),
  and when the run in flight finishes, the first step of `changes` stands it
  down unless the payload carries `changes.base`, the one edit the gate cares
  about, which then gates as any push would. A retarget is therefore delayed by
  one gate rather than cancelling it.
  - **An edit's run also gates a commit no run has tested.** The one pending run
    GitHub holds can be a push's: a push cancels the run in flight, waits while
    it shuts down, and an edit in that window replaces it before it starts a
    job, leaving the head commit with no gate at all (and re-running the edit's
    run only cancels it again). So before standing down, `changes` lists this
    workflow's runs for the PR's head commit and stands the edit's run down only
    if another run for the PR finished other than cancelled or skipped, or is
    still going. A run that lists no PR counts as not covering, so a doubt costs
    a run rather than an untested commit; the same check gates a commit whose
    gate was cancelled by hand to let the queued edit's run through.
  - The edit's run and the close's run carry a suffix in the workflow's
    `run-name`, so the Actions list says beside the real gate what each will do.
    A close's run never covers a commit; an edit's covers one only in the case
    above.
  - **A stand-down ends green; it does not cancel itself.** The first step of
    `changes` sets a `stand-down` output, `true` for a close's run and for an
    edit's run that is not retargeted and whose commit is covered, and `false`
    otherwise. A run that cancelled itself left a cancelled `changes` check run
    on the head commit, newer than the real run's successes, which turned the PR
    UNSTABLE. So every other job in `pr-gate.yml` has an `if:` on the output and
    reports skipped, and `changes` itself succeeds. The close's run stands down
    the same way: a closed PR has no head commit to protect, and one rule for
    both is simpler, while the group's `cancel-in-progress` still cancels the
    other runs.
  - **Why the `if:` is on the calling jobs, and safe there.** A false `if:` on a
    job that calls a reusable workflow reports one bare check (`checks`,
    skipped) and creates no `checks / lint` check run, so it cannot overwrite a
    required inner name. A caller that ran with its inner jobs skipped would: an
    inner skipped `checks / lint` is the newest run of that name and would
    replace a real failure, and a skipped required check passes. So no caller
    runs on a stand-down. `playwright-coverage`'s `!cancelled()` ignores skipped
    needs, so it names the stand-down as well. `workshop` is a plain job and
    carries the same `if:`. When the output is `false` every `if:` is true and
    the gate runs in full.
  - **Why every job `needs: changes`.** A job that started in a run that is
    standing down would leave a check run under its own name, newer than the
    real run's on the same commit, and a required check reads the newest.
    Holding the builds and `gitflow` behind `changes` costs their start about
    eight seconds on a gate that takes ten minutes, and leaves a run that stands
    down owning one successful check run, `changes`, and bare skipped names for
    the rest.
- **The other two concurrency groups are right as they are.** `deploy.yml`'s
  workflow-level group never cancels, because a half-run alias can leave a
  domain pointing at a dead deployment. `deploy.yml`'s `migrate` job holds a
  repo-wide `migrate` lock, so two merges never migrate at once.
- **`close-task-on-merge.yml`** closes the issue a merged PR's body names with
  `Closes #N` when the PR merges into `staging`, because GitHub's own closing
  keywords fire only on the default branch.
- **`e2e-cache.yml`** on a push to `staging` that touches the e2e build's
  inputs, calls `build-e2e-image.yml`, `build-db-image.yml` and `playwright.yml`
  with `build-only: true`, so the e2e build cache is saved where every pull
  request's Playwright job can restore it. Its job names are not
  `pr-gate.yml`'s, so it publishes no check name the gate does
  ([Reusable checks](reusable-checks.md)).
- **No `merge_group` workflow exists.** "Require merge queue" is off on `main`
  and `staging`, so `merge_group` never fires. The `merge-queue` input survives
  on `checks.yml`, `vitest.yml`, `playwright.yml` and `gitflow.yml`, and
  `pr-comment`'s fail-only merge-queue thread with it; nothing passes it. A
  queue caller would also pass `run-destructive-ddl: false` on its `checks` call
  and `should-run: false` to `gitflow`, since `merge_group` has no diffable
  source ref and can only trust that `pr-gate.yml` already gated the PR.
- Every check job `needs: gitflow`, so a PR from the wrong source branch burns
  no CI time on the rest. `gitflow.yml`'s own `should-run: false` path is there
  for a merge-queue caller, which sees only a synthetic head ref rather than the
  PR's real source branch.
- **Branch rulesets** `Main`, `Staging` and `Release Branches`
  (`refs/heads/release/**`) exist and carry delete/force-push protection.
  `.github/dependabot.yml` targets `staging` on all three ecosystems (`npm`,
  `github-actions`, `docker`). Two npm groups bump together: `react` and
  `better-auth` (with `@better-auth/*`), the second because `better-auth` pins
  its `@better-auth/core` to its own exact version and `src/lib/auth.ts` imports
  core directly, so a split bump would install two copies.
- **No ruleset requires any status check, deliberately.** Adding
  `gitflow / gitflow` to `Main` and `Staging` needs a PAT with `Administration`
  scope (the write returns `403` without it) or the GitHub UI, and until it is
  done the gitflow workflow reports but **blocks nothing**. Whatever enables
  protection must name the current contexts: `checks / lint`, `checks / format`,
  `checks / typecheck`, `checks / build`, `checks / audit`,
  `checks / destructive-ddl`, `vitest / vitest`, `playwright / playwright` and
  `gitflow / gitflow`. A required check that no workflow publishes is
  permanently pending, and blocks every PR after it.
- **A job-level `if:` renames a check only on a job that calls a reusable
  workflow** (probed; the run, the raw check-run output and the YAML are in
  [`ci.md`, "A job-level `if:` renames the check only on the job that calls a reusable workflow"](../design-decisions/ci.md#a-job-level-if-renames-the-check-only-on-the-job-that-calls-a-reusable-workflow)).
  - **A calling job with a false `if:`** reports one bare check named after the
    caller (`checks`, not `checks / lint`), `skipped`. No `checks / lint` check
    run exists. That is why `pr-gate.yml` passes the path filter down as
    `run-*` / `should-run` inputs instead of putting an `if:` on its calling
    jobs for the path filter; the inner jobs then skip themselves on those
    inputs. The one `if:` its calling jobs do carry is the stand-down's (above),
    which skips a whole run and so is safe for the same reason.
  - **An inner job with a false `if:`** (a plain job inside the reusable
    workflow, such as `vitest.yml`'s `vitest`) keeps its qualified name
    (`caller / inner`) and reports `skipped`; it is not renamed. `vitest.yml`'s
    four jobs and `playwright.yml`'s shard job carry `if: inputs.should-run`, and
    `checks.yml`'s path-filtered jobs carry `if: inputs.run-<leg>`.
  - **A matrix job cannot use one on its own matrix values.** `if: matrix.x` on
    the job is rejected when the file loads: `Unrecognized named-value:
'matrix'`. `checks.yml` is a plain job per leg for that reason.
  - **A `skipped` check satisfies a required status check**, and a required
    check that never reports leaves the pull request blocked (both tested with a
    scratch ruleset). So a leg is never left out of a matrix: it is a plain job
    that skips itself.
  - **What the job-level `if:` saves.** A filtered-off job no longer pulls its
    container: about 20s on a `checks` leg, 24s on `lint`, 37s on `vitest` and
    46s on `playwright` ([Runner budget](runner-budget.md)).
  - **Other `if:` keys in the repo.** `deploy.yml`'s `resolve-target`, `deploy`
    and `teardown` carry them. Those are not required checks, so they never
    tested the rule.
- **Live GitHub settings are confirmed with the user before being changed**, and
  a permissions-blocked write is reported rather than routed around.
- **Runners are pinned to `ubuntu-26.04`**, not `ubuntu-latest`, so GitHub's
  move of the floating label happens on a PR that is watched. Bumping it is one
  `sed` across `.github/workflows/`, and `.actrc`'s `-P` platform mapping must
  move with it. There is no exception: `vitest.yml` runs on the same image
  ([Runner budget](runner-budget.md) has why it left Blacksmith). The job runs
  inside `container:`, so the host's Ubuntu is only Docker and the runner agent.

### Which events run the checks

No push to `staging` or `main` runs a check; release and main-sync PRs pass the same gate as any PR.
