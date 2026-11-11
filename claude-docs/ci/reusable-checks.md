## Reusable checks (`workflow_call`, never triggered directly)

- **`checks.yml`** — nine plain jobs, `lint`, `unused`, `format`, `typecheck`,
  `codegen`, `build`, `destructive-ddl`, `migration-order` and `audit`, each
  reporting as `checks / <name>`. One workflow, because the jobs share their
  inputs, their `container: image: ${{ inputs.image }}` preamble
  (`options: --user root`) and the `run-check` composite action's steps, and
  differ in one npm script and one summarising step.
  - Every leg runs its command under `set -o pipefail` inside a brace group,
    teeing the output to `/app/output.log` (the brace group keeps `2>&1 | tee`
    applying to the whole command), then turns that log into a one-line stat and
    a capped collapsible breakdown through its own script in `.github/scripts/`:
    `summarize-lint.sh`, `summarize-format.sh`, `summarize-typecheck.sh`.
  - **The jobs are independent.** There is no matrix, so one failing job cancels
    no other.
  - **`run-lint` / `run-typecheck` / `run-build` / `run-destructive-ddl` /
    `run-migration-order` are the path-filter inputs**, one per filtered job,
    each read by that job's own `if: ${{ format('{0}', inputs.run-<leg>) != 'false' }}`,
    so a filtered-off job is skipped before its container is pulled. `format` and
    `codegen` have none and always run, since Prettier covers non-code files;
    `audit` has none because it is non-blocking and PR-only. The `format()`
    wrapper treats an empty input as true, so `act`, which applies no
    `workflow_call` input defaults, cannot skip a check it should run.
  - **`build`'s extras**: `DATABASE_URL`/`BETTER_AUTH_SECRET`, and
    `npm run workshop:build` chained onto `npm run build` with `&&`. It posts no
    PR comment.
    - **It keeps no build cache.** A save from a pull request lands under a
      merge ref no other pull request can read, so it never restores, and it
      competes for the repo's 10 GB cache allowance with the e2e entries pull
      requests do read. A save from `staging` would mean a second set of
      `checks.yml` legs on every push there, and this leg is not on the gate's
      critical path ([Runner budget](runner-budget.md)).
    - **The `testing` stage still carries GNU `tar` and `zstd`** (left from
      `actions/cache`, which needed them inside the container because the Alpine
      busybox `tar` rejects `--posix`). No step uses them now; they go the next
      time `Docker/Dockerfile.node` changes.
    - **The `testing` stage carries `jq`**, which the production snapshot step
      in `.github/workflows/migrate.yml` calls.
      `tests/github/workflows/migrate.test.ts` runs that step's script inside
      this image; without `jq` it stops with exit code 127.
    - **`package.json`'s `build` script forces `NODE_ENV=production`.** The
      `testing` image bakes in `NODE_ENV=test`, and Turbopack crashes
      prerendering `/_global-error` under anything but `production`/unset.
    - The two env vars sit at job level and are inert in the other legs.
      `npm run build` traces `/api/auth/[...all]`, which reaches
      `src/db/connection.ts` (throws at import without a syntactically valid
      `DATABASE_URL`, though it never issues a query) and `src/lib/auth.ts`
      (Better Auth requires a real `BETTER_AUTH_SECRET` at
      `NODE_ENV=production`).
  - **`audit`** — `npm audit --json`, which cannot fail the gate (a trailing
    `|| true`), deliberately non-blocking and **never a required status check**.
    It builds its own comment, through `.github/scripts/audit-comment.cjs` under
    `actions/github-script` rather than `pr-comment`: a severity table and a
    package breakdown reported as Warning on a step that passed, which
    `pr-comment`'s pass/fail outcome cannot say. It renders through the same
    layout as every other comment ([`pr-comments.md`](pr-comments.md)). Its "Fix available" column
    compares npm's suggested version with the lockfile's, through
    `.github/scripts/lib/audit-fix.cjs`: when no patched release exists,
    `npm audit` can name an older major as the fix, and that reads as "No —
    downgrade only". The same script writes the same report to the job summary
    (the pass/fail `job-summary` action would put "Dependency Audit passed"
    above the table). The summary is written whether or not a `pr-number` was
    passed; the PR comment only when one was, so `make act-check CHECK=audit`
    shows the table and skips the comment.
  - **`unused`** — `npm run lint:unused` (knip, [`commands.md`](../commands.md)),
    skipped by `run-lint`'s job-level `if:` like `lint`. Non-blocking and
    **never a required status check**: its `run-check` step carries
    `continue-on-error: true`, so a run with findings records a failed outcome
    for the action's Run step, which `pr-comment` posts as a failure comment with
    the log, while the job itself passes. A later run with no findings resolves
    that comment (`minimize`). It has no summariser: knip's own grouped output is
    the report.
  - **`vitest` and `playwright` are deliberately not legs.** Each brings a
    `services: postgres:` block, a `db-image` input and its own artifact uploads
    — a different job shape, not a different npm script.

