# CI pipeline — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

`.github/` — the workflows and the composite actions they share. Nothing under
`.github/workflows/` hardcodes a repo name except `checkout-to-app`'s callers
(see below); everything else derives from `github.repository`.

**Every section is a file under `ci/`**, moved there whole. This page keeps each
`## ` and `### ` heading with a link to where it lives; a citation in code names
that file, not this page.

## Composite actions

The five actions under `.github/actions/` — `checkout-to-app`, referenced by its full `@main` path, `job-summary`, `pr-comment`, `build-image` with its registry layer cache, and `vercel-secrets-guard` — and why a job's `container:` and `services:` blocks cannot become one. [`ci/composite-actions.md`](ci/composite-actions.md)

## Container jobs

`checks.yml`, `vitest.yml` and `playwright.yml` run inside a GHCR-image `container:` working in `/app`, which is why `shell: bash`, `--user root`, git's `safe.directory=*`, absolute `/app` paths and `checks.yml`'s matrix `name:` are all load-bearing. [`ci/container-jobs.md`](ci/container-jobs.md)

## Reusable checks (`workflow_call`, never triggered directly)

`checks.yml` runs `lint`, `format`, `typecheck`, `build`, `audit`, `destructive-ddl` and `migration-order` as one matrix job with `run-*` path-filter inputs, beside `vitest.yml` and its story step, `playwright.yml`, the two image builds and `gitflow.yml`'s branch-source rules. [`ci/reusable-checks.md`](ci/reusable-checks.md)

## Aggregating workflows

`pr-gate.yml` path-filters and calls the reusable checks under one cancellable concurrency group per PR, beside `close-task-on-merge.yml`, the branch rulesets, the rule that a required-check job never carries a job-level `if:`, and the `ubuntu-26.04` pin. [`ci/aggregating-workflows.md`](ci/aggregating-workflows.md)

## Runner budget

Only `vitest.yml` runs on Blacksmith's `blacksmith-8vcpu-ubuntu-2404` while every other job stays on GitHub's free `ubuntu-26.04`, with the free-tier sum per organisation and when to move `playwright.yml` too or drop to 4 vCPU. [`ci/runner-budget.md`](ci/runner-budget.md)

## Smoke checks

None remain: the checks exercise every composite action, a sourceless image and its guard test close the stale-file hole that left, no workflow may publish a status-check context `pr-gate.yml` also publishes, and each check's path filter lists the inputs of the image it runs against. [`ci/smoke-checks.md`](ci/smoke-checks.md)

## Database image

`Docker/Dockerfile.postgres` bakes `pg_trgm`, `unaccent` and an empty `sorrel_template` into `postgres:18` without holding `POSTGRES_PASSWORD`, and `pr-gate.yml` builds it once per content hash through `build-db-image.yml` for `vitest.yml` and `playwright.yml`. [`ci/database-image.md`](ci/database-image.md)

## Deploy

`deploy.yml` is the only route to Vercel, for `main`, `staging` and `hotfix/**` PRs into `main`: it runs `migrate.yml` and its reference seeds first, takes `DATABASE_URL` and `BETTER_AUTH_SECRET` from GitHub secrets, and asserts the pulled environment before building. [`ci/deploy.md`](ci/deploy.md)

## Neon snapshots

`migrate.yml` branches Neon's `main` as `snapshot-<short sha>` before every production migration, and the weekly `neon-snapshot-prune.yml` keeps the newest three under the free tier's 10-branch cap, both skipping with a warning without `NEON_API_KEY`. [`ci/neon-snapshots.md`](ci/neon-snapshots.md)

## Running CI locally

`.actrc` and the `make act-*` targets run the reusable checks through `act` on a locally built `testing` image, one `make act-check CHECK=<leg>` per `checks.yml` leg, with `build` and `audit` expected to fail and no `act-vitest` or `act-playwright` yet. [`ci/running-ci-locally.md`](ci/running-ci-locally.md)
