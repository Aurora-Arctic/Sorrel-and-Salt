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
  - **`build`'s extras**: the `/app/.next/cache` restore through
    `actions/cache`, `DATABASE_URL`/`BETTER_AUTH_SECRET`, and
    `npm run workshop:build` chained onto `npm run build` with `&&`, which
    short-circuits the same way separate steps would. The story gate and the
    theme-default guard are not here: they run in
    `tests/guards/workshop-guards.test.ts` on the `vitest` job (MB.38). It
    posts no PR comment.
    - **The cache `path` is the absolute `/app/.next/cache`**, not a
      workspace-relative path: `hashFiles()` reads `$GITHUB_WORKSPACE`, but
      the job's working directory is `/app`.
    - **The `testing` stage carries GNU `tar` and `zstd` for this cache**
      (MB.37). `actions/cache` runs inside the container, and the Alpine
      image's busybox `tar` rejects `--posix`, so without them every save
      fails with a warning and every restore misses.
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
- **`vitest.yml`** (M1.14) — `npm run test:coverage` in the same container
  shape as `checks.yml`'s legs (`inputs.image` from `build-image.yml`),
  plus a `services: postgres:` block on the `vitest` job keyed off its
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
  both read, and `tests/e2e/admin-invitations.spec.ts` reads an invitation
  the site mailed back from it (MB.65). No mail variable is set on `checks.yml`'s
  `build` leg: `src/lib/mail.ts` reads them at send time, never at build.
  Before the run, an `actions/cache` step restores `/app/.next-e2e/cache`
  (MB.230), the e2e build's own, keyed `nextjs-e2e` on the shape of
  `build`'s `/app/.next/cache` entry above and for the same reasons: the
  absolute path, and a lockfile-only restore key. It cannot share `build`'s
  entry, because the two builds write different `distDir`s
  (`testing/e2e.md`).
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
