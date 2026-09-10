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
  same condition. Migration generation itself (`db:generate`/`db:migrate`)
  is wired up in M1.3 — this task only adds the config the CLI needs.
