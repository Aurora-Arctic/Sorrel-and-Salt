# Database — summary

`src/db/connection.ts` is the only place the Postgres driver is instantiated.
It exports `db`, a Drizzle client, built with `drizzle-orm/postgres-js` over
the `postgres` package (pure JS, no native binary). `db` reads `DATABASE_URL`
from the environment at module load and throws if it is unset — no default,
no silent fallback.

- **One driver call site.** Nothing outside `connection.ts` calls `postgres(...)`.
  `src/db/repository.ts` (M1.16) will be the only module that imports `db` from
  here — everything else reaches the database through the repository.
- **Local Postgres and Neon use the same code path.** `postgres` (the driver)
  parses `sslmode` off the connection string itself, so a Neon URL's
  `?sslmode=require` turns on TLS automatically and a local URL with no
  `sslmode` stays plaintext — `connection.ts` never branches on environment.
- **`drizzle.config.ts`** (repo root) drives `drizzle-kit`: `dialect:
  'postgresql'`, schema at `src/db/schema`, migrations output to
  `src/db/migrations`. It reads the same `DATABASE_URL` and throws under the
  same condition.

## Migrations and scripts (M1.3)

- **`npm run db:generate`** is `drizzle-kit generate` — diffs `src/db/schema`
  against `src/db/migrations` and writes a new migration for any change.
  With no schema tables yet, it currently has nothing to generate; the first
  migration (`0000_enable-extensions.sql`) was written by hand with
  `drizzle-kit generate --custom`, since enabling an extension isn't
  something schema-diffing can express.
- **`npm run db:migrate`** is `drizzle-kit migrate` — applies every migration
  under `src/db/migrations` not yet recorded in the `drizzle` schema's
  `__drizzle_migrations` table it creates on first run. That table is what
  makes re-running idempotent: a migration already recorded is skipped, not
  reapplied.
- **`0000_enable-extensions.sql`** runs `CREATE EXTENSION IF NOT EXISTS pg_trgm`
  — the only extension DESIGN.md §5 names (the fuzzy duplicate-name
  warning's `gin_trgm_ops` index). `IF NOT EXISTS` also makes it a no-op
  against `sorrel`/`sorrel_template`, which already have `pg_trgm` baked in
  at the Postgres image's build time (`Docker/postgres-init/`) — the
  migration is what makes a from-scratch database (e.g. Neon) match.
- **Migration files are committed**, not generated at deploy/build time —
  `src/db/migrations/**` is real source, reviewed like any other change.
- **`npm run db:seed`** runs `scripts/db-seed.ts`, which calls
  `seed(db, { scenario: 'minimal' })` from `src/db/seed/index.ts`. That
  function exists only as an interface for now — it throws for every
  scenario, since there's no schema yet for it to populate. Scenario content
  arrives scenario-by-scenario in M1.21 (`minimal`), M1.22 (`standard`), and
  M1.23 (`demo`); scenario selection by environment variable is M1.24.
- **`npm run db:reset`** is `db:migrate` then `db:seed` — real plumbing, but
  it fails until `db:seed` has something to do. The Docker-level reset (init
  hook, `make db-reset`, drop-and-recreate from a broken state) is M1.24.
- **`Docker/postgres-init/enable-extensions.sql`** also creates the `sorrel`
  role and database now, not just `pg_trgm`. Without it, a container built
  from `Dockerfile.postgres` would never get a `sorrel` role/database at
  all: `PGDATA` is already populated at image build time, so the entrypoint's
  usual first-boot "create `POSTGRES_USER`/`POSTGRES_DB` from env" step never
  runs for it. Still no schema or seed data — that's M1.27.