- **`checks / destructive-ddl`** — flags destructive DDL in migration files new
  or changed in the PR, via `scripts/check-destructive-ddl.ts`, and fails unless
  each flagged migration carries an acknowledgement sidecar,
  `src/db/migrations/<tag>.ack.md`, holding a
  `Destructive DDL acknowledged: <reason>` line. The forms: any `DROP` except
  `DROP NOT NULL` and `DROP DEFAULT` (which widen), `RENAME`,
  `ALTER COLUMN ... TYPE`, `SET NOT NULL`, and `ADD COLUMN ... NOT NULL` with no
  `DEFAULT` (policy: `claude-docs/db/expand-contract.md`). Blocking, like
  `lint`/`typecheck`.
  - **It needs the changed-migration-file list**, which a `workflow_call` file
    cannot read off its own trigger (only the caller sees
    `github.event.pull_request`), so it has an input where the other legs have
    none. It comes from `changes`'s `dorny/paths-filter` step
    (`list-files: json`) as `destructive-ddl-files`, and `checks.yml` puts it
    into the job `env` as `DESTRUCTIVE_DDL_FILES`, inert in the other legs. The
    list comes from the narrower `destructive_ddl_migrations` filter
    (`src/db/migrations/*.sql` only), not `destructive_ddl`'s own `_files`
    output: paths-filter lists every changed file matching _any_ of a filter's
    patterns, so the wider list would hand a changed `pr-gate.yml` or
    `checks.yml` to the script as if it were SQL, and `*.sql` keeps Drizzle's
    `meta/*.json` out.
  - **The leg reads nothing from GitHub but the file list.** The acknowledgement
    is the sidecar, never a PR-body line (`claude-docs/db/expand-contract.md`),
    so `make act-check CHECK=destructive-ddl` proves the scan rather than the
    wiring, and `npm run check:destructive-ddl -- --all` is a usable audit.
  - **`DESTRUCTIVE_DDL_FILES` is always set, even to an empty string.** The
    script reads set-but-empty as "no migrations changed, scan nothing" and
    _unset_ as "work out what this branch changed from git" — a local
    convenience that must never be what CI does.
  - **It is a leg, not a job of its own**, so the matrix notices if it is
    dropped: a separate job could be deleted while `changes` kept computing its
    filters and nothing looked wrong (`claude-docs/db/expand-contract.md`).
  - Its `run-destructive-ddl: false` input is for a merge-queue caller
    (`aggregating-workflows.md`, the "No `merge_group` workflow exists" item); no
    caller passes it.

- **`checks / migration-order`** — refuses a migration journal Drizzle's
  migrator would apply out of order, via `scripts/check-migration-order.ts`: an
  entry the PR adds that sits ahead of one its base has, or is dated no later
  than the base's newest, or a journal whose `when` fails to rise. Why it
  matters, and the regenerate step a refusal asks for, are
  [`db/migrations-and-scripts.md`](../db/migrations-and-scripts.md), "Migration
  order". Blocking, like `destructive-ddl`.
  - **It needs the base's journal, which the checkout lacks.** The checkout is
    the PR's merge commit at depth 1, so the leg fetches the base branch at depth
    1 itself and passes `--base origin/<base>`. The caller names the base:
    `pr-gate.yml` passes `github.base_ref` as `migration-order-base`, put into the
    job `env` as `MIGRATION_ORDER_BASE`, and empty means `staging`, which is what
    `act` gets. Its fetch passes `-c safe.directory=*` (see "Container jobs").
    The command is CI's alone: its `--depth=1` fetch in a full clone marks the
    base's commit shallow, and `git merge` then refuses the base as unrelated
    history until `git fetch --unshallow`. Locally the check is
    `npm run check:migration-order`, against the base as last fetched.
  - **Its filter is the journal**, `src/db/migrations/meta/_journal.json`, plus
    what runs the check; a PR that adds no entry cannot misorder one. The base's
    own moves are not a trigger: a branch whose base moved after it passed is
    checked again on its next push.

