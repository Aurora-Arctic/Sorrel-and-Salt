## The db test harness — `tests/support/db/`

Two modules the `tests/db/` and `tests/modules/` files share, a sweep built on
them, and the setup inserters. They sit in their own directory because the rest
of `tests/support/` may not import `drizzle-orm` at runtime:
`.oxlintrc.json`'s `no-restricted-imports` bans it everywhere but the database
layer and its tests (CLAUDE.md rule 4), and
`tests/guards/lint-db-client-boundary.test.ts` probes that ban. `table-metadata.ts`
is made of `getTableConfig` from `drizzle-orm/pg-core`, so the database-layer
override names `tests/support/db/**/*.ts` beside `tests/db/**/*.ts` and
`tests/modules/**/*.ts`, and the guard lists `tests/support/db` among its
`EXEMPT` probes. `vitest.config.mts` collects only `*.test.ts`, so a module
there is never run as a test.

- **`database.ts` — `useTestDatabase(bind)` and `failureOf(work)`.**
  `useTestDatabase` registers a `beforeAll` that opens one `postgres` client
  (reading `DATABASE_URL` inside the hook, after `db-runner.ts` has pointed it
  at the worker's clone) and an `afterAll` that ends it, and returns the
  catalogue reads `columnNames(table)` and `indexRow(table, name)` over that
  client. **It is per file, not per worker:** `db-runner.ts` re-clones the
  worker's database `WITH (FORCE)` before every test file, which terminates any
  session still open on it (an autovacuum worker's too, which the test role may
  end only because the database image grants it `pg_signal_backend`,
  [`ci/database-image.md`](../ci/database-image.md)). Vitest's default
  `sequence.hooks` is `stack`, so a call at the top of a file opens before the
  file's own `beforeAll` and closes after its `afterAll`. It hands the client to
  a `bind` callback so a file's existing `let sql` and every `` sql`…` ``,
  `sql(row)`, `sql(table)`, `sql.begin` and `sql.unsafe` call stay as written:

  ```ts
  let sql: ReturnType<typeof postgres>;
  const catalogue = useTestDatabase((client) => (sql = client));
  ```

  `repository/*.test.ts` (through `tests/support/db/probe-tables.ts`),
  `updated-at-trigger.test.ts`, `test-database-isolation.test.ts` and
  `tests/db/seed/*` open their own client: the isolation test's subject _is_ the
  connection, and the others read the clone as the template built it or truncate
  everything before a seed run they assert.

- **`table-metadata.ts` — the Drizzle half.** `tableFacts(table)` is
  `getTableConfig` plus the lookups schema tests share: `byName`,
  `byIndexName`, `foreignKeyByColumn` (each entry
  `{ column, columns, name, foreignColumnNames, foreignTable }`, every column of
  the key read so composite keys are not taken for single-column ones, `column`
  their names joined by `, `) and `nonAuditForeignKeys`, the table's own
  references with the audit ids filtered out. `AUDIT_COLUMNS`, `STAMP_COLUMNS`
  and `DELETE_COLUMNS` are **literal string lists, deliberately not derived from
  `src/db/audit.ts`**: a test comparing a table against
  `Object.keys(auditColumns)` passes for any value of `auditColumns`, an empty
  one included. `AUDITED_TABLES` (the two hard-deleted join tables among them)
  and `UNAUDITED_TABLES` (Better Auth's `accounts`, `sessions`, `verifications`)
  are the one list the trigger sweep and the audit-columns sweep read. The
  tables carrying a `forbid_rewrite` trigger are not a list here; its refusals
  are `user-privilege-changes-schema.test.ts`'s and
  `tests/db/privilege-change-trigger.test.ts`'s.

- **`insert-ingredient.ts` — `insertIngredient(sql, fixture, author)`** is the
  setup inserter for an ingredient and its children, on the raw client in one
  transaction, with a variant row for each of the fixture's forms (`insertVariant`
  writes one more). Why setup avoids `withAudit` is under
  ["Fixture factories"](fixture-factories.md). It has no test of its own.
- **`insert-spell.ts` — `insertSpell(sql, fixture, author)`** is the same for a
  spell: its row, layers and assigned categories. `author` is `created_by`,
  whom a private spell is readable by, and a layer's ingredient id is written as
  given, which is how a test writes the cross-coven link a finder must withhold.

- **`tests/db/audit-columns.test.ts` — one sweep on the catalogue side.** It
  asserts `AUDITED_TABLES` are exactly the tables the catalogue finds carrying
  the four stamps, and holds each to its expectation: the six-column tables and
  the two four-column join tables, the stamps `NOT NULL`, the delete pair
  nullable or absent, and each `*_by` referencing `users(id)`. The code side is
  the module schema tests': **each asserts its table's exact column set,
  `[...OWN, ...AUDIT_COLUMNS]` or `[...OWN, ...STAMP_COLUMNS]`**, which is what
  fails when a spread leaves a schema file (the migrated database's columns
  would stand, so the catalogue alone would stay green; `tests/db/audit.test.ts`
  covers `applyAudit` alone). The `UNAUDITED_TABLES` are asserted to exist with
  an `updated_at` and none of the three audit ids by name
  (`sessions.impersonated_by` is no audit id), so the sweep cannot be satisfied
  by a table with nothing to check. A new audited table without
  `...auditColumns` fails its own schema test, and one the list does not name
  fails this file.

- **`tests/db/partial-unique-indexes.test.ts` — rule 4 once, for every
  table.** It reads every partial unique index in `public` from `pg_index`
  (columns, expressions and predicate, through `pg_depend`), asserts the set
  non-empty and every index classified in its `ROWS` map (keyed by index, since
  one table's indexes can sit on opposite sides of a predicate), then per index
  inserts a holder, proves a second live row sharing those columns is refused by
  that index by name, soft-deletes the holder and proves the same row is
  admitted. A per-index `clash` names the columns to share where the catalogue's
  list would collide on another index first or names a generated column
  (`ingredients.identity_key`). A new partial unique index fails the sweep until
  classified; a schema test keeps only what is particular to its table, such as
  a slug shared across two groups. A second test reads every unique index on a
  table carrying `deleted_at` that is _not_ partial and holds the set to its
  `NOT_PARTIAL` map, each entry with its reason, so rule 4's one exception,
  `ingredient_variants_id_ingredient_id_unique` (the target of the composite
  foreign keys), is decided there and any other fails. A table with no
  tombstone, `ingredient_categories`, whose two pair indexes are partial on
  `variant_id`, is classified `hardDeleted`: its holder is deleted outright to
  free the slot.

- **`tests/db/schema-drift.test.ts` — the schema files against the migrated
  database, once for every table.** It imports every
  `src/modules/*/schema/*.ts`, asserts the tables non-empty and exactly the
  `public` tables the catalogue holds, then per table compares `tableFacts` with
  the catalogue: each column's name, type (`format_type`, Drizzle's spelling
  normalised), nullability and whether the database fills a default; each
  foreign key's name, columns, target and `ON DELETE`; the CHECK names; and each
  index's name, uniqueness and whether it is partial. An index backing the
  table's own primary key or unique constraint is the constraint's and is left
  out, but not one a foreign key merely points at. A schema file edited without
  its migration, or the reverse, fails here, which is why no module schema test
  carries a foreign-key, NOT NULL, type or index-name case. What a CHECK or an
  index _refuses_ is not compared; it stays the module schema test's or the
  partial-unique sweep's.

  **`PENDING_DROPS` declares the expand/contract window.** A column or index
  drop is two PRs (CLAUDE.md rule 10): the first removes the declaration and
  ships no migration, so until the second lands the migrated database holds an
  object the schema no longer declares. The undeclare task adds a line to the
  file's `PENDING_DROPS` — table, kind (`column`, `index`, `check`,
  `foreignKey`, `table` or `view`), name, and the task that drops it — and the
  comparison leaves that object out; the drop task removes the line. A `view` is
  the old name a renamed table leaves behind, and the schema declares none, so a
  view the list does not hold fails too
  (["Renaming a table"](../db/expand-contract.md)). A line left behind fails the
  file's last test, which asserts every pending drop still names an object the
  catalogue holds.

