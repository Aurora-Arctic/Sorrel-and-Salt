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
  `cp -a "$GITHUB_WORKSPACE"/. /app/`. Every other local action resolves as
  `./.github/actions/<name>` once checked out; this one runs _before_ that
  checkout exists, so **callers must reference it by full
  `Aurora-Arctic/Sorrel-and-Salt/...@main` path**.
  - **Copy-only is sufficient because the image carries no source** (MB.42).
    `cp -a` overlays and never deletes, which is safe only when there is
    nothing underneath for a stale file to survive _as_: `Dockerfile.node`
    copies in the two manifests, runs `npm ci`, and stops, so `node_modules` is
    all the image contributes to `/app` and the checkout is the only source a
    job ever sees. Until MB.42 both `Dockerfile.node` and `Dockerfile.e2e`
    baked the whole repo in with `COPY . .`, and every file dropped from the
    repo since the image was last built stayed on disk after the overlay —
    untracked, not gitignored, and indistinguishable to `oxlint`, `tsc` or a
    `tests/**` glob from a file the branch actually had. That layer was
    shadowed by the `..:/app` bind mount in every compose service and in the
    devcontainer; CI was its only reader, and there it was the bug.
  - **`tests/guards/image-source-layer.test.ts` is what keeps it that way.**
    It parses every `COPY`/`ADD` in both Dockerfiles and checks each source
    against a per-file allowlist — the two manifests, plus
    `Docker/playwright-entrypoint.sh` for `Dockerfile.e2e`'s `headed` stage. An
    allowlist rather than a `.` denylist: `COPY src src` is as much a source
    layer as `COPY . .`, and a new COPY is a decision, not a convenience. The
    guard runs in CI's `vitest` job, so a source layer re-added tomorrow fails
    in the diff that adds it rather than on the next PR that deletes a file.
    And the fix is live on the PR that makes it: `pr-gate.yml` builds the
    image under a tag hashed from `Dockerfile.node` and `package-lock.json`,
    so a Dockerfile change runs on its own image — unlike an edit to this
    action, which every caller resolves at `@main`.
  - Found by MB.41, whose new test-location guard failed on its first CI run
    reporting 34 test files outside `tests/` — every one of them that move's own
    predecessor, still sitting where the image had baked it. The count is the
    tell: 34, not that branch's 39, because the image predated the five test
    files added since. The guard was changed to scan the git index instead,
    which is right on its own merits and left the condition itself untouched
    until MB.42.
- **`job-summary`** — a pass/fail `$GITHUB_STEP_SUMMARY` callout, with a tailed
  log excerpt on failure.
- **`pr-comment`** — upserts one marked comment per check (`<!-- ci-<slug> -->`),
  in `minimize` (resolve-on-pass) or `comment` (always post) mode, plus a
  separate fail-only thread for `merge-queue: true` callers.

## Container jobs

`checks.yml`, `vitest.yml` and `playwright.yml` all run their work inside a
`container:` built from a GHCR image, with `defaults.run.working-directory:
/app`. Four things about that shape are load-bearing and none of them is
visible from the step that depends on them.

- **`defaults.run.shell: bash` is not cosmetic.** A `container:` job defaults
  to `sh`, unlike a plain `runs-on` job
  ([docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)),
  and dash has no `set -o pipefail` — which every `… | tee output.log` step
  relies on to report the tool's exit status rather than `tee`'s.
- **`options: --user root` on the `testing` image jobs.** That image's default
  user is `node`, which cannot write the runner's bind-mounted
  `_temp/_runner_file_commands` directory — `actions/checkout`, and any JS
  action using `core.saveState`/`setOutput`, fails `EACCES` without it.
- **Guards that shell out to git pass `-c safe.directory=*`.** Those root jobs
  run over a checkout owned by uid 1000, and git refuses a repository owned by
  another user ("dubious ownership") unless told the directory is safe.
- **`playwright.yml` passes `options: --ipc=host` instead.** Chromium crashes
  on the container default 64 MB `/dev/shm`. Microsoft's Playwright base image
  already runs as root, so `--user root` would add nothing there; Chromium
  under root expects `--no-sandbox`, which `playwright.config.ts` owns if it
  ever launches non-headless — the headless default here does not need it.
