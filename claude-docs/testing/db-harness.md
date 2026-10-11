## The db test harness — `tests/support/db/` (MB.51)

Two modules the `tests/db/` and `tests/modules/` files share, a sweep built
on them, and the setup inserter. They sit in their own directory under `tests/support/` because
the rest of `tests/support/` may not import `drizzle-orm` at runtime —
`.oxlintrc.json`'s `no-restricted-imports` bans it everywhere but the database
layer and its tests (CLAUDE.md rule 4), and
`tests/guards/lint-db-client-boundary.test.ts` probes that ban by writing a
runtime import into `tests/support/` and asserting the lint fires.
`getTableConfig` from `drizzle-orm/pg-core` is what `table-metadata.ts` is
made of, so the database-layer override names `tests/support/db/**/*.ts`
beside `tests/db/**/*.ts` and `tests/modules/**/*.ts`;
`lint-db-client-boundary.test.ts` lists `tests/support/db` among its `EXEMPT`
probes, which proves the override actually reaches the harness.
`vitest.config.mts` collects only `*.test.ts` files, so a module there is never
run as a test.

- **`database.ts` — `useTestDatabase(bind)` and `failureOf(work)`.**
  `useTestDatabase` registers a `beforeAll` that opens one `postgres` client
  (reading `DATABASE_URL` inside the hook, after `db-setup.ts` has pointed it
  at the worker's clone) and an `afterAll` that ends it, and returns the
  catalogue reads — `columnNames(table)` and `indexRow(table, name)` —
  closing over that client. **It is per file, not
  per worker, and that is not a style choice:** `db-setup.ts` re-clones the
  worker's database `WITH (FORCE)` before every test file, which terminates
  any session still open on it, so a connection shared across files would be
  killed by the next file's clone. The sessions it ends include an autovacuum
  worker's, which the test role may end only because the database image grants
  it `pg_signal_backend` ([`ci/database-image.md`](../ci/database-image.md)).
  Vitest's default `sequence.hooks` is `stack`, so a call at the top of a
  file opens before the file's own `beforeAll` (the ones that read seeded ids by name) and closes after its
  `afterAll` — no reordering needed. It hands the client to a `bind` callback
  rather than returning it so a file's existing `let sql` and every
  `` sql`…` ``, `sql(row)`, `sql(table)`, `sql.begin` and `sql.unsafe` call on
  it stay exactly as written:

  ```ts
  let sql: ReturnType<typeof postgres>;
  const catalogue = useTestDatabase((client) => (sql = client));
  ```

  `repository/*.test.ts` (through `tests/support/db/probe-tables.ts`), `updated-at-trigger.test.ts`,
  `test-database-isolation.test.ts` and `tests/db/seed/*` still open their
  own client — the isolation test's subject _is_ the connection, and the
  others either read the clone as the template built it or truncate
  everything before a seed run they assert (MB.183).

- **`table-metadata.ts` — the Drizzle half.** `tableFacts(table)` is
  `getTableConfig` plus the lookups every schema test used to build by hand:
  `byName`, `byIndexName`, `foreignKeyByColumn` (each entry
  `{ column, name, foreignColumnName, foreignTable }`) and
  `nonAuditForeignKeys`, the table's own references with the audit ids
  filtered out. `AUDIT_COLUMNS`, `STAMP_COLUMNS` and `DELETE_COLUMNS` are
  **literal string lists, deliberately not derived from `src/db/audit.ts`**:
  a test comparing a table against `Object.keys(auditColumns)` passes for any
  value of `auditColumns`, an empty one included. `AUDITED_TABLES` (twenty-six
  names, the two hard-deleted join tables among them) and
  `UNAUDITED_TABLES` (Better Auth's `accounts`, `sessions`, `verifications`)
  moved here from `updated-at-trigger.test.ts` so the trigger sweep and the
  audit-columns sweep read one list. `APPEND_ONLY_TABLES` names the tables
  carrying a `forbid_rewrite` trigger (MB.194); the trigger's refusals are
  `user-privilege-changes-schema.test.ts`'s and
  `tests/db/privilege-change-trigger.test.ts`'s (MB.225).

- **`insert-ingredient.ts` — `insertIngredient(sql, fixture, author)`** (MB.101).
  The setup inserter for an ingredient and its children, on the raw client and
  in one transaction. Why setup goes this way rather than through `withAudit`
  is under ["Fixture factories"](fixture-factories.md), where the convention is stated. It
  has no test of its own: it is the harness, proved by every test seeding
  through it (MB.225).

- **`insert-spell.ts` — `insertSpell(sql, fixture, author)`** (M5.3). The
  same for a spell: its row, its layers and its assigned categories, on
  `insertIngredient`'s terms. `author` is `created_by`, which is whom a
  private spell is readable by, and a layer's ingredient id is written as
  given, which is how a test writes the cross-coven link a finder must
  withhold.

- **`tests/db/audit-columns.test.ts` — one sweep instead of a copy per
  file, on the catalogue side** (MB.188, one `it` since MB.225). It asserts
  `AUDITED_TABLES` are exactly the tables the catalogue finds carrying the
  four stamps, and holds each to its expectation at once: the twenty-four
  six-column tables and the two four-column join tables, the stamps `NOT
NULL`, the delete pair nullable or absent, and each `*_by` referencing
  `users(id)`. It reads `getTableConfig` nowhere. The code side is the
  module schema tests': **each asserts its table's exact column set,
  `[...OWN, ...AUDIT_COLUMNS]` or `[...OWN, ...STAMP_COLUMNS]`**, which is
  what fails when a spread leaves a schema file — the migrated database's
  columns would stand, so the catalogue alone would stay green
  (`tests/db/audit.test.ts` covers `applyAudit` alone). The `UNAUDITED_TABLES` are asserted to exist
  with an `updated_at` and carry none of the three audit ids by name
  (`sessions.impersonated_by` is no audit id, MB.53), which is what stops the
  sweep being satisfied by a table with nothing to check. A new audited table
  added without `...auditColumns` fails its own schema test, and one the list
  does not name fails this file.

- **`tests/db/partial-unique-indexes.test.ts` — rule 4 once, for every
  table** (MB.188). One test reads every partial unique index in `public`
  from `pg_index`, with each column its key, expressions and predicate read
  (through `pg_depend`), asserts the set non-empty and every index
  classified in its `ROWS` map — keyed by index rather than table, since one
  table's indexes can sit on opposite sides of a predicate — then, per index,
  inserts a holder, proves a second live row sharing those columns is refused
  by that index by name, soft-deletes the holder and proves the same row is
  admitted. A per-index `clash` names the columns to share where the
  catalogue's list would collide on another index first or names a generated
  column (`ingredients.canonical_key`). A new partial unique index fails the
  sweep until it is classified; a schema test keeps only what is particular to
  its table, such as a slug shared across two groups.

- **`tests/db/schema-drift.test.ts` — the schema files against the migrated
  database, once for every table** (MB.226). It imports every
  `src/modules/*/schema/*.ts`, asserts the tables it finds non-empty and
  exactly the `public` tables the catalogue holds, then, per table, compares
  what `tableFacts` reads off `getTableConfig` with the catalogue: each
  column's name, type (`format_type`, Drizzle's spelling normalised),
  nullability and whether the database fills a default; each foreign key's
  name, columns, target and `ON DELETE`; the CHECK names; and each index's
  name, uniqueness and whether it is partial. A schema file edited without its
  migration, or a migration without its schema file, fails here, which is why no
  module schema test carries a foreign-key, NOT NULL, type or index-name case.
  What a CHECK or an index _refuses_ is not compared, and stays the module
  schema test's or the partial-unique sweep's.

  **`PENDING_DROPS` declares the expand/contract window.** A column or index
  drop is two PRs (CLAUDE.md rule 10): the first removes the declaration and
  ships no migration, so until the second lands the migrated database holds an
  object the schema no longer declares. The undeclare task adds a line to the
  file's `PENDING_DROPS` — table, kind (`column`, `index`, `check`,
  `foreignKey` or `table`), name, and the task that drops it — and the
  comparison leaves that object out; the drop task removes the line. A line
  left behind fails the file's last test, which asserts every pending drop
  still names an object the catalogue holds, so the window is declared rather
  than tolerated.

