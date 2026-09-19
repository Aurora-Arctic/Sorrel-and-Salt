# CI pipeline — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

`.github/` — the workflows and the composite actions they share. Nothing under
`.github/workflows/` hardcodes a repo name except `checkout-to-app`'s callers
(see below); everything else derives from `github.repository`.

## Composite actions

`.github/actions/` — three actions. `timer-start` and `timer-elapsed` were a
fourth and fifth until MB.32 deleted them: 46 lines across twelve workflows to
print an elapsed time into a job summary. `duration` stays an **optional**
input on `job-summary` and `pr-comment`, so restoring a timer would need no
edit at any call site; nothing passes it today.

- **`checkout-to-app`** — `actions/checkout`, then
  `cp -a "$GITHUB_WORKSPACE"/. /app/`, then `git clean -fd` in `/app`.
  Every other local action resolves as `./.github/actions/<name>` once checked
  out; this one runs _before_ that checkout exists, so **callers must reference
  it by full `Aurora-Arctic/Sorrel-and-Salt/...@main` path**.
  - **The clean step is not redundant, and removing it reopens MB.42.** Both
    `Dockerfile.node` and `Dockerfile.e2e` bake the whole repo into `/app` with
    `COPY . .` at image build time; the `cp -a` then _overlays_ that, and an
    overlay never deletes. Every file dropped from the repo since the image was
    last built therefore stays on disk — untracked, not gitignored, and
    indistinguishable to `oxlint`, `tsc` or a `tests/**` glob from a file the
    branch actually has. `git clean -fd` is what deletes it. **No `-x`**: the
    image's own `node_modules` and `.next` are gitignored and must survive, or
    every job reinstalls its dependencies.
  - It must run _after_ the copy, not before: `.dockerignore` keeps both `.git`
    and `.gitignore` out of the image, so the clean has neither an index to
    compare against nor an ignore list until the checkout has landed.
  - Found by MB.41, whose new test-location guard failed on its first CI run
    reporting 34 test files outside `tests/` — every one of them that move's own
    predecessor, still sitting where the image had baked it. The count is the
    tell: 34, not that branch's 39, because the image predated the five test
    files added since. The guard was changed to scan the git index instead,
    which is right on its own merits and left the condition itself untouched
    until MB.42.
  - Verified by `checks / overlay` — see below.
- **`job-summary`** — a pass/fail `$GITHUB_STEP_SUMMARY` callout, with a tailed
  log excerpt on failure.
- **`pr-comment`** — upserts one marked comment per check (`<!-- ci-<slug> -->`),
  in `minimize` (resolve-on-pass) or `comment` (always post) mode, plus a
  separate fail-only thread for `merge-queue: true` callers.

## Reusable checks (`workflow_call`, never triggered directly)

