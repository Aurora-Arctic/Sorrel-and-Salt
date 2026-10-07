## Aggregating workflows

- **`pr-gate.yml`** — path-filters `lint`/`typecheck`/`build`/`destructive-ddl`/`migration-order`
  (passed to `checks.yml` as its five `run-*` inputs), `vitest` and
  `playwright` via `dorny/paths-filter`; `format`, `audit` and `gitflow` always
  run. It calls `checks.yml` **once**, as the `checks` job, so a change to
  `checks.yml` flips the lint, typecheck, build, destructive-ddl and migration-order
  filters together, which is what sharing one workflow costs. `vitest`/`playwright`
  (M1.14) are `workflow_call` jobs under the job names the M0-era stubs used,
  so no required-status-check rename was ever needed.
- **One concurrency group per PR, and every job in it cancellable.**
  `pr-gate.yml`'s workflow-level group is `PR Gate-<pr number>` with
  `cancel-in-progress: ${{ github.event.action != 'edited' }}`, so a push, a
  reopen or a close cancels the PR's run in flight, whole, and an edit waits
  (below). The check jobs and `gitflow` also carry job-level
  groups that cancel in progress; the workflow's group already covers them, and
  they are left alone. **The three image builds are cancellable too** (MB.98),
  with no job-level group of their own: one cannot outlast the workflow
  cancelling the whole run, and a cancelled build has no half-written layer
  to protect. A push writes the tag with the manifest, after every blob
  it names, so a cancelled one leaves no tag for `build-image`'s
  `imagetools inspect` to find, and the layer cache commits each blob whole
  and writes its index last. The next run just rebuilds.
- **A closed PR's gate runs are cancelled** (MB.98). `closed` is in the gate's
  trigger types, and the first step of `changes` cancels its own run when
  `github.event.pull_request.state == 'closed'`. Closing or merging a PR
  therefore starts a run in the PR's group, which cancels every queued or
  in-progress gate run for that PR and then cancels itself. An `edited` event
  on a closed PR, which GitHub fires as readily as on an open one, cancels
  itself the same way. The step is step-level, so the job-level `if:` rule
  below holds. The cancel is asynchronous, so the step then `sleep`s — killed
  by the cancel, usually within seconds, with 30s as the bound — and `changes`
  never completes and hands `checks`, `vitest` or `playwright` an output to
  start on. Since MB.100 the builds and `gitflow` need it too, so nothing else
  starts. On a fork PR the token is read-only and the cancel
  fails, but a failed `changes` holds the checks back just the same.
  - **Why.** On 2026-09-27 a bulk edit of old PR bodies started 130 gate runs
    in five minutes, for PRs merged days or weeks before. Separately, four of
    the twenty most recent merges had a gate run still in flight that ran to
    the end. Both are free on GitHub's runners and billed on a metered one.
  - **Why the group, not a workflow that lists the branch's runs.** A hotfix
    branch is open as two PRs, into `main` and `staging`, with one head
    branch and one SHA. Cancelling by branch when one merges would cancel the
    other's gate, while the group is keyed by PR number.
  - `deploy.yml`'s own `closed` handler, which tears a hotfix preview down,
    is separate and unaffected.
- **An edited PR's gate run waits, then cancels itself unless the edit
  retargeted the base** (MB.100). `edited` is in the trigger types so a
  retarget re-runs the gate against the new base, but an edit to a title or a
  description changes nothing the gate checks, and once its run cancelled the
  one in flight like a push. Blacksmith's [code]smith appends a
  footer to every new PR's body four to nine seconds after it opens, so every
  PR since the app was installed had its `opened` run cancelled and re-run;
  on #535 the cancellation wedged, `build-image` neither running nor
  cancelled, and the group stayed held so the second run never started. A
  person editing a description mid-run did the same. Now the group's
  `cancel-in-progress` is `github.event.action != 'edited'`: an edit's run
  joins the group and waits — GitHub holds one pending run per group, a later
  edit replacing an earlier — and when the run in flight finishes, the first
  step of `changes` cancels it unless the payload carries `changes.base`, the
  one edit the gate cares about, which then gates as any push would. A retarget
  is therefore delayed by one gate rather than cancelling it. The edit's run
  and the close's run carry a suffix in the workflow's `run-name`, so the
  Actions list says beside the real gate what each will do. Neither ever
  covers a commit: a gate cancelled by hand to let the queued edit run through
  leaves its commit ungated, and the answer is to re-run the cancelled gate.
  - **Why every job now `needs: changes`.** A job that had started in a run
    about to cancel itself leaves a cancelled check run under its own name,
    newer than the real run's on the same commit, and a required check reads
    the newest — so once protection names `gitflow / gitflow` or a build, a
    stray `edited` run would block the PR it had already passed. Holding the
    builds and `gitflow` behind `changes` costs their start about eight
    seconds on a gate that takes ten minutes, and leaves a self-cancelled run
    owning exactly one check run, `changes`, which nothing requires.
  - Nothing here needs protection to be enabled to be worth doing: the
    wasted gate per PR was real on the metered runner, and the wedge was a PR
    with no CI at all.
- **The other two concurrency groups are right as they are** (audited in
  MB.98, so not to be redone). `deploy.yml`'s workflow-level group never
  cancels, because a half-run alias can leave a domain pointing at a dead
  deployment. `deploy.yml`'s `migrate` job holds a repo-wide `migrate`
  lock, so two merges never migrate at once.