**What a module schema test asserts** (MB.226). Its table's exact column set
on the code side, and the behaviour particular to that table: each CHECK's
refusal with the row it would otherwise admit, identity and tier rules, a
trigger's effect, a default the domain depends on, and a closed list as one
accepted value, one refused and one equality of the database's `enum_range`
against the code's. Not the catalogue twin of its columns
(`audit-columns.test.ts`), a foreign key, NOT NULL or index name (the drift
test), a second live row refused or freed by a soft delete (the partial-unique
sweep), a `getTableConfig` property pin, a "no such column" case (the exact
set already fails), one case per enum member, or a shipped migration's data
test, which retires once its migration is in the journal
(["Migrations and scripts"](../db/migrations-and-scripts.md)). The eight
curated vocabularies run off one registry-driven file,
`tests/modules/vocabulary/schema/vocabularies.test.ts`, over
`src/db/vocabularies.ts`'s `TWO_TIER` and `FLAT`, and the two category join
tables off one template, `tests/modules/ingredients/schema/join-tables.test.ts`.

### Connections per run (MB.179)

A `db` run can fail tests that pass alone. During M5.5 the OAuth sign-in
tests in `tests/db/email-change.test.ts`, `tests/db/email-verification.test.ts`
and `tests/modules/identity/services/provisional-accounts.test.ts` failed
together, the sign-in start answering 500 with `remaining connection slots are
reserved for roles with the SUPERUSER attribute`, and passed one file at a
time. Postgres had run out of its hundred connections under the sign-in's
insert into `verifications`, and which test fails depends on the room left by
whatever else holds connections at that moment — another session's run, a
`next dev` idle on `sorrel`, an e2e server left on `sorrel_e2e_*`.

