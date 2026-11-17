## Migrations and scripts

Migration files are committed source under `src/db/migrations/`, reviewed like any other change, never generated at deploy or build time.

- **`npm run db:generate`** is `scripts/db-generate.ts`. It runs `drizzle-kit generate`, which diffs `src/modules/*/schema` against the newest `meta/` snapshot and writes a migration for any change, and then deletes every older snapshot (["One snapshot"](#one-snapshot)). Flags after `--` pass through (`--custom`, `--name`). Run it, never a bare `drizzle-kit generate`.
- **`npm run db:migrate [migrationsFolder]`** is `scripts/migrate.ts`, run through `tsx`. It applies every migration not yet recorded in `drizzle.__drizzle_migrations`, which is what makes a rerun idempotent, through drizzle-orm's migrator, so the journal is the one `drizzle-kit migrate` wrote and a database either command migrated is readable by both. The folder defaults to `src/db/migrations`; only the tests pass another. It reads the database from `DATABASE_URL` and applies the lock timeout (["A migration gives up a lock it cannot take"](expand-contract.md)).
- **`npm run db:seed`** runs `scripts/db-seed.ts`, which calls `seed(db, { scenario })` from `src/db/seed/index.ts` and then closes the pool, or the process never exits. `SEED_SCENARIO` picks `minimal` (the default), `standard` or `demo` (["The seed module"](seed-module.md), ["The standard scenario"](standard-scenario.md), ["The demo scenario"](demo-scenario.md)). It runs through `tsx`, alone among the scripts, because bare Node's type stripping resolves no extensionless relative import and the seed has some.
- **`resolveScenario` refuses an unrecognised name** rather than falling back to `minimal`. The CLI and the `db-init` compose service both parse through it, so they cannot disagree about what `demo` means, and a mistyped name fails loudly instead of seeding one user. Unset or blank is `minimal`.
- **`npm run db:drop` and `npm run db:reset`.** `db:drop` calls `dropSchema` (`src/db/seed/reset.ts`); `db:reset` is `db:drop && db:migrate && db:seed`. `dropSchema` drops **two** schemas in one transaction, `public` and `drizzle` (the migration journal). Leaving the journal makes `db:migrate` read every migration as applied and do nothing, and the seed then fails on missing tables. It recreates an empty `public` for migration `0000_enable-extensions` to put `pg_trgm` back into, so a reset is drop _then_ migrate. `SET LOCAL client_min_messages = warning` heads the transaction to silence one NOTICE per dependent object of `DROP ... CASCADE`. Schemas the app does not own are left alone. `drop` is the one destructive verb and refuses `NODE_ENV=production`; no workflow calls it, so the accident it refuses is a production `DATABASE_URL` in a shell.
- **`npm run db:studio`** is `drizzle-kit studio --host 0.0.0.0 --port 4983`, reading the same `drizzle.config.ts`. The UI is hosted at `https://local.drizzle.studio` and connects back to `127.0.0.1:4983`. The devcontainer forwards 4983 (`.devcontainer/devcontainer.json`); from the host, `make docker-studio` starts it as a profiled compose service.
- **A failed migration names its cause.** `drizzle-kit migrate` swallows the driver's error and exits 1 with no message, so `db:migrate` does not run it. `scripts/migrate.ts` catches the failure and prints the failing migration's `.sql` file, Postgres's error code and message, and its `detail` and `hint` when it sends them, then exits 1. A connection that cannot open prints the driver's code and message the same way. Nothing it prints carries `DATABASE_URL`. `drizzle-kit migrate` is no longer used to apply migrations. `migrate.yml` still runs `scripts/probe-database.ts` first, which opens the connection itself and adds a hint for the common causes (unreachable host, wrong password, `sslmode` mismatch, `channel_binding=require` the server cannot offer). Locally, `node scripts/probe-database.ts --file <a dotenv file holding DATABASE_URL>` tells a bad URL from a stopped container. The CI wiring is in `claude-docs/ci/deploy.md`.

### Database container

`Docker/postgres-init/enable-extensions.sql` creates `pg_trgm`, the `sorrel` role and the `sorrel` database. `PGDATA` is populated at image build, so the entrypoint's first-boot creation from `POSTGRES_USER` and `POSTGRES_DB` never runs. It holds no schema or seed data: `db-init` applies both to `sorrel` at container start, and the test harness applies them to its own clones of `sorrel_template`.

`sorrel` holds `CREATEDB` and owns `sorrel_template`. `postgres`'s password is generated and discarded in `Dockerfile.postgres`, so `sorrel` is the only role a runtime connection can use, and cloning a database as a template needs ownership or superuser. That lets the harness (`tests/support/seeded-database.ts`) run `CREATE DATABASE sorrel_test_template TEMPLATE sorrel_template`, clone `sorrel_test_<n>` from it, and by the same route through `sorrel_e2e_template` make each Playwright slot's `sorrel_e2e_<n>` and `sorrel_e2e_providers`. See `../testing/README.md`.

### Hand-written migrations

The SQL files state what each migration does. These are the rules they share.

- **`generate --custom` is for what schema diffing cannot express**: enabling an extension (`0000`), functions and triggers (`set_updated_at()` in `0016`, `forbid_rewrite()` in `0055`, `record_privilege_change()` in `0056`), refills, and any migration made while a column or table drop is pending (procedure in ["Expand/contract and the destructive-DDL check"](expand-contract.md)). `--custom` copies the last snapshot whole, so undeclared columns stay in it.
- **A hand edit to generated SQL is safe** because `db:generate` diffs the newest snapshot, never the statements. Hand-added `IF NOT EXISTS` and `CREATE OR REPLACE TRIGGER` (Postgres 14+; there is no `CREATE TRIGGER IF NOT EXISTS`) make a file a no-op on reapplication independently of the journal. A trigger on a new audited table is added by hand in the table's own migration.
- **Order a migration expand first, contract last**, so each guarantee is held by its replacement before the thing that held it goes (`0017`, `0029`).
- **`pg_trgm` and `unaccent`** are baked into the `sorrel` and `sorrel_template` images (`Docker/postgres-init/`), and `CREATE EXTENSION IF NOT EXISTS` in a migration is what makes a from-scratch database (Neon) match. `0026_unaccent.sql` also creates `unaccent_immutable(text)`, a `LANGUAGE sql` wrapper declared `IMMUTABLE`: `unaccent()` itself is `STABLE` because its dictionary depends on `search_path`, and an expression index takes an immutable function only. `unaccent` is a trusted extension, so the non-superuser `sorrel` and a Neon role may create it, and a C-language wrapper would need superuser. The `*_unaccent_trgm` indexes sit beside the raw trigram indexes, not in their place, since the fuzzy finders still match the raw columns (["The compendium read"](compendium-read.md), ["The grimoire search"](grimoire.md#the-grimoire-search)).
- **`set_updated_at()` skips a no-op `UPDATE`**, keeping both `updated_at` and `updated_by`; replacing its body touches no trigger and drops nothing (["`updated_at` is the database's"](updated-at.md)).
- **A refill copies a replaced column's data again** in a data-only `--custom` migration, for whatever the deploy before the switch wrote (`0031`, `0035`, `0058`, `0059` use `ON CONFLICT ("id") DO NOTHING`). Its contract migration may copy once more before the drop (["Expand/contract and the destructive-DDL check"](expand-contract.md)). The ingredient lists, substitutes and deities follow this route (["The ingredient identity model"](identity-model.md)).
- **A fill is tested until it ships.** While a migration is a branch's, a test may restore what it reads and re-run its SQL, read off disk. Once it is in `src/db/migrations/meta/_journal.json` the SQL never changes, so the test goes and the resulting tables' shape tests stay (["What a test may assert"](../testing/layer-ownership.md)).
- **Append-only ledgers** (`user_privilege_changes`) refuse `UPDATE` and `DELETE` through `forbid_rewrite()`, one function for every ledger ([`write-path.md`](write-path.md), the privilege-ledger decision `../design-decisions/auth.md`, "One privilege ledger, written by the database").

### One snapshot

**`src/db/migrations/meta/` holds `_journal.json` and one snapshot, the newest
journal entry's** (`<NNNN>_snapshot.json`, `NNNN` being the tag's number). `drizzle-kit generate`
checks the folder's snapshots for format and for two sharing a parent, then
diffs the schema against the newest alone; `db:migrate` reads the
journal and the `.sql` files and opens no snapshot. The older ones were 80% of
every line under `src/` and are read by nothing, so `npm run db:generate` deletes
them after each run, and git history keeps them.
Run `db:generate`, never a bare `drizzle-kit generate`, which leaves the old
one beside the new: `tests/guards/migration-snapshots.test.ts` fails a folder
with more than one snapshot, or with one that is not the newest entry's.
`generate --custom` copies the newest snapshot as before, and the wrapper takes
the flag through.

### Migration order

**`db:migrate` applies a migration by its journal `when`, nothing else.**
Drizzle's migrator reads the newest `created_at` in
`drizzle.__drizzle_migrations` and applies only the `_journal.json` entries
whose `when` is later; it compares no tag or hash (`migrate` in
`drizzle-orm/pg-core/dialect.js`), and a tie is skipped too. `when` is stamped
when the author runs `generate`, so with several migration branches in flight
one can reach staging older than a migration already applied there:
`migrate.yml` passes, the migration never runs, and the deploy meets a schema
it expects and does not have. No test sees it, since a test database starts
empty and runs every migration.

**`npm run check:migration-order` refuses that before the merge** (`scripts/check-migration-order.ts`). It reads the branch's journal from the
working tree, so a just-generated migration counts, against the base's
committed one, the base resolving as `check:destructive-ddl`'s does
(`-- --base <ref>` picks another). An entry is the branch's when the base has
no entry of its tag, and it is refused when it sits ahead of an entry the base
has, or when its `when` is no later than the base's newest; the journal as a
whole is refused wherever `when` fails to rise. In CI it is the
`checks / migration-order` leg ([`ci/reusable-checks.md`](../ci/reusable-checks.md)).
A run is only as current as the base it read: a branch whose base moves after
it passed is checked again on its next push, which the merge of the new base
that a journal conflict forces will be.

**A refused migration is regenerated on the current base**, not re-dated:
`meta/<NNNN>_snapshot.json`'s `prevId` must name the base's newest snapshot as
well, which only `generate` rewrites.

1. Merge the base into the branch.
2. Delete the migration's `.sql`, and take the base's `meta/` folder whole
   (`git checkout <base> -- src/db/migrations/meta`): its journal, and the one
   snapshot `generate` must diff against, since the branch's own run deleted
   the base's.
3. Run `npm run db:generate -- --name <its name>`, the name after the old
   number. It numbers the migration after the base's and stamps a new `when`.
4. Put back whatever was written into the SQL by hand (a header comment, a
   trigger, a refill), and strip a pending column drop as
   [rule 10](expand-contract.md) requires while one is in flight.
5. Run `npm run check:migration-order` and `npm run check:destructive-ddl`; a
   renamed migration carries its `.ack.md` sidecar under its new tag.