- **`close-task-on-merge.yml`** (MB.89) — closes the issue a merged PR's body names with `Closes #N` when the PR merges into `staging`, because GitHub's own closing keywords fire only on the default branch.
- **`merge-queue.yml` was deleted by MB.32, and is restored from git history
  when M7.A.1 fires.** It was the `merge_group` counterpart, re-expressing this
  entire job graph — the same checks with `merge-queue: true`, plus
  `destructive-ddl` (a workflow of its own then) and `gitflow` with
  `should-run: false` so their check names reported rather than hung — for a
  queue that has never run. **"Require merge
  queue" is deliberately OFF** on `main` and `staging`, so `merge_group` never
  fires until M7.A.1 flips that setting, once there is more than one
  contributor; M7.A.1 is trigger-based and a prerequisite for nothing. The
  `merge-queue` input it fed survives on `checks.yml`, `vitest.yml`,
  `playwright.yml` and `gitflow.yml`, and `pr-comment`'s fail-only merge-queue
  thread with it, so bringing the file back is a revert rather than a redesign.
  Nothing passes it today. Restoring it must re-express its `destructive-ddl`
  job as `run-destructive-ddl: false` on its `checks` call, since MB.37 made
  that a leg and deleted `destructive-ddl.yml`.
- Every check job `needs: gitflow`, so a PR from the wrong source branch burns
  no CI time on the rest. `gitflow.yml`'s own `should-run: false` path is there
  for a merge-queue caller, which sees only a synthetic head ref rather than
  the PR's real source branch.
- **Branch rulesets** — `Main`, `Staging` and `Release Branches`
  (`refs/heads/release/**`) exist and carry delete/force-push protection.
  `.github/dependabot.yml` targets `staging` on all three ecosystems (`npm`,
  `github-actions`, `docker`). Two npm groups bump together: `react` and
  `better-auth` (with `@better-auth/*`), the second because `better-auth` pins
  its `@better-auth/core` to its own exact version and `src/lib/auth.ts`
  imports core directly (MB.60), so a split bump would install two copies.
- ⚠️ **No ruleset currently requires any status check** — verified against the
  live API 2026-09-10, and still deliberately true: enabling branch protection
  is not part of MB.32. Adding `gitflow / gitflow` to `Main` and `Staging` needs
  a PAT with `Administration` scope (the write returns `403` without it) or the
  GitHub UI, and until it is done the gitflow workflow reports but **blocks
  nothing**.
- **MB.32 renamed five check contexts, MB.37 a sixth.** `lint / lint`,
  `format / format`, `typecheck / typecheck`, `build / build` and
  `audit / audit` are now `checks / lint`, `checks / format`,
  `checks / typecheck`, `checks / build` and `checks / audit`;
  `destructive-ddl / destructive-ddl` is now `checks / destructive-ddl`;
  `vitest / vitest`, `playwright / playwright` and `gitflow / gitflow` are
  unchanged.
  Nothing had to be updated, because no ruleset required the old names and the
  old names will never report again — but whatever enables protection must use
  the new ones. A required check that no workflow publishes is permanently
  pending, and blocks every PR after it.
- **A required-check job must never carry a job-level `if:`** — the rule the
  whole filtering design is built on, and it **has never been verified here**.
  The claim is that GitHub then reports a bare, unqualified check name that
  `job / job` protection can never match. It is why skipping is always done
  through inputs instead — `run-lint`/`run-typecheck`/`run-build` on
  `checks.yml`, `should-run` elsewhere — and every calling job itself runs
  unconditionally.
  - **Provenance.** Copied in from another repo's comments at M0.16 and
    re-cited since (M0.20 `860d10f`, `ecce1f1`, MB.32 `2e7dcfe`), never
    observed: **nothing in this repo records the symptom**, and nothing could
    have, with no status check ever required here. MB.39 has the trace.
  - **Its scope is narrower than this bullet has been stating.** Every
    assertion in the workflow files is written about _the job that calls a
    reusable workflow_ — `pr-gate.yml`'s `checks`/`vitest`/`playwright`. Whether
    an `if:` on an _inner_ job (`checks.yml`'s own `check`, `vitest.yml`'s
    `vitest`) renames its check is a separate question nothing here answers.
    This file previously asserted "a matrix does not change this"; that
    sentence was an extrapolation, not a finding, and is withdrawn.
  - **Contrary evidence sits in the repo.** `audit / audit` carried
    `if: github.event_name == 'pull_request'` from M0.20 until MB.32 removed it
    as redundant, and `deploy.yml`'s `resolve-target`, `deploy` and `teardown`
    still carry job-level `if:` while reporting on `pull_request` into `main`.
    None is a _required_ check, so none disproves the rule — but none exhibited
    the symptom either.
  - **The rule stays in force until MB.39 settles it.** It costs a container
    pull per filtered-off leg (~20s on a `checks` leg, 46s on `playwright`, and
    37s on `vitest` while it ran on GitHub's runners — the flag is resolved in
    the first step, which runs _after_ `Initialize containers`), and that is
    the cheaper side of the bet while the naming behaviour is unknown. On
    Blacksmith the pull is cached, but the filtered-off `vitest` job still
    starts a metered runner ([Runner budget](runner-budget.md)).
- **Live GitHub settings are confirmed with the user before being changed**, and
  a permissions-blocked write is reported rather than routed around.
- **Runners are pinned to `ubuntu-26.04`** (MB.37), not `ubuntu-latest`. GitHub
  moves the floating label to 26.04 from 2026-10-19
  (actions/runner-images#14748) and annotated every job with a notice until
  then; pinning did the move on a PR that was watched and silenced the notice.
  Bumping it is one `sed` across `.github/workflows/`, and `.actrc`'s `-P`
  platform mapping must move with it. **The one exception is `vitest.yml`**, on
  `blacksmith-8vcpu-ubuntu-2404` since MB.96 — [Runner budget](runner-budget.md)
  has why that job and no other. Blacksmith has no 26.04 label, and it does not
  matter: the job runs inside `container:`, so the host's Ubuntu is only Docker
  and the runner agent.