**What a run held.** Measured on the twelve-core devcontainer (eleven
workers) by polling `pg_stat_activity` every 250 ms through a full
`npm run test:coverage` — the run started with `PGAPPNAME` set, which
postgres.js sends as `application_name`, so its connections are told apart
from every other session's — with another session's eleven idle connections
on `sorrel` excluded: a peak of **59 connections of the run's own** (70 on the
server), twelve seconds in; per worker, peaks of 22, 19, 12, 12, 11, 10, 7, 6,
5, 3 and 3 on the eleven `sorrel_test_<n>` clones, one on the template, and
eleven at once on `sorrel` at the start, when every worker's first clone
opened its admin client together. The 22 is the shape of the problem: the
app's client in `src/db/connection.ts` and the client the test file opened
are each postgres.js's default pool of ten, and a file that fires its queries
concurrently — a loader test, a seed test — fills both. The configured worst
case was eleven workers × (10 + 10) = 220 slots of 100; a second run beside
the first was enough to cross the line. The 22 had a second cause, found
once the pools were capped and the number barely moved: twelve of the
identity and OAuth tests — the three from M5.5 among them — call
`vi.resetModules()` to rebuild Better Auth under another environment, and
every reset re-evaluated `src/db/connection.ts`, which opened a client per
evaluation and ended none, so a worker idled on several pools' worth of
connections at once, each only seconds old.

**The bound.** One client per process, and three configured numbers, which
move together: raising any one without the others breaks the arithmetic below.

- **One app client per process per URL**, kept on `globalThis` by
  `src/db/connection.ts` rather than in the module's scope, so a
  re-evaluated module reuses the pool the first evaluation opened. Keyed by
  the URL, so a test that repoints `DATABASE_URL` still gets its own. The
  same shape guards `next dev`, whose hot reload re-evaluates a server
  module the same way — the dev server idling on `sorrel` through these
  measurements grew from eleven connections to twenty-seven. It was measured
  with a burst through `withAudit`, a reset, a second burst through the
  re-imported repository: the clone held the cap's worth of connections
  rather than two caps' worth.

