## Reusable checks (`workflow_call`, never triggered directly)

- **`checks.yml`** (MB.32) — one matrix job running `lint`, `format`,
  `typecheck`, `build` and `audit`, each reporting as `checks / <name>`. One
  workflow, because the legs share their inputs, their
  `container: image: ${{ inputs.image }}` job (`options: --user root`) and
  their checkout, `job-summary` and `pr-comment` scaffolding, and differ in
  one npm script and one summarising step (MB.32 collapsed the five
  workflows they were).
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
  - **`run-lint` / `run-typecheck` / `run-build` / `run-destructive-ddl` /
    `run-migration-order` are the path-filter inputs**, one per filtered leg. `format` has none and always runs,
    since Prettier covers non-code files; `audit` has none because it is
    non-blocking and PR-only. The first step resolves the five down to one flag
    for the leg it is running, and treats an empty flag as true — so `act`,
    which applies no `workflow_call` input defaults, cannot report a check it
    never ran.
  - **`build`'s extras**: `DATABASE_URL`/`BETTER_AUTH_SECRET`, and
    `npm run workshop:build` chained onto `npm run build` with `&&`, which
    short-circuits the same way separate steps would. It posts no PR comment.
    - **It keeps no build cache** (MB.235). Until then an `actions/cache` step
      restored and saved `/app/.next/cache`, keyed `nextjs` on the lockfile
      and the source. Only pull requests ever ran it, so every save landed
      under a merge ref no other pull request can read, and it never restored
      once. On 11 October 2026 it held 39 entries, 6 GB of the 11.2 GB the
      repo had cached against GitHub's 10 GB allowance, so it competed for
      space, under eviction by last use, with the e2e entries pull requests
      do read.
      A warm Turbopack cache does save time (`npm run build` in the
      devcontainer: 24–30s cold, 8–10s warm), but a save from `staging` would
      mean a second set of `checks.yml` legs on every push there, and this
      leg is not on the gate's critical path ([Runner
      budget](runner-budget.md)), so the save bought nothing a pull request
      waits for.
    - **The `testing` stage still carries GNU `tar` and `zstd`** (MB.37),
      which `actions/cache` needed inside the container, where the Alpine
      image's busybox `tar` rejects `--posix`. No step in that image uses
      them now; they go the next time `Docker/Dockerfile.node` changes.
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
    vocabulary has no way to say. Its "Fix available" column compares npm's
    suggested version with the lockfile's, through
    `.github/scripts/lib/audit-fix.cjs`: when no patched release exists,
    `npm audit` can name an older major as the fix, and that reads as
    "No — downgrade only". The same script writes the same callout to
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
  no `DEFAULT` — see `claude-docs/db/expand-contract.md` for the policy.
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
  - **The leg reads nothing from GitHub but the file list.** The
    acknowledgement is the sidecar, never a PR-body line — why, and the
    `pr-body` input MB.48 retired, are `claude-docs/db/expand-contract.md`'s —
    so `make act-check CHECK=destructive-ddl` proves the scan rather than the
    wiring, and `npm run check:destructive-ddl -- --all` is a usable audit
    instead of permanently red.
  - **`DESTRUCTIVE_DDL_FILES` is always set, even to an empty string.** The
    script reads set-but-empty as "no migrations changed, scan nothing" and
    _unset_ as "work out what this branch changed from git" — the second is a
    local convenience and must never be what CI does.
  - ⚠️ **It is a leg, not a job of its own, so it cannot be dropped without
    the matrix noticing.** As a separate job it was deleted by MB.32 and ran on
    nothing from 2026-09-17 until MB.37, PRs #104–#107 and migrations `0005`
    and `0006` included, while the `changes` job kept computing its filters and
    nothing looked wrong. MB.37 has that window and what it fixed besides; it is also
    why `0002`'s sidecar was written retroactively
    (`claude-docs/db/expand-contract.md`).
  - Its `run-destructive-ddl: false` path exists for a merge-queue caller (same
    reason as `gitflow`'s `should-run` — `merge_group` has no diffable source
    ref, so it can only trust that `pr-gate.yml` already gated the PR before it
    reached the queue). None exists until M7.A.1 restores `merge-queue.yml`.