- **Every path a step hands to another step is the absolute `/app` one.**
  `checkout-to-app` populates both `$GITHUB_WORKSPACE` (what `hashFiles()`
  reads) and `/app` (where the job's commands actually run), so a
  workspace-relative log file, cache path or `--outputFile` resolves against
  the wrong one.

**`checks.yml`'s `name: ${{ matrix.name }}` is load-bearing too.** Without it
every leg reports as `checks / check (lint)` rather than `checks / lint` — the
matrix's generated job name, not the leg's.

## Reusable checks (`workflow_call`, never triggered directly)

- **`checks.yml`** (MB.32) — one matrix job running `lint`, `format`,
  `typecheck`, `build` and `audit`, each reporting as `checks / <name>`. These
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

- **`checks / destructive-ddl`** (M1.5, a `checks.yml` leg since MB.37) —
  flags destructive DDL in migration files new or changed in the PR, via
  `scripts/check-destructive-ddl.ts`, and fails unless each flagged migration
  carries an acknowledgement sidecar beside it — `src/db/migrations/<tag>.ack.md`
  holding a `Destructive DDL acknowledged: <reason>` line (MB.48). The forms:
  any `DROP` except
  `DROP NOT NULL` and `DROP DEFAULT` (which widen), `RENAME`,
  `ALTER COLUMN ... TYPE`, `SET NOT NULL`, and `ADD COLUMN ... NOT NULL` with
  no `DEFAULT` — see `claude-docs/db.md`'s Migrations section for the policy.
  Blocking, like `lint`/`typecheck`.
  - **It needs one thing a `workflow_call` file cannot read off its own
    trigger**, which is why it has an input where the other legs have none: the
    changed-migration-file list, since only the caller sees
    `github.event.pull_request`. It comes from `changes`'s
    `dorny/paths-filter` step (`list-files: json`, reused rather than adding a
    second changed-files action) as `destructive-ddl-files`, and `checks.yml`
    puts it into the job `env` as `DESTRUCTIVE_DDL_FILES`, inert in the other
    five legs. The list comes from a separate, narrower
    `destructive_ddl_migrations` filter (`src/db/migrations/*.sql` only)
    rather than from `destructive_ddl`'s own `_files` output: paths-filter
    lists every changed file matching _any_ of a filter's patterns, so the
    wider filter's list would hand a changed `pr-gate.yml` or `checks.yml` to
    the script as if it were SQL, and `*.sql` keeps Drizzle's `meta/*.json`
    out as well.
  - **It took the PR body as a second input until MB.48**, as `pr-body` →
    `DESTRUCTIVE_DDL_PR_BODY`. Both are gone. A PR body is visible from one
    branch base and gone on merge, so a release PR — which the script sends at
    `origin/main`, rescanning every migration since the last release — saw none
    of the acknowledgements that let those migrations land; release 0.2.0's PR
    failed this leg for exactly that reason and was merged past it. And one
    line in a body blessed every finding in the diff whatever file it was in.
    The PR-body path is retired rather than OR-ed with the sidecar, since an
    `OR` would keep the uncorrelated hole open. **The leg now reads nothing
    from GitHub but the file list**, so `make act-check CHECK=destructive-ddl`
    proves the scan rather than the wiring, and
    `npm run check:destructive-ddl -- --all` is a usable audit instead of
    permanently red.
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
    That same window is why `0002` has no acknowledgement in its own PR (#73)
    and its sidecar had to be written retroactively.
  - Its `run-destructive-ddl: false` path exists for a merge-queue caller (same
    reason as `gitflow`'s `should-run` — `merge_group` has no diffable source
    ref, so it can only trust that `pr-gate.yml` already gated the PR before it
    reached the queue). `merge-queue.yml` was that caller until MB.32 deleted
    it.

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
- **`vitest.yml`'s second step (M1.28)** — `npm run test:stories`, the
  acceptance suite on `vitest.stories.config.mts`, run after the coverage
  step with `always()` and no `--coverage` of its own, so a story never
  counts toward the 80% threshold (`claude-docs/testing.md`). Its reporter
  writes the checklist as JSON (`--outputFile=/app/stories.json`) and
  `.github/scripts/summarize-stories.mjs` renders it — "3 of 45 stories
  passing" and a markdown checklist — into a second job-summary section and a
  second PR comment thread (`marker-slug: stories`). A failing story fails
  the job; M2.1 decides how a deliberately red scaffold is tolerated.
  `pr-gate.yml`'s `vitest` filter lists `vitest.stories.config.mts` and the
  script, so editing either reruns the job.
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
  `build-image`) and `build-db-image` do the same under their own groups.
  The three image jobs are the only uncancellable ones because cancelling a
  push mid-build can freeze a half-written layer into the shared GHA layer
  cache under its content-addressed tag, which every later run with the same
  hash then reuses — a corruption that does not self-heal on retry. The check
  jobs share no mutable state and are cheap to rerun, so they stay cancellable.
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
reads a file's _contents_ cannot tell a stale copy from a live one. The answer
is not a job. MB.42 built one first — a `checks / overlay` that planted stale
files in `/app` and asserted a `git clean` step removed them — and replaced it
on the same PR with an image that carries no source layer, so the overlay has
nothing to delete and a stale file has nothing to survive as, plus
`tests/guards/image-source-layer.test.ts`, which fails the diff that re-adds
one. The general lesson is the sweep-task rule's — a mechanism that can be
made _impossible_ to get wrong needs a guard, and "something else would have
noticed" is not one — and so is the tell: the job made stale files _absent_,
the image makes them _impossible_.

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
  The alias slug is `hotfix/<slug>` lowercased, non-`[a-z0-9-]` collapsed to
  `-`, and **truncated to 56 characters** — the DNS label limit is 63 and
  `hotfix-` spends 7 of them. `deploy.yml` builds it twice: in
  `resolve-target`, and again in `teardown`, which recomputes it from
  `github.head_ref` because a closed PR runs no `resolve-target` to read it
  from. Dropping the alias on close is what keeps stale per-hotfix domains
  off the Hobby 50-domain cap.
- Bare `ubuntu-26.04` runner (needs the Vercel CLI, writes `.vercel/output`),
  with `actions/setup-node@v7` **pinned to Node 26.6.0** to match
  `Docker/Dockerfile.node` — under Node 22, `npm ci` fails because npm 10 cannot
  read the npm-11 lockfile for `typescript@7`'s per-platform deps. The Vercel
  CLI is pinned with it: `npm install --global vercel@59`, in both jobs.
- **`VERCEL_DEPLOY_TOKEN` must be minted against the `aurora-arctic` team
  scope**, not a personal scope. A personal-scope token is accepted as valid and
  then fails at `vercel pull` with `Could not retrieve Project Settings…`.
- **Every _preview_ `vercel pull` passes `--git-branch`, and no production one
  does** (MB.27, narrowed by MB.45). Vercel resolves a branch-scoped
  environment variable only when the pull names the branch, and `staging`'s
  `DATABASE_URL` is precisely such a variable — the override that keeps staging
  off the Neon integration's per-preview ephemeral branches
  (`claude-docs/design-decisions/m1.1-neon-branch-strategy.md`). Drop the flag
  and nothing fails: the pull succeeds, the deploy succeeds, and both the build
  and the migration quietly address whichever database the integration last
  injected Preview-wide. **Pass it on production and everything fails** —
  branch-scoped overrides are a Preview-only feature, and the API rejects the
  pair outright with
  ``Invalid request: `target` must be "preview" when specifying a `gitBranch` ``.
  MB.27 passed it unconditionally and broke every production
  deploy until MB.45; production has no branch-resolved value to miss, so it
  loses nothing by omitting it.

  Each workflow therefore pulls through **two steps, one per target**, selected
  by a YAML `if:` on the resolved environment — not one command with an
  optional flag. A command that merely _might_ carry `--git-branch` cannot
  satisfy the preview half, and a `if:` is data the guard can read where a
  shell `if` would be a string it had to parse. Each arm tests `== 'preview'`
  or `== 'production'` rather than `!= 'production'`, so a third environment
  name skips both arms and fails by name at the assertion step rather than
  pulling the wrong one. `resolve-target` emits a
  `git_branch` output alongside `environment` — `github.head_ref` for a hotfix
  PR (`ref_name` there is the `refs/pull/N/merge` ref, which nothing is scoped
  to), `github.ref_name` for a push — and hands it to both the deploy job's
  preview pull and `migrate.yml`'s `git-branch` input, which stays **required**
  of every caller even though production ignores it: a caller that cannot name
  its branch cannot be trusted with preview either.
  `tests/guards/vercel-pull-git-branch.test.ts` is the guard. It sweeps every
  workflow and checks both halves — the flag present on preview, absent on
  production, and each arm's `if:` naming the same target its command does —
  so the next `vercel pull` added on either side fails in the diff that adds
  it.

- **The `deploy` step passes `--meta githubDeployment=1 --meta
githubCommitRef=<branch>`** — the deploy-side half of the same fix, and
  equally load-bearing. `--git-branch` fixes what the **build** pulls; the
  running deployment resolves its own environment from its **branch
  association**, which the CLI infers from the local checkout — and
  `actions/checkout` leaves a detached HEAD, which has none. So without the
  metadata the deployed app reads the Preview-wide `DATABASE_URL` no matter how
  the build was pulled, and `src/db/connection.ts` reads that variable at
  runtime. Vercel's own docs pair the two commands for exactly this
  prebuilt-in-CI case. A production deploy uses Production settings regardless
  of the metadata, so `main` carries it harmlessly rather than branching the
  command.
- **`vercel.json`'s catch-all must stay `"**": false`.** Keys are minimatch, so
  `"*"` stops at `/` and would miss `feature/*`; and any single `true` rule wins
  the tiebreak. Re-enabling a branch means adding a key, never loosening the
  catch-all.
- A guard step skips every real step unless `VERCEL_DEPLOY_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` are set. All three are set as repo
  secrets, so **the guard passes and deploys run for real** — as of v0.2.0 both
  `staging` and `main` reach `vercel pull`. `VERCEL_SCOPE` is **not** part of
  the guard and never was; it is still unset, and MB.12 owns it alongside
  `NEON_API_KEY`/`NEON_PROJECT_ID` for `migrate.yml`'s production snapshot.
  `claude-docs/secrets.md` is the matrix and the source of truth for which rows
  are set.
- **`migrate.yml` (M1.4)** — reusable (`workflow_call`-only) workflow, applying
  `npm run db:migrate` against the environment's `DATABASE_URL`. `deploy.yml`
  splits its old single `deploy` job into three: `resolve-target` (the old
  "Resolve deploy target" step, now standalone since both later jobs need its
  output), `migrate` (`needs: resolve-target`, calls this workflow with
  `secrets: inherit`, and carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock so two merges never migrate at
  once), and `deploy`, whose `if: success()` is load-bearing: a custom `if:`
  on a job with `needs:` replaces the implicit needs-all-succeeded check, so
  any other condition there would let a failed `migrate` through to the
  deploy. Same guard-skip stub as `deploy.yml` when the `VERCEL_*` secrets
  are absent. `vercel pull --environment=preview --git-branch=<branch>`, or
  `vercel pull --environment=production` with no branch (MB.45), resolves the
  right `DATABASE_URL` for each target the same way `deploy.yml`'s own two
  pulls do — the branch-scoped override for
  `staging`, the integration's per-deployment ephemeral Neon branch for a
  hotfix preview (see
  `claude-docs/design-decisions/m1.1-neon-branch-strategy.md`) — read from
  `.vercel/.env.<environment>.local` and masked before use. Both halves of that
  come from `resolve-target`: `git-branch` is a **required** `workflow_call`
  input, so a caller that cannot say which branch it is migrating fails to
  start rather than migrating the wrong database. M1.1's "Cross-task impact"
  requires the two workflows to resolve `DATABASE_URL` identically, and that is
  the requirement in mechanical form.
- **`DATABASE_URL` and `BETTER_AUTH_SECRET` come from GitHub secrets, not from
  the pull** (MB.47). Both are marked Sensitive in Vercel, and a Sensitive
  variable cannot be read back by `vercel pull` — the pull writes the literal
  string `[SENSITIVE]` instead, which is non-empty and so passes any check that
  only asks whether something is set. A diagnostic run pulled staging both with
  and without `--git-branch` and got the placeholder either way, so no
  arrangement of flags fixes it. A `${{ secrets.X }}` reference to a secret
  that does not exist resolves to the empty string rather than failing, so a
  misspelt name reads as an unset value; the guard pins the names in use.

  `migrate.yml` picks `DATABASE_URL_PRODUCTION` or `DATABASE_URL_STAGING` — the
  first by the Vercel environment, the second by the branch — and falls back to
  the pulled `POSTGRES_URL` for a hotfix preview, whose Neon branch is created
  per deployment and which no static secret can name. `deploy.yml` makes the
  same choice and writes the result **into the pulled dotfile**, because
  `vercel build` reads the file and a step-level `env:` would not reach the
  Next build. `tests/guards/ci-secret-environments.test.ts` holds the two
  selections together: choosing differently would migrate one database and
  serve another.

  Named secrets rather than GitHub Environments, deliberately — an environment
  would need a new `workflow_call` input, a new `resolve-target` output and an
  `environment:` key on two jobs, to say what the secret's name already says.
  `claude-docs/secrets.md` carries the rotation rule this creates, and the
  Neon-API route that would retire it once MB.12 sets `NEON_API_KEY`.

- **Both jobs assert the pulled environment before using it** (MB.46), via
  `scripts/assert-pulled-env.ts`. It does two things. It **asserts** the keys
  that job needs, failing with a named cause (missing · empty · placeholder ·
  not a postgres URL · scheme without `user@host/database` · surviving quotes
  or whitespace · a libpq client-only parameter, MB.49) rather than letting the
  value reach a consumer that cannot describe it. `deploy` requires
  `DATABASE_URL` and `BETTER_AUTH_SECRET`, both of which the override step
  above has just written into the file. `migrate` requires **nothing** and runs
  report-only: since MB.47 its `DATABASE_URL` no longer comes from this file on
  either long-lived target, so requiring it here would fail on a value nothing
  reads. What that job validates instead is the **resolved** URL, one step
  later — see the probe below.

  And it **reports** every key the pull
  returned, with a classification and its length, never a value; that report
  prints even when the run is about to fail.

  The report is the half worth having. CI previously could not answer "what did
  the pull actually return?" — `migrate.yml` masked the value before anything
  could print it, and `deploy.yml` never read the file at all, handing it
  straight to `vercel build`. So MB.27 dropping variables produced
  `ERR_INVALID_URL` with the input shown as `***` in one job and
  `BETTER_AUTH_SECRET is not set` in the other, and neither said which
  variables had survived the pull. Key names are not secret —
  `claude-docs/secrets.md` enumerates them — and that no value is ever printed
  is asserted in `tests/guards/pulled-env-assertion.test.ts` rather than
  intended. The same file sweeps the workflow directory, so a `vercel pull`
  added without an assertion beside it fails in the diff that adds it.

  Why `deploy` needs `BETTER_AUTH_SECRET` in particular: `vercel build` runs
  `next build` with `NODE_ENV=production`, which traces
  `/api/auth/[...all]` → `src/lib/auth.ts` → `src/db/connection.ts`.
  `auth.ts` throws on an unset secret, and `connection.ts` calls `postgres()`
  at module scope, which parses its URL eagerly. A placeholder is therefore not
  harmless to a build that issues no query.

- **Both jobs then open the connection, before anything consumes it** (MB.49),
  via `scripts/probe-database.ts`. It reads a connection string from a file,
  connects, and runs `select 1`; on success it prints the role, database and
  server version that answered, and on failure the driver's own error code and
  message — scrubbed of the credentials, never the URL.

  It exists because `drizzle-kit migrate` catches whatever postgres.js throws
  and exits 1 without printing it. A failed staging migration said exactly
  this, and nothing else:

  ```
  Using 'postgres' driver for database querying
  [⣟] applying migrations...
  ##[error]Process completed with exit code 1.
  ```

  Reproduced locally, an unreachable host, a wrong password, an `sslmode`
  mismatch and a `channel_binding` parameter **all produce that byte-identical
  output**. Four different fixes, one indistinguishable failure — which is why
  MB.45, MB.46 and MB.47 each ended on a hypothesis rather than a diagnosis.
  `ECONNREFUSED`, `ENOTFOUND`, `28P01`, `3D000` and `42704` now each name
  themselves, and the codes worth a sentence carry one.

  **It is fatal in `migrate` and advisory in `deploy`, deliberately.** A
  migration cannot proceed without a connection, so a probe that warned there
  would leave the job as silent as it was. A build genuinely does not need the
  database — it parses the URL without issuing a query — so failing a deploy on
  a transient blip would trade one outage for another; what the warning buys is
  that a deploy about to serve 500s says so at build time.
  `tests/guards/database-probe.test.ts` asserts the two apart, and sweeps the
  workflow directory so a job that migrates or builds without probing first
  fails in the diff that adds it.

  **In `migrate` it reads the resolved URL, not the pulled file**, and that is
  the point rather than a detail. MB.46 validated what `vercel pull` wrote;
  MB.47 then took `DATABASE_URL` from a GitHub secret instead and handed it
  straight to drizzle-kit, reopening the gap one task after it closed. So
  `Resolve DATABASE_URL` now writes whichever value won to
  `$RUNNER_TEMP/resolved.env` under `umask 077`, and the probe reads that —
  secret or pulled `POSTGRES_URL` alike. The value reaches the script as a file
  path for the same reason MB.46's does: argv is visible to `ps` and echoed by
  `set -x`, and a step-level `env:` is printed in that step's own env block.

  **`channel_binding` has its own rule**, in the validator rather than the
  probe, so it fails before a connection is even attempted. postgres.js
  consumes `sslmode` and the keys in its own `defaults`, then forwards every
  remaining query parameter to the server as a **startup parameter** — so a
  libpq _client-side_ option reaches a server that has never heard of it and
  gets `42704 unrecognized configuration parameter "channel_binding"`. Neon's
  console puts it in the connection strings it hands you by default, which is
  why it is worth a named rule rather than a note; `sslmode=require` on its own
  is fine and is what actually requests TLS.

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

## Neon snapshots

- **`migrate.yml` snapshots production before it migrates it** (M1.6), by
  branching Neon's `main` branch as `snapshot-<short sha>` through the Neon
  API. That branch is the known-good point
  [`db.md`](db.md)'s restore runbook promotes back to if a migration corrupts
  data. Preview never snapshots — a staging or hotfix database is already
  disposable. The step is guarded on `NEON_API_KEY`/`NEON_PROJECT_ID` and
  warns rather than fails while they are unset (`claude-docs/secrets.md`).
- **`neon-snapshot-prune.yml` is the only scheduled workflow in the repo** —
  Sundays at 06:00 UTC, outside any deploy window, plus `workflow_dispatch`.
  Nothing calls it. **Neon's free tier caps a project at 10 branches in
  total**, and `production`, `staging`, every retained snapshot and every open
  hotfix preview's ephemeral branch draw on that one quota, so `snapshot-*`
  branches cannot be left to accumulate: the workflow keeps the newest
  `KEEP_SNAPSHOTS` (3) and deletes the rest. It carries the same
  warn-and-skip secrets guard.

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
  typecheck and destructive-ddl. `act-image` builds the `testing` target
  locally under the exact tag the job's required `image` input names, so
  `docker run` never reaches GHCR and the container `credentials:` block is a
  no-op — which is why `act-check` passes a dummy `GITHUB_TOKEN` rather than
  a real one.
- `make act-cache-checkout` pre-clones this repo's `main` so the remote
  `checkout-to-app@main` ref resolves offline.
- **act does not apply `workflow_call` input defaults**, so a flag arrives
  empty under `-W`. `act-check` needs none passed: `checks.yml` resolves an
  empty flag to true precisely so a local run cannot quietly skip the work it
  was asked to do.
- **`CHECK=build` and `CHECK=audit` are expected to fail locally**, and neither
  is in `act-test`. The build leg wants `actions/cache@v6` pre-cached the way
  `act-cache-checkout` pre-caches `checkout-to-app`; the audit leg wants a real
  PR to comment on.
- **`CHECK=destructive-ddl` still scans nothing locally, and that is the honest
  outcome rather than a gap** — but for one reason now rather than two. Its
  `destructive-ddl-files` input comes from `pr-gate.yml`'s `changes` job, which
  does not exist under a bare `act -W ... --matrix name:destructive-ddl`, so it
  arrives empty; `checks.yml` sets `DESTRUCTIVE_DDL_FILES` from the input
  regardless, and the script reads set-but-empty as "no migrations changed".
  The `pr-body` input is gone entirely (MB.48), so the leg no longer depends on
  a real `github.event.pull_request.body` — which is what makes the scan
  provable locally at all: `npm run check:destructive-ddl -- --all` now reads
  every acknowledgement from the repository itself and is green, where it was
  permanently red while they lived in PR bodies. What proves the leg's own
  gating is `tests/guards/destructive-ddl-check.test.ts` (the rules, the
  file-list resolution, the branch diff and the per-file sidecar correlation,
  each asserted to fail with its guard removed) and
  `npm run check:destructive-ddl -- --self-test` (the sidecar gating, against
  the fixtures under `scripts/__fixtures__/destructive-ddl/`).
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
  new `checks.yml` **job** would need one — `act-check` is
  `-j check --matrix name:<leg>` and reaches only the matrix job.