- **`TEST_POOL_MAX = 4`** in `tests/support/db/bounded-postgres.ts` — a cap on
  every pool opened inside the `db` project and the acceptance config, the
  app's client and each test file's own alike. `tests/support/db-project.mts`'s
  `boundedPostgres()` plugin resolves `import postgres from 'postgres'` to
  that file for every module the project transforms (the wrapper's own import
  is the one left to the real package), and the wrapper passes
  `max: min(asked, TEST_POOL_MAX)`. A cap rather than a default: a call site
  may lower it (postgres.js's ordering guarantee is `max: 1`) and cannot raise
  it. Measured at the server, a burst three times the cap wide, counted
  mid-flight in `pg_stat_activity`, opened exactly the cap for the app's
  client through `withAudit`, for a client a file opens, and for one asking
  for more; one asking for less kept its own.
- **`DB_WORKER_CAP = 12`** in `tests/support/db-project.mts` — the worker count
  is still Vitest's default, `availableParallelism() - 1`, but no higher than
  twelve, so the budget is arithmetic over a constant rather than over the
  cores a developer happens to have. Twelve clears every machine the suite
  runs on today (eleven workers here, seven on CI's eight vCPUs), so nothing
  slows; `vitest.config.mts` pins its root `maxWorkers` to the same number,
  since the projects share one pool group and Vitest refuses two projects in
  a group that disagree.
- **`max_connections=200`** in `Docker/Dockerfile.postgres`'s `CMD`, the one
  place every consumer of the image reads: compose passes no `command:` and a
  CI `services:` entry cannot. Not `ALTER SYSTEM` in the init script, which
  bakes into `PGDATA` and so into the image's copy of it, which an existing
  `postgres_data` volume keeps ignoring. The image's content hash changes with
  the line, so CI rebuilds it on the PR; locally it is live after
  `make docker-build` and a `make docker-up` to recreate the container. Until
  then the live limit stays 100, which a single run's worst case still fits.

The arithmetic: `DB_WORKER_CAP × 2 pools × TEST_POOL_MAX + 1 =
12 × 2 × 4 + 1 = 97 ≤ 200 / 2`. The two pools are the app's and the file's;
the `+ 1` is the run's one client outside the workers, global setup's admin
client, which ends before a worker starts. The per-file clone's admin client
is not a third term: it opens in the setup file, after the previous file's
`afterAll` ended its client and before `useTestDatabase`'s `beforeAll` opens
the next, and the `WITH (FORCE)` clone it runs kills the previous file's app
pool. A file that opens a second client of its own (an admin client on
`sorrel`, say) must run it one statement at a time, so it holds one
connection and the term for the file's own client still covers it; a file
that fired bursts through two clients of its own at once would be the thing
to change. The other half of the limit is the room the task asked for: a
second run's whole budget, or the e2e servers — `E2E_SLOTS + 1` of
`next start`, each on postgres.js's default pool of ten.

**After the bound**, the same measurement: a peak of **28 connections of the
run's own** (63 on the server, beside the `next dev` idling on `sorrel`
and an e2e `next start` holding its ten), sixteen seconds in; per worker, 9
on the clone running the budget measurement itself — its watcher, the app's
four and its own four — and 5 or fewer on every other,
with the eleven admin clients on `sorrel` at the start unchanged. The three
files from M5.5 passed together ten runs in a row beside that server, the
loop peaking at six connections. The run is no slower: 103 s against 139 s
before, on a machine shared with other sessions either time.

**What was rejected.** Passing `max` at every call: sixty files open a client
of their own, and the sixty-first forgets. The environment variable
postgres.js reads for `max` (`PGMAX`): undocumented, and the string it hands
to `Array()` makes any value a pool of one. `resolve.alias` with a
`customResolver`: Vite deprecates it in favour of the `resolveId` plugin the
harness uses. An env var read by `src/db/connection.ts` alone: bounds the
app's pool and leaves the sixty. Fewer workers: a cap under the cores on hand
slows the suite, and twelve slows none. Keeping `max_connections` at 100: the
pools would have to be two, and two runs would no longer fit beside the e2e
servers.

**The one thing a pool of four changes.** A service that held a transaction
open while reading through the pool outside it would deadlock once four such
calls were in flight, where ten were needed before. None does: `withAudit`
hands its callback the transaction's own writer, and a test that opens many
transactions at once (`tests/db/repository/write.test.ts`'s twelve) queues on
the four and completes.