**What a module schema test asserts.** Its table's exact column set on the code
side, and the behaviour particular to that table: each CHECK's refusal with the
row it would otherwise admit, identity and tier rules, a trigger's effect, a
default the domain depends on, and a closed list as one accepted value, one
refused and one equality of the database's `enum_range` against the code's. Not
the catalogue twin of its columns (`audit-columns.test.ts`), a foreign key, NOT
NULL or index name (the drift test), a second live row refused or freed by a
soft delete (the partial-unique sweep), a `getTableConfig` property pin, a "no
such column" case (the exact set already fails), one case per enum member, or a
shipped migration's data test, which retires once its migration is in the
journal (["Migrations and scripts"](../db/migrations-and-scripts.md)). The eight
curated vocabularies run off one registry-driven file,
`tests/modules/vocabulary/schema/vocabularies.test.ts`, over
`src/db/vocabularies.ts`'s `TWO_TIER` and `FLAT`, and the two category join
tables off one template,
`tests/modules/ingredients/schema/join-tables.test.ts`.

### Two db projects

The Postgres-backed files run in two Vitest projects, split by what a file does
to the worker it runs in.

- **`db`** runs with `isolate: false`: a worker keeps its module registry from
  one file to the next, so the few hundred modules (repository, services,
  GraphQL schema, Better Auth) load once per worker rather than once per file.
  The database does not carry over: `db-runner.ts` re-clones the worker's
  database before every file in every run mode, so no row outlives its file.