- **`checks.yml`** (MB.32) — one matrix job running `lint`, `format`,
  `typecheck`, `build` and `audit`, each reporting as `checks / <name>`, plus a
  second job, `overlay` (MB.42). These
  were five near-identical workflows until MB.32: the same
  `image`/`pr-number`/`merge-queue`/`should-run` inputs, the same
  `container: image: ${{ inputs.image }}` job (`options: --user root`), the
  same checkout, `job-summary` and `pr-comment` scaffolding, differing in one
  npm script and one summarising step.
  - Every leg runs its command under `set -o pipefail` inside a brace group,
    teeing the output to `/app/output.log`, then turns that log into a
    one-line stat and a capped collapsible breakdown through its own script in
    `.github/scripts/` — `summarize-lint.sh`, `summarize-format.sh`,
    `summarize-typecheck.sh`, each moved there verbatim from the workflow it
    came from, so what a PR comment says did not change. The brace group is
    what keeps `2>&1 | tee` applying to the whole command rather than to the
    last thing in it.
  - **`fail-fast: false` is load-bearing.** A cancelled leg reports a
    cancelled check, which required-status-check protection treats as
    unsatisfied — so one failing leg would otherwise block the PR on four
    checks that never got to run.
  - **`run-lint` / `run-typecheck` / `run-build` / `run-destructive-ddl` are
    the path-filter inputs**, one per filtered leg, in place of the single
    `should-run` each workflow used to take. `format` has none and always runs,
    since Prettier covers non-code files; `audit` has none because it is
    non-blocking and PR-only. The first step resolves the four down to one flag
    for the leg it is running, and treats an empty flag as true — so `act`,
    which applies no `workflow_call` input defaults, cannot report a check it
    never ran.
  - **`build`'s extras all survive the collapse**: the `/app/.next/cache`
    restore through `actions/cache`, `DATABASE_URL`/`BETTER_AUTH_SECRET`, and
    `npm run workshop:build` chained onto `npm run build` with `&&`, which
    short-circuits the same way separate steps did. The story gate rode here
    too until MB.38 moved it — and the theme-default guard, which had only
    ever run in pre-commit — into `workshop-guards.test.ts` on the `vitest`
    job (`src/test/` then; `tests/guards/` since MB.41). It posts no PR
    comment, as `build.yml` didn't.
    - **The cache `path` is the absolute `/app/.next/cache`**, not a
      workspace-relative path: `hashFiles()` reads `$GITHUB_WORKSPACE`, but
      the job's working directory is `/app`.
    - **The cache never hit before MB.37.** `actions/cache` runs inside the
      `testing` container, and the Alpine image's busybox `tar` rejects
      `--posix`, so every save failed with a warning and every restore missed
      — from the step's first commit (`57d81bd`) until MB.37 added GNU `tar`
      and `zstd` to the image's `testing` stage. The `testing` image hash
      moved with that Dockerfile change, as it does for any.
    - **`package.json`'s `build` script forces `NODE_ENV=production`.** The
      `testing` image bakes in `NODE_ENV=test`, and Turbopack crashes
      prerendering `/_global-error` under anything but `production`/unset —
      without the force, every real build run fails.
    - The two env vars sit at job level and are inert in the other four legs.
      `npm run build` traces `/api/auth/[...all]` (M2.2), which reaches
      `src/db/connection.ts` (throws at import without a syntactically valid
      `DATABASE_URL`, though it never issues a query) and `src/lib/auth.ts`
      (Better Auth requires a real `BETTER_AUTH_SECRET` at
      `NODE_ENV=production`).
  - **`audit`** — `npm audit --json`, which cannot fail the gate (a trailing
    `|| true`), deliberately non-blocking and **never a required status
    check**. It is the one leg that builds its own comment, through
    `.github/scripts/audit-comment.cjs` under `actions/github-script` rather
    than `pr-comment`: a severity table and a package breakdown reported as a
    `[!WARNING]` on a step that passed, which `pr-comment`'s pass/fail
    vocabulary has no way to say. The same script writes the same callout to
    the job summary (MB.37). Until then the leg wrote no summary at all,
    because the pass/fail `job-summary` action would have put "Dependency
    Audit passed" directly above the table — and the audit was invisible on
    the run's summary page as a result. The summary is written whether or not
    a `pr-number` was passed; the PR comment only when one was, so
    `make act-check CHECK=audit` shows the table and skips the comment.
  - **`vitest` and `playwright` are deliberately not legs.** Each brings a
    `services: postgres:` block, a `db-image` input and its own artifact
    uploads — a different job shape, not a different npm script.

- **`checks / overlay`** (MB.42, a second job in `checks.yml` rather than a
  seventh leg) — the one check in the repo that tests `checkout-to-app` instead
  of merely starting with it. It plants an untracked file, an untracked
  directory and an ignored file in the image's `/app`, runs the action, and
  asserts the first two are gone, the third survived, `node_modules` survived,
  the checkout landed, and `git status --porcelain --untracked-files=all` in
  `/app` is empty. Against the pre-MB.42 action — copy, no clean — every one of
  the untracked assertions fails.
  - **Why it has to manufacture the condition.** The `testing` image is rebuilt
    whenever `Dockerfile.node` or `package-lock.json` changes, so on most PRs
    there are few leftovers or none and every leg passes with the bug fully
    present. It bites only on the PRs that delete files — rarely, and never on
    the PR that would explain it.
  - **It references the action as `./.github/actions/checkout-to-app`**, not by
    the `@main` path its real callers use, so an edit to the action is verified
    on the PR that makes it rather than after merge. That is why the job checks
    out first: a local `./` reference is read from `$GITHUB_WORKSPACE`, so it
    needs a checkout the real callers are calling the action to _get_. They pay
    one checkout; this job pays two.
  - **The `@main` reference is still how every other caller reaches it**, which
    means a fix to the action has no effect on its own PR's other jobs and
    takes hold on the first run after it reaches `main`.

