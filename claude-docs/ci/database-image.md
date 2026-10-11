## Database image

- **`POSTGRES_PASSWORD` must never be a Dockerfile `ARG` or `ENV`** — GitHub's
  `SecretsUsedInArgOrEnv` build check flags it. Generate it with `export` inside
  the `RUN` step instead. `POSTGRES_HOST_AUTH_METHOD=trust` was considered as
  the fix and **rejected**: it bakes passwordless auth into the shipped
  `pg_hba.conf`.
- **`Docker/Dockerfile.postgres`** — `FROM postgres:18` with `pg_trgm` and
  `unaccent` (the two extensions §5 names) and an empty `sorrel_template` database baked in at
  _build_ time, by running the official image's own `docker-entrypoint.sh`
  inside a `RUN` step instead of leaving it to first boot. No schema or seed
  data is baked in, and none will be: M1.27 was specified to extend this
  image with the migrated, seeded template and instead builds that template
  at test-run setup (`tests/support/seeded-database.ts`;
  [`design-decisions/m1.27-template-at-setup-not-in-image.md`](../design-decisions/m1.27-template-at-setup-not-in-image.md)),
  so the image's contents depend on nothing under `src/`. Its `CMD` starts
  the server with `max_connections=200` (MB.179): the one setting every
  consumer of the image reads, since compose passes no `command:` and a CI
  `services:` entry cannot, and it is the budget a test run is held under
  ([`testing/db-harness.md`](../testing/db-harness.md#connections-per-run-mb179)).
  Changing it changes the image's hash, so the PR rebuilds it.
- **`build-db-image.yml`** — builds and publishes it to GHCR through the
  `build-image` action ([Composite actions](composite-actions.md)), tagged with
  a `hashFiles()` hash of `Docker/Dockerfile.postgres` /
  `Docker/postgres-init/**`. No `latest` tag (MB.17) — nothing in the repo ever
  read it: `docker-compose.yaml` builds the Dockerfile locally rather than
  pulling any tag, and every CI caller pins the hash tag. Its triggers are
  `workflow_call`, from `pr-gate.yml` (below), and `workflow_dispatch`. The
  action's `Check if image already exists` step skips the build whenever the
  hash tag is already published (MB.18), so buildx runs only on a genuine miss.
  `src/db/**` sat in the hash from M0.18 to M1.27, against the day the schema
  would be baked in — and since it was never in the build context
  (`Dockerfile.postgres` only `COPY`s `Docker/postgres-init`'s SQL), every
  migration republished byte-identical layers under a new tag. M1.27 removed it:
  the template is populated at test-run setup, so a migration no longer touches
  this workflow at all, and the image rebuilds only when the Dockerfile or its
  init script changes.

  **No `push` trigger** (MB.99). The layer cache is in the registry, one copy
  every build writes and every branch reads ([Composite
  actions](composite-actions.md)), so a push has no branch-scoped cache to
  seed; and a PR that changes the image builds it through `pr-gate.yml`
  first, so a push would find the tag already published. MB.17 and MB.99 have
  the trigger's history and the timings.

- **`build-db-image.yml`'s `workflow_call` trigger** (M1.14) runs whenever
  it is called, whatever the calling PR touched, and exposes an `image`
  output. The caller is
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
