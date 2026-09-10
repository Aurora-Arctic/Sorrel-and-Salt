# CI pipeline — transcript

## 2026-09-10 — M1.4: migrate.yml, run ahead of deploy

Added `.github/workflows/migrate.yml`, a `workflow_call`-only reusable
workflow (same shape as `lint.yml`/`format.yml`/`typecheck.yml`) that applies
`npm run db:migrate` against one Vercel environment's `DATABASE_URL`.

`deploy.yml`'s single `deploy` job split into three so migrate can sit ahead
of it with a real `needs:` dependency rather than the `workflow_run`
alternative `DESIGN.md` §12 also allowed:

- `resolve-target` — the old "Resolve deploy target" step, unchanged, just
  promoted to its own job (no secrets needed) since both `migrate` and
  `deploy` now read its `environment`/`prod_flag`/`alias` outputs.
- `migrate` — `needs: resolve-target`, calls `migrate.yml` with
  `secrets: inherit`. Carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock, deliberately global rather
  than per-environment — the acceptance criterion is "two merges cannot
  migrate at once," full stop, and a shared lock is simpler to reason about
  than one scoped per target.
- `deploy` — `needs: [resolve-target, migrate]`, `if: success()`. The
  `success()` is load-bearing: a job-level `if:` replaces the implicit
  "all `needs` succeeded" check GitHub Actions would otherwise apply, so
  without it a failed migration would not actually block the deploy step —
  exactly the acceptance criterion ("workflow fails loudly and blocks the
  deploy on a migration error").

`migrate.yml` resolves `DATABASE_URL` the same way `deploy.yml`'s own
`vercel pull` step does — `vercel pull --environment=<preview|production>`,
same flag deploy.yml passes, so it picks up the same branch-scoped `staging`
override / per-hotfix ephemeral Neon branch distinction the M1.1 branch
strategy record describes — then reads it out of the pulled
`.vercel/.env.<environment>.local` file (`vercel pull` doesn't export
`DATABASE_URL` as a job env var on its own; `drizzle.config.ts` needs it in
`process.env` to run `drizzle-kit migrate`), masking the value with
`::add-mask::` before it can reach the log.

Applies to all three deploy triggers via `resolve-target`'s existing
condition: push to `staging` and push to `main` (obviously), and — since the
task's own description explicitly named it — a `hotfix/** → main` PR too,
with `environment=preview` same as a `staging` push.

**Left unresolved, flagged rather than fixed:** `claude-docs/ci.md`'s Deploy
section states the four `VERCEL_*` secrets "are set as repo secrets, so the
deploy runs for real," but the M0.27 Asana task ("Define environment
variable and secrets matrix") that would set them is `On Hold`, and
`deploy.yml`'s own header comment still says they "do not exist yet." Left
that line as-is rather than silently picking a side — `migrate.yml`'s guard
step behaves correctly either way, skipping the real work greenly if the
secrets are in fact absent.

## 2026-09-10 — M1.14: vitest.yml and playwright.yml, plus the Postgres and e2e images they needed

Replaced `pr-gate.yml`/`merge-queue.yml`'s M0-era `vitest`/`playwright` stub
jobs with real `workflow_call` checks, ported from resume-2026's
`vitest.yml`/`playwright.yml` for everything that transfers directly
(inputs, container/checkout/timer/summarize/job-summary/pr-comment steps).
Also ported `.github/scripts/{summarize-vitest,summarize-playwright}.mjs`
and `lib/coverage-table.mjs` — this repo had no `.github/scripts/` directory
yet.

**Two things resume-2026 has no equivalent of, since it has no database:**

- `vitest.yml` gained a `build-db-image` job — `uses:
./.github/workflows/build-db-image.yml` — and a `services: postgres:`
  block on the `vitest` job keyed to that job's output, reachable by service
  name since `vitest` runs in its own `container:`. `build-db-image.yml`
  didn't have a `workflow_call` trigger before this — added one (an
  `outputs.image` alongside its existing `push`/`pull_request`/
  `workflow_dispatch` triggers, which a `workflow_call` invocation bypasses
  entirely, path filter included) so `vitest.yml`/`playwright.yml` could
  consume it the way `build-image.yml` already lets every other check
  consume the shared `testing` image. Its own `verify-db-image` job — a
  standalone `services:` + `docker exec ... psql` proof that the image
  works, explicitly called scaffolding in this doc before this task — is
  removed: `vitest`/`playwright` now exercise the identical pattern for
  real, on every run that needs it, not just a synthetic one.
  `DATABASE_URL` is `postgres://sorrel:sorrel@postgres:5432/sorrel` — the
  same credentials `Docker/docker-compose.yaml`'s `app` service uses
  locally, which `src/test/db-global-setup.ts`/`db-setup.ts` then rewrite
  per worker.