- **`checks / destructive-ddl`** (M1.5, a `checks.yml` leg since MB.37) —
  flags destructive DDL in migration files new or changed in the PR, via
  `scripts/check-destructive-ddl.ts`, and fails unless the PR body carries a
  `Destructive DDL acknowledged: <reason>` line. The forms: any `DROP` except
  `DROP NOT NULL` and `DROP DEFAULT` (which widen), `RENAME`,
  `ALTER COLUMN ... TYPE`, `SET NOT NULL`, and `ADD COLUMN ... NOT NULL` with
  no `DEFAULT` — see `claude-docs/db.md`'s Migrations section for the policy.
  Blocking, like `lint`/`typecheck`.
  - **It needs two things a `workflow_call` file cannot read off its own
    trigger**, which is why it has inputs where the other legs have none: the
    changed-migration-file list and the PR body. Only the caller sees
    `github.event.pull_request`. The list comes from `changes`'s
    `dorny/paths-filter` step (`list-files: json`, reused rather than adding a
    second changed-files action) as `destructive-ddl-files`, the body straight
    from `github.event.pull_request.body` as `pr-body`, and `checks.yml` puts
    both into the job `env` as `DESTRUCTIVE_DDL_FILES` /
    `DESTRUCTIVE_DDL_PR_BODY`, inert in the other five legs.
  - **`DESTRUCTIVE_DDL_FILES` is always set, even to an empty string.** The
    script reads set-but-empty as "no migrations changed, scan nothing" and
    _unset_ as "work out what this branch changed from git" — the second is a
    local convenience and must never be what CI does.
  - ⚠️ **MB.32 deleted its calling job and did not replace it.** The check ran
    on nothing from 2026-09-17 until MB.37 folded it in as a leg; PRs #104–#107
    were never gated by it, and two migrations (`0005`, `0006`) landed
    unscanned. The `changes` job kept computing its filters the whole time,
    which is why nothing looked wrong. MB.37 also widened `DROP` past
    `COLUMN`/`TABLE` — `0002`'s `DROP CONSTRAINT users_email_unique` had passed
    — and stopped `migrations/meta/*.json` being handed to the script as SQL.
  - Its `run-destructive-ddl: false` path exists for a merge-queue caller (same
    reason as `gitflow`'s `should-run` — `merge_group` has no real PR body or
    diffable source ref, so it can only trust that `pr-gate.yml` already gated
    the PR before it reached the queue). `merge-queue.yml` was that caller
    until MB.32 deleted it.

- **`build-image.yml`** — builds the shared `testing` image once and exposes its
  ref as an `image` output. Tag is content-addressed:
  `ghcr.io/${github.repository,,}/testing:${{ hashFiles('Docker/Dockerfile.node', 'package-lock.json') }}`,
  and a `docker buildx imagetools inspect` check skips the build entirely when
  that hash already has a pushed image. **This image excludes Playwright
  entirely** — it's Alpine/musl-based and Playwright's Chromium build has no
  official musl support — so every `checks.yml` leg and `vitest` consume it,
  but `playwright` does not; see `build-e2e-image.yml` below.
- **`vitest.yml`** (M1.14) — `npm run test:coverage` in the same container
  shape as `checks.yml`'s legs (`inputs.image` from `build-image.yml`),
  plus a `services: postgres:` block on the `vitest` job keyed off its
  `inputs.db-image` — reachable by service name since `vitest` runs inside
  its own `container:`, per DESIGN.md §11's CI table. `db-image` comes in
  from the caller (`pr-gate.yml`'s own top-level
  `build-db-image` job, `uses: ./.github/workflows/build-db-image.yml`,
  same shape as `build-image`); `vitest.yml` doesn't call `build-db-image.yml`
  itself — it used to, and so did `playwright.yml` separately, which meant
  building the same content-addressed image twice per run for no reason.
  `DATABASE_URL` is `postgres://sorrel:sorrel@postgres:5432/sorrel`, the same
  credentials `Docker/docker-compose.yaml`'s `app` service uses locally;
  `tests/support/db-global-setup.ts`/`db-setup.ts` rewrite the database name per
  worker from there. Coverage JSON (`--reporter=json`) and the `vitest`
  project's `json-summary` coverage reporter feed
  `.github/scripts/summarize-vitest.mjs` (ported from resume-2026, alongside
  `summarize-playwright.mjs` and shared `lib/coverage-table.mjs` — this repo
  had no `.github/scripts/` before that task; MB.32 added the four `checks.yml`
  scripts beside them) for the PR comment's stat line
  and coverage table. `should-run` path-filters the same way `lint`/
  `typecheck` do.