- **`checks / migration-order`** (MB.173) — refuses a migration journal
  Drizzle's migrator would apply out of order, via
  `scripts/check-migration-order.ts`: an entry the PR adds that sits ahead of
  one its base has, or is dated no later than the base's newest, or a journal
  whose `when` fails to rise. Why it matters, and the regenerate step a
  refusal asks for, are [`db/migrations-and-scripts.md`](../db/migrations-and-scripts.md),
  "Migration order". Blocking, like `destructive-ddl`.
  - **It needs the base's journal, which the checkout lacks.** The checkout is
    the PR's merge commit at depth 1, so the leg fetches the base branch at
    depth 1 itself and passes `--base origin/<base>`. Which branch is the base
    is the caller's to say, as `destructive-ddl`'s file list is:
    `pr-gate.yml` passes `github.base_ref` as `migration-order-base`, put
    into the job `env` as `MIGRATION_ORDER_BASE`, and empty means `staging`,
    which is what `act` gets. Its fetch passes `-c safe.directory=*` for
    the reason the git-reading guards do
    ([`container-jobs.md`](container-jobs.md)).
    ⚠️ The command is CI's alone: its `--depth=1` fetch in a full clone marks
    the base's commit shallow, and `git merge` then refuses the base as
    unrelated history until `git fetch --unshallow`. Locally the check is
    `npm run check:migration-order`, against the base as last fetched.
  - **Its filter is the journal**, `src/db/migrations/meta/_journal.json`,
    plus what runs the check; a PR that adds no entry cannot misorder one.
    The base's own moves are not a trigger: a branch whose base moved after it
    passed is checked again on its next push.

- **`build-image.yml`** — builds the shared `testing` image once and exposes its
  ref as an `image` output. A checkout, then the `build-image` action with
  `hashFiles('Docker/Dockerfile.node', 'package-lock.json')` as the hash, so
  the tag is content-addressed — `ghcr.io/${github.repository,,}/testing:<hash>`
  — and the build is skipped entirely when that tag already has a pushed
  image. **This image excludes Playwright
  entirely** — it's Alpine/musl-based and Playwright's Chromium build has no
  official musl support — so every `checks.yml` leg and `vitest` consume it,
  but `playwright` does not; see `build-e2e-image.yml` below.
- **`vitest.yml`** (M1.14; split in M14.27) — four jobs, described in
  [`runner-budget.md`](runner-budget.md), "Splitting the Vitest job": three
  parts that each run some Vitest projects, and `vitest`, which merges them
  and is the required check. Each runs in the same container
  shape as `checks.yml`'s legs (`inputs.image` from `build-image.yml`);
  only `vitest-db` has a `services: postgres:` block, keyed off its
  `inputs.db-image` — reachable by service name since `vitest` runs inside
  its own `container:`, per DESIGN.md §11's CI table. `db-image` comes in
  from the caller (`pr-gate.yml`'s own top-level
  `build-db-image` job, `uses: ./.github/workflows/build-db-image.yml`,
  same shape as `build-image`); `vitest.yml` doesn't call `build-db-image.yml`
  itself, and neither does `playwright.yml`, so the image is built once per
  run for both.
  `DATABASE_URL` is `postgres://sorrel:sorrel@postgres:5432/sorrel`, the same
  credentials `Docker/docker-compose.yaml`'s `app` service uses locally;
  `tests/support/db-global-setup.ts`/`db-setup.ts` rewrite the database name per
  worker from there. Coverage JSON (`--reporter=json`) and the `vitest`
  project's `json-summary` coverage reporter feed
  `.github/scripts/summarize-vitest.mjs` (ported from resume-2026, alongside
  `summarize-playwright.mjs` and shared `lib/coverage-table.mjs` — this repo
  had no `.github/scripts/` before that task; MB.32 added the four `checks.yml`
  scripts beside them) for the PR comment's stat line
  and coverage table. Since MB.180 the script also appends a "Slowest files"
  block — the ten slowest files from the JSON reporter's per-file times, a ⚠
  on any over the 10 s budget and the count of them in the stat line — as a
  warning only; it never fails the job, and the file is split along its
  owning layer rather than the budget raised
  ([`testing/layer-ownership.md`](../testing/layer-ownership.md)).
  `should-run` path-filters the same way `lint`/
  `typecheck` do.