- **`db-mocking`** runs with `isolate: true`. A file lands here when its source
  calls `vi.mock`, `vi.doMock`, `vi.unmock`, `vi.hoisted`, `vi.stubGlobal`,
  `vi.stubEnv`, `vi.resetModules` or `vi.useFakeTimers`, calls msw's
  `setupServer(` (msw patches the process's sockets, which a shared worker would
  hand to the next file), or imports a `tests/support/` helper whose source does
  (today `auth-module.ts`, whose `importAuth` resets the registry and builds
  `@/lib/auth` under another environment). Each changes something a shared
  registry would hand to the next file: a mocked module stays mocked, a stubbed
  global stays stubbed, an auth instance built for one file's environment is the
  one the next imports
  ([`../design-decisions/mb.96-ci-vitest-job.md`](../design-decisions/mb.96-ci-vitest-job.md)).

**The split is a scan, not a list.** `vitest.config.mts` reads each file's
source when the config loads and tests it against one regular expression,
`LEAKS_PAST_ITS_FILE`. A file that starts mocking moves to `db-mocking` in the
same diff, and one that stops moves back. The scan errs toward isolation: a
match inside a comment counts too. A file that leaks some other way — writing
`process.env` directly rather than through `vi.stubEnv`, or leaving a module's
state changed — is not caught, which is why tests stub through `vi`. To send
such a file to `db-mocking` deliberately, extend the expression with a comment
saying why.

**What else a shared registry keeps, and why each is safe:**

- **The app's database client** (`src/db/connection.ts`) is one per process per
  `DATABASE_URL` ("Connections per run", below), and the URL is the worker's
  slot, which does not change between its files. The clone is `WITH (FORCE)`,
  which ends the client's idle connections; postgres.js opens new ones on the
  next query.