- **`playwright.yml`** (M1.14) — `npm run e2e` against the app
  `webServer` already builds and serves on 8001 (see `testing.md`'s E2E
  section). Runs in `build-e2e-image.yml`'s dedicated image, **not**
  `build-image.yml`'s — same `inputs.db-image`/`services: postgres:` shape
  as `vitest.yml`, fed by the same caller-built `build-db-image` job (one
  build, shared by both — see `vitest.yml`'s entry above). Uploads
  `playwright-report/`/`test-results/` on failure and
  `coverage-e2e/` always (parallel to `vitest.yml`'s `coverage/` upload).
  `should-run` path-filters the same way. `next.config.ts`'s
  `productionBrowserSourceMaps: true` and `e2e/coverage.config.ts`'s
  `sourceFilter` (JS-only coverage, `src/**` only) apply here since it's the
  same production build both `npm run e2e` locally and this job exercise —
  see `testing.md`'s Coverage section for why, and for the
  `fullyParallel`/`test.describe.configure({ mode: 'serial' })` fix the CI
  Postgres service surfaced (a real race, not CI-only flakiness).
- **`build-e2e-image.yml`** (M1.14) — same content-addressed-tag /
  skip-if-exists shape as `build-image.yml`, but for `Docker/Dockerfile.e2e`:
  `FROM mcr.microsoft.com/playwright:v1.63.0-noble` (Microsoft's own image,
  which bundles a matching Node runtime, every OS dep Chromium needs, and
  the browser itself, all pinned together) — pinned to
  `@playwright/test`'s resolved `package-lock.json` version; bump both
  together. `Docker/docker-compose.yaml`'s opt-in `e2e` service (profile
  `e2e`, `make docker-e2e`) builds this same file for local use, so a
  devcontainer session (still Alpine-based itself, via `Docker/Dockerfile.node`)
  can run the full e2e suite without a base-distro change of its own.
  **`target: e2e` is pinned explicitly (MB.23):** `Dockerfile.e2e` gained a
  second stage, `headed` (a display, for the `playwright-server` compose
  service's `playwright codegen`/`page.pause()` support), and an unqualified
  `docker build` picks whichever stage is _last_ in the file. Without the
  pin, this workflow would silently start building and publishing `headed`
  instead — extra weight CI never uses. The `e2e` compose service pins the
  same target for the same reason; `playwright-server` is the one consumer
  that deliberately builds `headed`, under its own image tag
  (`sorrel-e2e-headed`, not `sorrel-e2e`) so the two never collide. A PR
  touching `Dockerfile.e2e` — this one included — moves the content-addressed
  hash and republishes the image; that's expected, not a regression.
- **`gitflow.yml`** — enforces which source branch may PR into which target:
  `feature/*` → `staging`; `release/MAJOR.MINOR.PATCH` or `hotfix/*` → `main`;
  `staging` or `hotfix/*` → `release/*`; `main-sync/YYYY-MM-DD-HH-MM-SS` →
  `staging`. Standing exception: Dependabot PRs into `staging` pass regardless
  of branch name, **checked by PR author (`dependabot[bot]`), not by branch
  pattern** — a naming exception would let anyone claim it. This workflow is the
  source of truth for the branch-source rules.

## Aggregating workflows

- **`pr-gate.yml`** — path-filters `lint`/`typecheck`/`build`/`destructive-ddl`
  (passed to `checks.yml` as its four `run-*` inputs), `vitest` and
  `playwright` via `dorny/paths-filter`; `format`, `audit` and `gitflow` always
  run. It calls `checks.yml` **once**, as the `checks` job, where lint, format,
  typecheck, build and audit used to be five jobs calling five workflows — so a
  change to `checks.yml` now flips the lint, typecheck, build and
  destructive-ddl filters together, which is what sharing one workflow costs. `vitest`/`playwright`
  (M1.14) are real `workflow_call` jobs now, same job names the M0-era stubs
  used so no required-status-check rename was ever needed. Its `build-image` job keeps a
  `pr-gate-build-image-<pr number>` / `cancel-in-progress: false` concurrency
  group on the caller; `build-e2e-image` (feeding `playwright`, not
  `build-image`) does the same under its own group.
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
  `github-actions`, `docker`).
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
  - **Provenance.** It arrived at M0.16 (`258b825`) as a byte-for-byte copy of
    `resume-2026`'s own `should-run` comments; that task's decision record
    verified YAML parsing and a `diff` against the upstream originals, and
    nothing about check-run naming. M0.20 (`32e0926`) re-cited it as
    "upstream's own `should-run` comments". The doc consolidation (`b3b0dbb`)
    lifted it into this file as a general rule, and MB.32 (`d406cff`) extended
    it to matrix jobs. **No commit, decision record or transcript in this repo
    describes the symptom being observed** — and none could, since no ruleset
    here has ever required a status check.
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
    pull per filtered-off leg (~20s on a `checks` leg, 37s on `vitest`, 46s on
    `playwright` — the flag is resolved in the first step, which runs _after_
    `Initialize containers`), and that is the cheaper side of the bet while the
    naming behaviour is unknown.
- **Live GitHub settings are confirmed with the user before being changed**, and
  a permissions-blocked write is reported rather than routed around.
- **Runners are pinned to `ubuntu-26.04`** (MB.37), not `ubuntu-latest`.
  GitHub moves the floating label to 26.04 from 2026-10-19
  (actions/runner-images#14748) and annotated every job with a notice until
  then; pinning did the move on a PR that was watched and silenced the notice.
  Bumping it is one `sed` across `.github/workflows/`, and `.actrc`'s `-P`
  platform mapping must move with it.

## Smoke checks

None remain.

`composite-actions-check.yml` was the last one, and MB.32 deleted it: a
workflow testing the composite actions that exist to de-duplicate the
workflows. It asserted that each `action.yml` lands in `/app` on the bare
`ubuntu-latest` runner, with its own "Prepare /app" step ahead of
`checkout-to-app`. Every action it covered is now exercised by the checks that
use it on the same push — a broken `job-summary` or `pr-comment` fails
`checks`, `vitest` and `playwright` at once — and `checkout-to-app` is the
first step of nearly every job in the repo.

**That argument has one hole, and MB.42 fell into it.** "Exercised by the
checks that use it" only covers the behaviour those checks would notice. Every
job in the repo ran `checkout-to-app` on every push for months while it was
leaving deleted files on disk, and not one of them failed, because a check that
reads a file's _contents_ cannot tell a stale copy from a live one. `checks /
overlay` is the narrow answer: not a smoke check restored, but one job inside
the gate that manufactures the condition its callers cannot produce on demand.
The general lesson is the sweep-task rule's — a mechanism that can be made
_impossible_ to get wrong needs a guard, and "something else would have
noticed" is not one.

**A workflow must never publish a status-check context `pr-gate.yml` also
publishes.** `lint-format-typecheck-check.yml` (M0.16) and
`build-audit-check.yml` (M0.17) did, and MB.15 deleted them. They were written
before `pr-gate.yml` (M0.20) existed, each building its own ad hoc
`testing:smoke-<run id>` image; MB.15 first collapsed both onto
`build-image.yml`, which made the rest plain — they then called the same image
build and the same `lint.yml` / `format.yml` / `typecheck.yml` / `build.yml` /
`audit.yml` with the same inputs as the gate, a strict subset of it. One push to
PR #87 fired three workflow runs and reported `lint / lint`, `typecheck /
typecheck`, `format / format`, `build / build` and `audit / audit` **twice**
each, `build-image / build-image` three times. Duplicate contexts under one
`job / job` name make it ambiguous which run a branch ruleset is gating on —
the cost is the ambiguity, not the minutes.

Deleting them moved one thing that was not duplicated: their path filters listed
`Docker/Dockerfile.node`, and `pr-gate.yml`'s did not. It now lists it on
`lint`, `typecheck` and `build` — the three checks that run _inside_ that image
— and deliberately not in the `*shared` anchor, which also feeds
`destructive_ddl`.

`build-db-image.yml` had the same defect from the other direction: its own
`pull_request` trigger _plus_ an unconditional `build-db-image` job in both
`pr-gate.yml` and `merge-queue.yml`, so any PR touching `src/db/**` ran it
twice. MB.15 dropped the trigger.

The merge queue was never affected. Neither deleted workflow declared
`merge_group:`, and `merge-queue.yml` built each of the three images exactly
once and passed them down as inputs. Its re-running of the gate's checks was a
merge queue verifying the merged result, which is the point of one. That file is
itself gone now (MB.32) until M7.A.1 restores it.

## Database image

- **`POSTGRES_PASSWORD` must never be a Dockerfile `ARG` or `ENV`** — GitHub's
  `SecretsUsedInArgOrEnv` build check flags it. Generate it with `export` inside
  the `RUN` step instead. `POSTGRES_HOST_AUTH_METHOD=trust` was considered as
  the fix and **rejected**: it bakes passwordless auth into the shipped
  `pg_hba.conf`.
- **`Docker/Dockerfile.postgres`** — `FROM postgres:18` with `pg_trgm` (the only
  extension §5 names) and an empty `sorrel_template` database baked in at
  _build_ time, by running the official image's own `docker-entrypoint.sh`
  inside a `RUN` step instead of leaving it to first boot. No schema or seed
  data is baked in, and none will be: M1.27 was specified to extend this
  image with the migrated, seeded template and instead builds that template
  at test-run setup (`tests/support/seeded-database.ts`;
  [`design-decisions/m1.27-template-at-setup-not-in-image.md`](design-decisions/m1.27-template-at-setup-not-in-image.md)),
  so the image's contents depend on nothing under `src/`.
- **`build-db-image.yml`** — builds and publishes it to GHCR, tagged with a
  `hashFiles()` hash of `Docker/Dockerfile.postgres` /
  `Docker/postgres-init/**`. No `latest` tag (MB.17) — nothing in the repo
  ever read it: `docker-compose.yaml` builds the Dockerfile locally rather
  than pulling any tag, and every CI caller pins the hash tag. Its only
  direct triggers are `push` on `staging`/`main` and `workflow_dispatch`. The
  same path list gates the `push` trigger, so "rebuild is skipped" is the
  trigger itself, not a no-op job.

  The `push` trigger's real job is seeding the GHA layer cache
  (`cache-to: type=gha,mode=max,scope=db-image`) for branches that haven't
  built this image yet. That cache is branch-isolated — a `pull_request` run
  writes only to its own merge-ref scope, and reads fall back to the PR's
  base branch and the repo's default branch — so only a push to `staging`
  (every `feature/*` branch's base) or `main` (the default branch) writes an
  entry another branch can restore. Measured: a fully cold build step is
  ~25s, a warm one (including a brand-new feature branch's very first run)
  ~6–8s. `src/db/**` sat in the hash and the path filter from M0.18 to
  M1.27, against the day the schema would be baked in — and since it was
  never in the build context (`Dockerfile.postgres` only `COPY`s
  `Docker/postgres-init`'s SQL), every migration republished byte-identical
  layers under a new tag. M1.27 removed it from both: the template is
  populated at test-run setup, so a migration no longer touches this
  workflow at all, and the image rebuilds only when the Dockerfile or its
  init script changes.

  Two separate mechanisms skip redundant work, one per trigger (MB.18). The
  `push` path filter above is a workflow-level skip — it only gates this
  workflow's own direct triggers, so it protects `push` but not
  `workflow_call`, which bypasses it entirely and is the path every PR takes
  (see below). For that path, `build-db-image.yml` carries the same
  `Check if image already exists` / `docker buildx imagetools inspect`
  step `build-image.yml` and `build-e2e-image.yml` use, skipping
  `Build and push db image` whenever the hash tag is already published.
  Between the path filter and the skip-if-exists check, buildx only actually
  runs when the tag is a genuine miss — on either trigger.

- **`build-db-image.yml` also carries a `workflow_call` trigger** (M1.14,
  alongside its `push`/`workflow_dispatch` triggers — a `workflow_call`
  invocation bypasses `push`'s path filter entirely, so it always runs when
  called, regardless of whether the calling PR touched `src/db/**`), exposing
  an `image` output. The caller is
  `pr-gate.yml`'s own top-level `build-db-image` job —
  built once there and passed down as a `db-image` input to both
  `vitest.yml` and `playwright.yml`, each keying their own
  `services: postgres:` block off it. **Not** `vitest.yml`/`playwright.yml`
  calling `build-db-image.yml` themselves: that was the original M1.14 shape
  and it meant two independent nested `workflow_call`s (each its own
  checkout/docker-login/buildx-setup) for an image the content-addressed tag
  makes identical either way — caught and fixed after the first real
  `pr-gate.yml` run. The `verify-db-image` job that used to prove this
  pattern out standalone (job-level `services:` + `docker exec ... psql -c
'SELECT 1'`, since the image's `host`/TCP auth rules need a password
  generated and discarded at build time while the `local`/Unix-socket rule
  stays `trust`) is gone — `vitest`/`playwright` are the real M1 consumer it
  was scaffolding for, connecting over TCP as the `sorrel` role instead (a
  real, non-discarded password — see
  `Docker/postgres-init/enable-extensions.sql`).

## Deploy

**`deploy.yml`** — CLI-driven Vercel deploy (`vercel pull` → `vercel build` →
`vercel deploy --prebuilt` → `vercel alias`). `vercel.json` sets
`deploymentEnabled: { "**": false }`, so Vercel's Git integration deploys
nothing and this workflow is the only path.

- **Triggers** — push to `main` (`--prod`, `sorrelandsalt.com`); push to
  `staging` (Preview aliased to `staging.sorrelandsalt.com`); and a
  `pull_request` into `main` from a `hotfix/**` head (Preview aliased to a
  per-PR `hotfix-<slug>.sorrelandsalt.com`, URL posted with `pr-comment`, alias
  removed by a `teardown` job on close). The `hotfix/** → staging` PR that
  `create-pr` also opens is skipped (`branches: [main]`).
- `pull_request`, not `pull_request_target` — hotfix branches are never forks.
- The per-hotfix domains need a wildcard `*.sorrelandsalt.com` (Vercel
  nameservers, Hobby-OK).
- Bare `ubuntu-26.04` runner (needs the Vercel CLI, writes `.vercel/output`),
  with `actions/setup-node@v4` **pinned to Node 26.6.0** to match
  `Docker/Dockerfile.node` — under Node 22, `npm ci` fails because npm 10 cannot
  read the npm-11 lockfile for `typescript@7`'s per-platform deps.
- **`VERCEL_DEPLOY_TOKEN` must be minted against the `aurora-arctic` team
  scope**, not a personal scope. A personal-scope token is accepted as valid and
  then fails at `vercel pull` with `Could not retrieve Project Settings…`.
- **`vercel.json`'s catch-all must stay `"**": false`.** Keys are minimatch, so
  `"*"` stops at `/` and would miss `feature/*`; and any single `true` rule wins
  the tiebreak. Re-enabling a branch means adding a key, never loosening the
  catch-all.
- A guard step skips every real step unless `VERCEL_DEPLOY_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_SCOPE` are set. The first
  three are set as repo secrets; **`VERCEL_SCOPE` is not**, so the guard still
  skips and no deploy has run for real yet. MB.12 owns setting it, alongside
  `NEON_API_KEY`/`NEON_PROJECT_ID` for `migrate.yml` — `claude-docs/secrets.md`
  is the matrix and the source of truth for which rows are set.
- **`migrate.yml` (M1.4)** — reusable (`workflow_call`-only) workflow, applying
  `npm run db:migrate` against the environment's `DATABASE_URL`. `deploy.yml`
  splits its old single `deploy` job into three: `resolve-target` (the old
  "Resolve deploy target" step, now standalone since both later jobs need its
  output), `migrate` (`needs: resolve-target`, calls this workflow with
  `secrets: inherit`, and carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock so two merges never migrate at
  once), and `deploy`. Same guard-skip stub as `deploy.yml` when the `VERCEL_*` secrets
  are absent. `vercel pull --environment=<preview|production>` resolves the
  right `DATABASE_URL` for each target the same way `deploy.yml`'s own pull
  does — the branch-scoped override for `staging`, the integration's
  per-deployment ephemeral Neon branch for a hotfix preview (see
  `claude-docs/design-decisions/m1.1-neon-branch-strategy.md`) — read from
  `.vercel/.env.<environment>.local` and masked before use.
- **The reference seeds (M4.3, M4.3a) are one step inside `migrate.yml`, not a
  workflow of their own.** After the migrations, `npm run db:seed:categories`
  and `npm run db:seed:forms` write DESIGN.md §6's category vocabulary and §5's
  ingredient form vocabulary into the schema they just created, when the
  `seed-reference` input says so. One step for both, sharing a gate, a log and
  a summary: a form vocabulary seeded while the categories failed is not a
  state worth reporting separately. It is how either vocabulary reaches staging
  and production at all: deploys are CI-only and there is no shell on either
  database, so reference data has to arrive with the deploy that needs it.
  A separate reusable workflow was written first and then folded in — it
  needed exactly what the migration needs and nothing else (a checkout,
  `npm ci`, the Vercel CLI, the same pulled `DATABASE_URL`), so it paid for
  all of that a second time to run one `npm run`, and needed its own
  concurrency lock against `migrate` to avoid seeding a schema mid-migration.
  Sharing the job makes that ordering structural. The two still report
  separately — one `job-summary` call each — so a failed seed does not read as
  a failed migration, and a failed seed blocks `deploy` for free, because it
  fails the job `deploy` already depends on.
- **`deploy.yml` gains one job, `seed-changed`**, which diffs
  `github.event.before`..`github.sha` over the seeds' own files
  (`src/db/seed/categories.ts`, `src/db/seed/forms.ts`,
  `src/db/seed/bootstrap-admin.ts`, `src/lib/slugify.ts`, `scripts/db-seed.ts`)
  and hands `migrate` the answer — one gate for both vocabularies, so a change
  to either runs both.
  Two things about it are load-bearing. It carries **no job-level `if:`**: a
  skipped dependency skips its dependents, so gating the job on
  `github.event_name == 'push'` would take every hotfix preview deploy down
  with it — non-push events answer `changed=false` from inside the step
  instead. And an unusable `before` (a new branch, or a force-push past what
  the runner fetched) seeds rather than guesses: the seed is additive, so a
  false positive costs one extra `npm run` where a false negative is an empty
  vocabulary in production.

## Running CI locally

**`.actrc` + `make act-*`** — run the reusable checks through
[`act`](https://github.com/nektos/act) against a locally-built
`Docker/Dockerfile.node` `testing` image (`act-image`). `.actrc` carries
`-P ubuntu-26.04=catthehacker/ubuntu:act-latest` and `--pull=false`.

- **One target covers every `checks.yml` leg** (MB.32), where there was one per
  check workflow before the collapse: `make act-check` runs lint,
  `make act-check CHECK=typecheck` runs typecheck, and so on through `format`,
  `build`, `audit` and `destructive-ddl` (MB.37). `--matrix name:<leg>` is what
  keeps `act` from running all six, and `make act-test` chains lint, format,
  typecheck and destructive-ddl.
- `make act-cache-checkout` pre-clones this repo's `main` so the remote
  `checkout-to-app@main` ref resolves offline.
- **`make act-overlay` is its own target** (MB.42), because `act-check` is
  `-j check --matrix name:<leg>` and `overlay` is a second job rather than a
  seventh leg. It needs no `act-cache-checkout` — it reaches the action as
  `./.github/actions/checkout-to-app`, which is the point of it. It is
  deliberately **not** in `act-test`: its closing assertion is that `/app`
  matches the checkout exactly, and `act` runs against the working tree rather
  than a commit, so a dirty tree fails it for a reason that has nothing to do
  with the action.
- **act does not apply `workflow_call` input defaults**, so a flag arrives
  empty under `-W`. `act-check` needs none passed: `checks.yml` resolves an
  empty flag to true precisely so a local run cannot quietly skip the work it
  was asked to do.
- **`CHECK=build` and `CHECK=audit` are expected to fail locally**, and neither
  is in `act-test`. The build leg wants `actions/cache@v6` pre-cached the way
  `act-cache-checkout` pre-caches `checkout-to-app`; the audit leg wants a real
  PR to comment on.
- **`CHECK=destructive-ddl` scans nothing locally, and that is the honest
  outcome rather than a gap** — its `destructive-ddl-files`/`pr-body` inputs
  come from `pr-gate.yml`'s `changes` job and the real
  `github.event.pull_request.body`, neither of which exists under a bare
  `act -W ... --matrix name:destructive-ddl` invocation. Both arrive empty,
  `checks.yml` sets `DESTRUCTIVE_DDL_FILES` from the input regardless, and the
  script reads set-but-empty as "no migrations changed". So the leg proves the
  wiring, not the scan. What proves the scan is
  `tests/guards/destructive-ddl-check.test.ts` (the rules, the file-list
  resolution and the branch diff, each asserted to fail with its guard
  removed) and `npm run check:destructive-ddl -- --self-test` (the ack-line
  gating, against the fixtures under `scripts/__fixtures__/destructive-ddl/`).
  Before MB.37 this target claimed to fall back to scanning every committed
  migration; it never did — the workflow always exported the variable.
- **`act-vitest` / `act-playwright` still do not exist**, even though
  `vitest.yml`/`playwright.yml` landed in M1.14. Unlike the `checks.yml` legs
  (single job, every input passed directly), both take a `db-image` input that
  only exists because their caller (`pr-gate.yml`) has its own real
  `build-db-image`/`build-e2e-image` jobs upstream of them — `act -W ... -j
vitest` would have to either execute `build-db-image.yml` for real (a
  genuine GHCR push, not something `--action-offline-mode` supports) or
  fabricate a `db-image`/`image` input by hand, and act needs new local-only
  plumbing this repo doesn't have a pattern for yet. Left unresolved rather
  than shipped in a form nobody could verify actually works.
- **Every new reusable check workflow ships its `act-<name>` target in the same
  PR**, plus an `act-cache-*` pre-clone for any action that isn't cached yet
  — except where that isn't possible yet, as above. A new `checks.yml` leg
  needs no new target: it is `make act-check CHECK=<leg>` the day it lands. A
  new `checks.yml` **job** does need one, as `overlay` did.