- `vitest.config.mts` and `e2e/coverage.config.ts` both gained a
  `json-summary` reporter (alongside their existing ones) — without it,
  `coverage-table.mjs` (ported unmodified from resume-2026, which expects
  exactly that istanbul-style `coverage-summary.json` shape from either
  suite) always finds nothing, and the PR comment's coverage stat/table
  section silently never appears.

**A late correction, after the Asana task's own comment thread surfaced two
points the initial brief had missed:** `playwright.yml` cannot run in
`build-image.yml`'s shared `testing` image — `Docker/Dockerfile.node`'s own
header comment says "Playwright's system libraries and browser download are
left out entirely — e2e is not run from this image," and that image is
Alpine/musl-based, which Playwright's Chromium build has no official support
for at all. Fixed by giving `playwright` its own image, mirroring
`build-image.yml`/`build-db-image.yml`'s own pattern exactly:
`Docker/Dockerfile.e2e` (built `FROM mcr.microsoft.com/playwright:v1.63.0-noble`,
Microsoft's own image, pinned to `@playwright/test`'s resolved
`package-lock.json` version — bump both together) plus
`build-e2e-image.yml`, a `workflow_call`-only content-addressed-tag build
just like `build-image.yml`'s. `pr-gate.yml`/`merge-queue.yml` gained a
`build-e2e-image` job feeding `playwright`'s `image` input, parallel to
`build-image` feeding `lint`/`typecheck`/`build`/`vitest`.
`build-image.yml`'s own "Layers (apt-get, npm i, playwright install)..."
comment was already stale before this — leftover from before M0.11 slimmed
`Dockerfile.node` down from resume-2026's three-stage original — corrected
in passing.

The second point — "locally the devcontainer should be able to run all
testing" — doesn't fit inside `Dockerfile.node`'s Alpine stages any more
than `playwright.yml`'s CI job does, and switching the devcontainer's own
base distro to Debian just for this was judged too large a change for one
task. Instead, `Docker/docker-compose.yaml` gained an opt-in `e2e` service
(profile `e2e`, `make docker-e2e`) that builds the exact same
`Dockerfile.e2e` CI uses — sharing the image is what "don't duplicate the
install steps" resolves to here, rather than a shared Dockerfile stage two
different base distros can't actually share. It's one-shot
(`docker compose run --rm`, not a long-running service like `workshop`),
reaches Postgres the same way `app` does, and exits when the suite
finishes.

**Not done, flagged rather than guessed at:** `make act-vitest`/
`act-playwright` targets, which `ci.md`'s own "Running CI locally" section
says every new reusable check workflow should ship in the same PR.
`act-lint`/`act-format`/`act-typecheck` all work because their workflows are
single-job and take every input directly (`--input image=...`); `vitest.yml`
and `playwright.yml` both now have a real `needs: build-db-image` (and
`playwright.yml` a real `build-e2e-image` dependency in the caller) that
requires either a genuine GHCR push mid-run or new local-only plumbing
`act` has no established pattern for in this repo yet. Left both out rather
than ship an `act-*` target that cannot be exercised in this environment to
confirm it actually works.