- **`build-image.yml`** — builds the shared `testing` image once and exposes its
  ref as an `image` output. A checkout, then the `build-image` action with
  `hashFiles('Docker/Dockerfile.node', 'package-lock.json')` as the hash, so the
  tag is content-addressed — `ghcr.io/${github.repository,,}/testing:<hash>` —
  and the build is skipped when that tag already has a pushed image. **This image
  excludes Playwright** — it is Alpine/musl-based and Playwright's Chromium build
  has no official musl support — so every `checks.yml` leg and `vitest` consume
  it, but `playwright` does not (`build-e2e-image.yml`, below).
- **`vitest.yml`** — four jobs, described in
  [`runner-budget.md`](runner-budget.md), "Splitting the Vitest job": three
  parts that each run some Vitest projects, and `vitest`, which merges them and
  is the required check. Each runs in the same container shape as `checks.yml`'s
  legs (`inputs.image` from `build-image.yml`); only `vitest-db` has a
  `services: postgres:` block, keyed off `inputs.db-image`, reachable by service
  name since the job runs inside its own `container:` (DESIGN.md §11, CI table).
  `db-image` comes from the caller (`pr-gate.yml`'s top-level `build-db-image`
  job); neither `vitest.yml` nor `playwright.yml` calls `build-db-image.yml`, so
  the image is built once per run for both. `DATABASE_URL` is
  `postgres://sorrel:sorrel@postgres:5432/sorrel`, the credentials
  `Docker/docker-compose.yaml`'s `app` service uses;
  `tests/support/db-global-setup.ts`/`db-runner.ts` rewrite the database name per
  worker from there. Coverage JSON (`--reporter=json`) and the `vitest` project's
  `json-summary` coverage reporter feed `.github/scripts/summarize-vitest.mjs`
  (beside `summarize-playwright.mjs` and shared `lib/coverage-table.mjs`) for the
  merge job's one section of the Vitest comment, the final Coverage and Slowest
  Files: the coverage figure, the threshold verdict and the per-file table, then
  the slowest files, with the total test count in the comment's heading and an
  alert for a merge failure no part's row shows.
  Each part job writes its own section too, so the comment shows the parts as
  they finish ([`pr-comments.md`](pr-comments.md)). A part runs the JSON reporter
  beside its blob reporter, into `/app/.reports/vitest-part.json`, and the same
  script with `VITEST_PART=true` turns it into the part's Result: the counts, the
  duration and any over-budget count, with no coverage table, since a part covers
  only its own share of `src/`. A part that crashed before writing the file
  shows that instead. For the merged run the script also writes a "Slowest
  files" block — the ten slowest files from the JSON reporter's per-file times, a
  ⚠ on any over the 10 s budget and the count in the stat line — as a warning
  only; it never fails the job, and the file is split along its owning layer
  rather than the budget raised
  ([`testing/layer-ownership.md`](../testing/layer-ownership.md)). `should-run`
  path-filters the same way `lint`/`typecheck` do.
- **`playwright.yml` with `suite: stories`** — the story suite, as `pr-gate.yml`'s
  `stories` job. It shares the gate's `build-e2e-image` and `build-db-image` jobs
  with `playwright` and runs beside it, under its own `stories` path filter. The
  input switches the run command (`npm run test:stories` with
  `STORIES_JSON=/app/stories.json`, set on the `playwright-coverage.yml` job), the summariser
  (`.github/scripts/summarize-stories.mjs`: "3 of 63 stories passing" and a
  markdown checklist, under the failing and flaky stories it reads from the
  JSON report through `lib/playwright-failures.mjs`, as
  `summarize-playwright.mjs` reads the gate's failing tests), the Playwright comment's section it writes
  (`stories` rather than `gate`), the report artifact's name (`stories-report`, since
  one workflow run may not upload two artifacts under one name) and the coverage
  artifact's (`playwright-coverage-stories-<shard>`). Neither suite's summariser reports
  coverage: the merged figure is the Coverage section's. Both suites'
  per-shard coverage artifacts hold monocart's raw data too, for the `playwright-coverage`
  job. The run step carries `continue-on-error: true` for stories, since a job
  that calls a workflow cannot, so a red story never fails the job; the section
  reads the real result from `steps.run.outcome`, and so does the report upload,
  which also runs when the summariser reports a test that failed and passed on
  retry (its `flaky` output). It is never a required check, which keeps red
  scaffolds off the merge path, and nothing waits on it, which keeps the gate's
  time down (`claude-docs/testing/acceptance.md`).
