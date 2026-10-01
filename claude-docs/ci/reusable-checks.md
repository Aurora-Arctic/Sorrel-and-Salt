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
      — from the step's first commit (`3d9735e`) until MB.37 added GNU `tar`
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
  ref as an `image` output. A checkout, then the `build-image` action with
  `hashFiles('Docker/Dockerfile.node', 'package-lock.json')` as the hash, so
  the tag is content-addressed — `ghcr.io/${github.repository,,}/testing:<hash>`
  — and the build is skipped entirely when that tag already has a pushed
  image. **This image excludes Playwright
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
  acceptance suite on `vitest.stories.config.mts`, run after the coverage step
  with `always()` and no `--coverage` of its own, so a story never counts toward
  the 80% threshold (`claude-docs/testing/acceptance.md`). Its reporter writes
  the checklist as JSON (`--outputFile=/app/stories.json`) and
  `.github/scripts/summarize-stories.mjs` renders it — "3 of 50 stories passing"
  and a markdown checklist — into a second job-summary section and a second PR
  comment thread (`marker-slug: stories`). A failing story fails the job; M2.1
  decides how a deliberately red scaffold is tolerated. `pr-gate.yml`'s `vitest`
  filter lists `vitest.stories.config.mts` and the script, so editing either
  reruns the job.
- **`playwright.yml`** (M1.14) — `npm run e2e` against the servers
  `webServer` builds and starts: one per worker slot on 8001 and up — two
  on GitHub's 4-vCPU runner, since `E2E_WORKERS` is unset and defaults to
  half the CPUs — and the configured-providers server on 8100 (see
  `testing/e2e.md`). Runs in `build-e2e-image.yml`'s dedicated
  image, **not** `build-image.yml`'s — same
  `inputs.db-image`/`services: postgres:` shape
  as `vitest.yml`, fed by the same caller-built `build-db-image` job (one
  build, shared by both — see `vitest.yml`'s entry above). Uploads
  `.reports/playwright-report/`/`.reports/test-results/` on failure and
  `.reports/coverage-e2e/` always (parallel to `vitest.yml`'s
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
  both read, and `tests/e2e/mail-transport.spec.ts` sends through it and
  reads the message back (MB.65). No mail variable is set on `checks.yml`'s
  `build` leg: `src/lib/mail.ts` reads them at send time, never at build.
- **`build-e2e-image.yml`** (M1.14) — the same `build-image` action as
  `build-image.yml`, but for `Docker/Dockerfile.e2e`:
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