- **`playwright.yml` with `suite: stories`** (M9.1) — the story suite, as
  `pr-gate.yml`'s `stories` job rather than a step of `vitest.yml`. It
  shares the gate's `build-e2e-image` and `build-db-image` jobs with
  `playwright` and runs beside it, under its own `stories` path filter. The
  input switches the run command (`npm run test:stories` with
  `STORIES_JSON=/app/stories.json`), the summariser
  (`.github/scripts/summarize-stories.mjs`: "3 of 58 stories passing" and a
  markdown checklist), the check name, the comment thread
  (`marker-slug: stories`) and the report artifact's name (`stories-report`,
  since one workflow run may not upload two artifacts under one name), and
  the coverage artifact's (`playwright-coverage-stories`, M14.28). The
  summariser adds this run's own coverage figure to the summary line through
  `lib/coverage-table.mjs`, as `summarize-playwright.mjs` does, and posts the
  checklist alone when no report was written. Both suites' coverage artifacts
  hold monocart's raw data too, for the `playwright-coverage` job below. The run step carries `continue-on-error: true`
  for stories, since a job that calls a workflow cannot, so a red story never
  fails the job; the comment reads the real result from `steps.run.outcome`,
  and so does the report upload. It is never a required check, which keeps red
  scaffolds off the merge path, and nothing waits on it, which keeps the
  gate's time down (`claude-docs/testing/acceptance.md`).
- **`playwright-coverage.yml`** (M14.28) — the two Playwright suites'
  coverage, merged, called by `pr-gate.yml`'s `playwright-coverage` job in the
  `testing` image. That job `needs` `playwright` and `stories` and runs after
  both whatever their result (its `!cancelled()` is the one job-level `if:` in
  the file, safe because it is no required check; the workflow carries
  `continue-on-error` too). It is a called workflow, not a job with its own
  runner, so an edit's run that cancels itself leaves it skipped, as for the
  other called workflows. Its steps run only when `changes` says a suite ran
  (`should-run`), and post nothing otherwise. It downloads each coverage artifact
  by name into a folder of its own, `merge-playwright-coverage.mjs` merges the
  `raw/` data that is there, and the job uploads `playwright-coverage-merged`, writes the job
  summary and comments as "Playwright Coverage" (`marker-slug: playwright-coverage`).
  The summary line names the suites included. Only this comment carries the
  per-file table; the two suites' comments carry their figure alone. It reads
  as a failure when either suite failed (`suites-failed`): `playwright`'s
  result, and `stories`'s run step outcome, which `playwright.yml` exposes as
  its `outcome` output because the stories job passes whatever its stories did.