- **`playwright-coverage.yml`** — the two Playwright suites' coverage, merged,
  called by `pr-gate.yml`'s `playwright-coverage` job in the `testing` image.
  That job `needs` `playwright` and `stories` and runs after both whatever their
  result (`!cancelled()` keeps a failed suite from skipping it, and also names
  the stand-down, which it would otherwise ignore; it is no required check, and
  the workflow carries `continue-on-error` too). A run that stands down leaves it
  skipped, as for the other called workflows. Its steps run only when `changes`
  says a suite ran (`should-run`), and write nothing otherwise: the
  `pr-comments` job has already marked the section Skipped. It downloads each
  suite's coverage artifacts by name pattern (`playwright-coverage-gate-*`,
  `playwright-coverage-stories-*`) into a folder of its own, one subfolder per shard. A failed download is either
  an artifact never uploaded (a suite that did not run), which the merge leaves
  out quietly, or one that exists in the run and could not be fetched;
  `check-coverage-downloads.mjs` tells them apart by asking the run's artifact
  list (the called workflow and its caller grant `actions: read` for this). For
  the second kind the job writes the Playwright comment's Coverage section as a failure
  saying coverage is missing for this commit, with the run link, merges nothing,
  and fails, so "Re-run failed jobs" runs it again. Otherwise
  `merge-playwright-coverage.mjs` merges the `raw/` data that is there, and the
  job uploads `playwright-coverage-merged`, writes the job summary and writes the
  Coverage section. A merge that fails writes its log there, and a merge that
  finds no coverage at all writes a failure saying neither suite left any. The
  summary line names the suites included. Only this section carries the per-file
  table and the only coverage figure; the two suites' sections carry none. It reads as a failure when
  either suite failed: a shard job's result (`suites-failed`, from
  `needs.<suite>.result`), or what the job finds itself in the joined reports.
- **`playwright.yml`** — one job, `playwright`, which runs `npm run e2e` (or
  `test:stories`) on one shard of a matrix: three shards for the gate suite, two
  for stories and one for `build-only`, passed as `--shard i/n`. Each check reads
  `playwright / playwright (n)`. The shards are joined in `playwright-coverage.yml`,
  not here: it downloads the blob reports, runs `playwright merge-reports` with
  the suite's config, summarises, writes the suite's comment section and fails
  when the gate failed ([Runner budget](runner-budget.md), "Playwright shards"). Each shard runs the steps below against the servers `webServer` builds and
  starts: one per worker slot on 8001 and up — four on GitHub's 4-vCPU runner
  (`E2E_WORKERS: 4` over the half-the-CPUs default, since a test mostly waits on
  the browser) — then the configured-providers server on 8100 and the
  compendium-cache server on 8101 (`testing/e2e.md`). Runs in
  `build-e2e-image.yml`'s dedicated image, **not** `build-image.yml`'s, with the
  same `inputs.db-image`/`services: postgres:` shape as `vitest.yml`. Each shard uploads
  its blob report (`playwright-blob-<suite>-<shard>`), `.reports/coverage-e2e/`
  always (`playwright-coverage-<gate|stories>-<shard>`) and its server logs on a
  failure. `playwright-coverage.yml` uploads `.reports/playwright-report/` (the html report)
  on a failure or a flaky pass. A shard's reporters are `list,blob`, set on the
  command line; the merge uses the config's own (`list`, `json`, `html`), so
  the html report's `outputFolder` is the config's. `should-run` path-filters the same way.
  `next.config.ts`'s `productionBrowserSourceMaps: true` and
  `tests/e2e/coverage.config.ts`'s `sourceFilter` (JS-only coverage, `src/**`
  only) apply here (`testing/coverage.md`, which also covers the
  `fullyParallel`/`test.describe.configure({ mode: 'serial' })` fix for a real
  race). A second service, `mailpit` on the `axllent/mailpit` tag compose pins,
  is the inbox: the job sets `MAIL_TRANSPORT=mailpit` and
  `MAILPIT_URL=http://mailpit:8025`, which the runner and the served site both
  read, and `tests/e2e/admin-invitations.spec.ts` reads an invitation the site
  mailed back from it. No mail variable is set on `checks.yml`'s `build` leg:
  `src/lib/mail.ts` reads them at send time, never at build.

  Before the run, an `actions/cache/restore` step restores
  `/app/.next-e2e/cache`, the e2e build's own, keyed `nextjs-e2e` on the lockfile
  and the source, with a lockfile-only restore key. The path is absolute because
  `hashFiles()` reads `$GITHUB_WORKSPACE` while the build writes `/app`. A pull
  request restores the entry `staging` saved, since GitHub lets a run read only
  its own caches, its base branch's and `main`'s. The input `build-only` makes
  that entry: set, the run step adds `--grep-invert . --pass-with-no-tests`, so
  the servers build and start but no spec runs, the coverage upload is skipped,
  and an `actions/cache/save` step after the run saves the folder under the
  restore step's key. Only that run saves (a single `actions/cache` step would
  save at the end of every job whose key missed, nearly every pull request push,
  for an entry no other run can read). The save has no `always()`, so a failed
  build saves nothing. `.github/workflows/e2e-cache.yml` is the only caller that
  sets `build-only`. On a push to `staging` that touches `src/**`, `public/**`,
  the Next, TypeScript or Playwright config, the manifests,
  `Docker/Dockerfile.e2e` or the workflows involved, it calls
  `build-e2e-image.yml`, `build-db-image.yml` and this workflow under the job
  names `e2e-image`, `db-image` and `warm`, so it publishes no check name the
  gate also publishes ([Smoke checks](deploy.md)). Its cost is in
  [Runner budget](runner-budget.md).