- **React's `cache()`** is the default build's pass-through outside a server
  render (the `react-server` condition is the `rsc` project's alone).
- **`unstable_cache`** resolves to `tests/support/next-cache.ts`'s pass-through.
  The one cache that holds entries, `tests/support/next-data-cache.ts`, is
  reached only through `vi.mock`, so every file using it is in `db-mocking`.
- **`revalidateTag`'s record of calls** in `next-cache.ts` is cleared by
  `db-runner.ts` before every file.
- **Module-level `Map`s and `Set`s** in `src/` are constants, never written
  after load.

**The global setup runs once between them.** Vitest runs each project's
`globalSetup` in turn, so both would build the template and clone every slot.
`db-global-setup.ts` keeps the first build on `globalThis`, keyed by the run's
Vitest instance, and the second project awaits it; the first owns the teardown.
`maxWorkers`, the `boundedPostgres()` plugin and `runner` come from `dbHarness`
for both, and coverage is the root config's, so the 80% threshold counts every
file. The acceptance config spreads `dbHarness` too: it is one isolated project
of its own.

### Connections per run

A `db` run can fail tests that pass alone, with `remaining connection slots are
reserved for roles with the SUPERUSER attribute`: Postgres runs out of its
connections, and which test fails depends on the room left by whatever else
holds them (another session's run, a `next dev` idle on `sorrel`, an e2e server
on `sorrel_e2e_*`). Two things multiplied the demand. The app's client in
`src/db/connection.ts` and the client the test file opens are each postgres.js's
default pool of ten, and a file that fires its queries concurrently fills both.
And a test that calls `vi.resetModules()` (the identity and OAuth tests, to
rebuild Better Auth under another environment) re-evaluated
`src/db/connection.ts`, which opened a client per evaluation and ended none.

**The bound.** One client per process, and three configured numbers that move
together: raising any one without the others breaks the arithmetic below.

- **One app client per process per URL**, kept on `globalThis` by
  `src/db/connection.ts` rather than in the module's scope, so a re-evaluated
  module reuses the pool the first evaluation opened. Keyed by the URL, so a test
  that repoints `DATABASE_URL` still gets its own. The same shape guards
  `next dev`, whose hot reload re-evaluates a server module the same way.
- **`TEST_POOL_MAX = 4`** in `tests/support/db/bounded-postgres.ts` caps every
  pool opened inside the `db` project and the acceptance config, the app's
  client and each test file's own alike. `tests/support/db-project.mts`'s
  `boundedPostgres()` plugin resolves `import postgres from 'postgres'` to that
  file for every module the project transforms (the wrapper's own import is the
  one left to the real package), and the wrapper passes
  `max: min(asked, TEST_POOL_MAX)` and `onread: false`. The second because the
  driver's custom read mode for plaintext connections is ignored by the socket
  msw swaps in when it passes a connection through, so a client opened while msw
  listens fails with `read ENOTCONN`; the app's client sets it too, so test and
  production read the same way. A cap rather than a default: a call site may
  lower it (postgres.js's ordering guarantee is `max: 1`) and cannot raise it.
- **`DB_WORKER_CAP = 12`** in `tests/support/db-project.mts`: the worker count
  is Vitest's default, `availableParallelism() - 1`, but no higher than twelve,
  so the budget is arithmetic over a constant rather than over the cores a
  developer has. `vitest.config.mts` pins its root `maxWorkers` to the same
  number, since the projects share one pool group and Vitest refuses two
  projects in a group that disagree.
- **`max_connections=200`** in `Docker/Dockerfile.postgres`'s `CMD`, the one
  place every consumer of the image reads: compose passes no `command:` and a CI
  `services:` entry cannot. Not `ALTER SYSTEM` in the init script, which bakes
  into `PGDATA`, which an existing `postgres_data` volume keeps ignoring. The
  image's content hash changes with the line, so CI rebuilds it; locally it is
  live after `make docker-build` and a `make docker-up` to recreate the
  container.

The arithmetic: `DB_WORKER_CAP × 2 pools × TEST_POOL_MAX + 1 = 12 × 2 × 4 + 1 =
97 ≤ 200 / 2`. The two pools are the app's and the file's; the `+ 1` is global
setup's admin client, which ends before a worker starts. The per-file clone's
admin client is not a third term: it opens in the setup file, after the previous
file's `afterAll` ended its client, and its `WITH (FORCE)` clone kills the
previous file's app pool. A file that opens a second client of its own (an admin
client on `sorrel`, say) must run it one statement at a time, so the term for
the file's own client still covers it. The other half of the limit is the room
for a second run's whole budget, or the e2e servers: `E2E_SLOTS + 1` of `next
start`, each on postgres.js's default pool of ten.

**Rejected:** passing `max` at every call (sixty files open a client of their
own); postgres.js's `PGMAX` environment variable (undocumented, and any value
becomes a pool of one); `resolve.alias` with a `customResolver` (Vite deprecates
it for the `resolveId` plugin the harness uses); an env var read by
`src/db/connection.ts` alone (bounds the app's pool, not the sixty); fewer
workers (a cap under the cores on hand slows the suite); keeping
`max_connections` at 100 (the pools would have to be two, and two runs would no
longer fit beside the e2e servers).

**The one thing a pool of four changes.** A service that held a transaction
open while reading through the pool outside it would deadlock once four such
calls were in flight. None does: `withAudit` hands its callback the
transaction's own writer, and a test that opens many transactions at once
(`tests/db/repository/write.test.ts`'s twelve) queues on the four and
completes.