- **`playwright.yml`** (M1.14) — `npm run e2e` against the servers
  `webServer` builds and starts: one per worker slot on 8001 and up — four
  on GitHub's 4-vCPU runner, since the job sets `E2E_WORKERS: 4` over the
  half-the-CPUs default, because a test mostly waits on the browser rather
  than the cores (MB.236) — then the configured-providers server on 8100 and
  the compendium-cache server on 8101 (see `testing/e2e.md`). Runs in `build-e2e-image.yml`'s dedicated
  image, **not** `build-image.yml`'s — same
  `inputs.db-image`/`services: postgres:` shape
  as `vitest.yml`, fed by the same caller-built `build-db-image` job (one
  build, shared by both — see `vitest.yml`'s entry above). Uploads
  `.reports/playwright-report/`/`.reports/test-results/` on failure and
  `.reports/coverage-e2e/` always (named `playwright-coverage`; parallel to `vitest.yml`'s
  `.reports/coverage/` upload). Its reporters (`list`, `json`, `html`) come
  from `playwright.config.ts` under `CI`, not from the command line: a CLI
  `--reporter` replaces the config's list and with it the html report's
  `outputFolder`. `should-run` path-filters the same way. `next.config.ts`'s
  `productionBrowserSourceMaps: true` and `tests/e2e/coverage.config.ts`'s
  `sourceFilter` (JS-only coverage, `src/**` only) apply here since it's the
  same production build both `npm run e2e` locally and this job exercise —
  see `testing/coverage.md` for why, and for the
  `fullyParallel`/`test.describe.configure({ mode: 'serial' })` fix the CI
  Postgres service surfaced (a real race, not CI-only flakiness). A second
  service, `mailpit` on the same `axllent/mailpit` tag compose pins, is the
  inbox: the job sets `MAIL_TRANSPORT=mailpit` and
  `MAILPIT_URL=http://mailpit:8025`, which the runner and the served site
  both read, and `tests/e2e/admin-invitations.spec.ts` reads an invitation
  the site mailed back from it (MB.65). No mail variable is set on `checks.yml`'s
  `build` leg: `src/lib/mail.ts` reads them at send time, never at build.
  Before the run, an `actions/cache/restore` step restores
  `/app/.next-e2e/cache` (MB.230), the e2e build's own, keyed `nextjs-e2e` on
  the lockfile and the source, with a lockfile-only restore key. The path is
  absolute because `hashFiles()` reads `$GITHUB_WORKSPACE` while the build
  writes `/app`. A pull request restores the entry `staging` saved
  (MB.234), since GitHub never lets one pull request's run read a cache
  another pull request saved, only its own, its base branch's and `main`'s.
  The input `build-only` is how that entry is made: set, the run step adds
  `--grep-invert . --pass-with-no-tests`, so the servers build and start but
  no spec runs, the coverage upload is skipped, and an `actions/cache/save`
  step after the run saves the folder under the restore step's key. Only
  that run saves (MB.235). A single `actions/cache` step saves at the end of
  every job whose key missed, which on a pull request is nearly every push,
  and that upload took about 15s after the tests to write an entry no other
  run could read. The save has no `always()`, so a failed build saves
  nothing. `.github/workflows/e2e-cache.yml` is the only caller that sets
  `build-only`. On a push to `staging` that
  touches `src/**`, `public/**`, the Next, TypeScript or Playwright config,
  the manifests, `Docker/Dockerfile.e2e` or the workflows involved, it calls
  `build-e2e-image.yml`, `build-db-image.yml` and this workflow, as
  `pr-gate.yml` does, under the job names `e2e-image`, `db-image` and
  `warm`, so it publishes no check name the gate also publishes
  ([Smoke checks](smoke-checks.md)). Its cost is in
  [Runner budget](runner-budget.md).
- **`build-e2e-image.yml`** (M1.14) — the same `build-image` action as
  `build-image.yml`, but for `Docker/Dockerfile.e2e`:
  `FROM node:26.6.0-bookworm-slim` (Debian, on `Dockerfile.node`'s Node
  version; keep the two in step), with Chromium's headless shell and its
  system libraries installed by the lockfile's own `@playwright/test`, so
  the browser cannot drift from the package (MB.237;
  [`testing/e2e.md`](../testing/e2e.md)). `Docker/docker-compose.yaml`'s opt-in `e2e` service (profile
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