- **`build-e2e-image.yml`** — the same `build-image` action as `build-image.yml`,
  for `Docker/Dockerfile.e2e`: `FROM node:26.6.0-bookworm-slim` (Debian, on
  `Dockerfile.node`'s Node version; keep the two in step), with Chromium's
  headless shell and its system libraries installed by the lockfile's own
  `@playwright/test`, so the browser cannot drift from the package
  ([`testing/e2e.md`](../testing/e2e.md)). `Docker/docker-compose.yaml`'s opt-in
  `e2e` service (profile `e2e`, `make docker-e2e`) builds this same file locally.
  **`target: e2e` is pinned explicitly:** `Dockerfile.e2e` has a second stage,
  `headed` (a display, for the `playwright-server` compose service's
  `playwright codegen`/`page.pause()`), and an unqualified `docker build` picks
  the _last_ stage, so without the pin this workflow would publish `headed`. The
  `e2e` compose service pins the same target; `playwright-server` deliberately
  builds `headed`, under its own image tag (`sorrel-e2e-headed`, not
  `sorrel-e2e`). A PR touching `Dockerfile.e2e` moves the content-addressed hash
  and republishes the image; that is expected.
- **`gitflow.yml`** — enforces which source branch may PR into which target:
  `feature/*` → `staging`; `release/MAJOR.MINOR.PATCH` or `hotfix/*` → `main`;
  `staging` or `hotfix/*` → `release/*`; `main-sync/YYYY-MM-DD-HH-MM-SS` →
  `staging`. Standing exception: Dependabot PRs into `staging` pass regardless of
  branch name, **checked by PR author (`dependabot[bot]`), not by branch
  pattern** — a naming exception would let anyone claim it. This workflow is the
  source of truth for the branch-source rules.

### Container jobs

`checks.yml`, `vitest.yml` and `playwright.yml` all run their work inside a
`container:` built from a GHCR image, with `defaults.run.working-directory:
/app`. Five things about that shape are load-bearing and none is visible from the
step that depends on them.

- **`defaults.run.shell: bash` is not cosmetic.** A `container:` job defaults to
  `sh`, unlike a plain `runs-on` job
  ([docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)),
  and dash has no `set -o pipefail`, which every `… | tee output.log` step relies
  on to report the tool's exit status rather than `tee`'s.
- **`options: --user root` on the `testing` image jobs.** That image's default
  user is `node`, which cannot write the runner's bind-mounted
  `_temp/_runner_file_commands` directory; `actions/checkout`, and any JS action
  using `core.saveState`/`setOutput`, fails `EACCES` without it.
- **Guards that shell out to git pass `-c safe.directory=*`.** Those root jobs
  run over a checkout owned by uid 1000, and git refuses a repository owned by
  another user ("dubious ownership") unless told the directory is safe.
- **`playwright.yml` passes `options: --ipc=host` instead.** Chromium crashes on
  the container default 64 MB `/dev/shm`. The e2e image runs as root (the `node`
  base image's default; `Dockerfile.e2e` never switches user), so `--user root`
  would add nothing; Chromium under root expects `--no-sandbox`, which
  `playwright.config.ts` owns if it ever launches non-headless.
- **Every path a step hands to another step is the absolute `/app` one.**
  `checkout-to-app` populates both `$GITHUB_WORKSPACE` (what `hashFiles()` reads)
  and `/app` (where the job's commands run), so a workspace-relative log file,
  cache path or `--outputFile` resolves against the wrong one.

**Each `checks.yml` job's `name:` is load-bearing too.** The job id and `name:`
are both the check's name (`lint`, `format`, …), so the check reports as
`checks / lint`. A job without `name:` would report its id, and a job renamed
would strand a required check under the old name.
