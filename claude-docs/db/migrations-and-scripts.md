## Migrations and scripts (M1.3)

- **`npm run db:generate`** is `drizzle-kit generate` — diffs `src/modules/*/schema`
  against `src/db/migrations` and writes a new migration for any change. The
  first migration (`0000_enable-extensions.sql`) was written by hand with
  `drizzle-kit generate --custom`, since enabling an extension isn't
  something schema-diffing can express; `0001_lucky_centennial.sql` (M2.2) is
  the first one it actually generated, from `users.ts` and `auth.ts` (now `src/modules/identity/schema/`)
  — see `claude-docs/auth/tables.md`.
- **`npm run db:migrate`** is `drizzle-kit migrate` — applies every migration
  under `src/db/migrations` not yet recorded in the `drizzle` schema's
  `__drizzle_migrations` table it creates on first run. That table is what
  makes re-running idempotent: a migration already recorded is skipped, not
  reapplied.
- **A failed migration names its cause, since MB.49.** `drizzle-kit migrate`
  catches whatever the driver throws and exits 1 without printing it, so a
  failure against staging once read in full:

  ```
  Using 'postgres' driver for database querying
  [⣟] applying migrations...
  ##[error]Process completed with exit code 1.
  ```

  An unreachable host, a wrong password, an `sslmode` mismatch and a
  `channel_binding` parameter all produce that byte-identical output — the
  shape carries no information at all. `migrate.yml` therefore runs
  `scripts/probe-database.ts` first, which opens the connection itself and
  prints the driver's error code and message (`ECONNREFUSED`, `ENOTFOUND`,
  `28P01`, `3D000`, `42704`) before drizzle-kit can swallow it. Locally the
  same script is the fastest way to tell a bad URL from a stopped container:
  `node scripts/probe-database.ts --file <a dotenv file holding DATABASE_URL>`.
  `claude-docs/ci/deploy.md` carries the CI wiring.

- **`0000_enable-extensions.sql`** runs `CREATE EXTENSION IF NOT EXISTS pg_trgm`
  — the only extension DESIGN.md §5 names (the fuzzy duplicate-name
  warning's `gin_trgm_ops` index). `IF NOT EXISTS` also makes it a no-op
  against `sorrel`/`sorrel_template`, which already have `pg_trgm` baked in
  at the Postgres image's build time (`Docker/postgres-init/`) — the
  migration is what makes a from-scratch database (e.g. Neon) match.
- **`0011_breezy_bastion.sql`** (M4.6) creates `ingredients_trgm`, the
  multicolumn `gin_trgm_ops` index DESIGN.md §9's fuzzy duplicate warning
  reads. `drizzle-kit generate` wrote the statement; the `IF NOT EXISTS` was
  added by hand, for the reason 0000 carries one — the journal already skips an
  applied migration, and the keyword makes re-applying the file a no-op
  independently of it. Hand-editing the SQL is safe here because `db:generate`
  diffs the `meta/` snapshots rather than the statements, so the keyword
  changes nothing a later generate sees.
- **`0016_updated-at-trigger.sql`** (M1.18) is the third hand-written one,
  again via `generate --custom`: it adds the `set_updated_at()` trigger
  function and attaches it to every audited table, neither of which schema
  diffing can express. `CREATE OR REPLACE TRIGGER` (Postgres 14+) is the
  idempotent form — there is no `CREATE TRIGGER IF NOT EXISTS` — so
  re-applying the file is a no-op independently of the journal, for the same
  reason 0000 and 0011 carry an `IF NOT EXISTS`, and it needs no
  destructive-DDL acknowledgement because it drops nothing. See
  ["`updated_at` is the database's"](updated-at.md).
- **`0017_custom-spell-ingredients.sql`** (MB.40) reshapes `spell_ingredients`
  so a layer may be a custom, one-off ingredient — see
  ["Custom ingredients"](grimoire.md#custom-ingredients-mb40)
  under the grimoire. `drizzle-kit generate` wrote the statements and the file
  was reordered by hand, expand first (two columns, two partial unique indexes,
  four checks) and contract last (the `(spell_id, ingredient_id)` primary key
  replaced by `(spell_id, layer_order)`, `ingredient_id` made nullable, the old
  layer index dropped as redundant), so every guarantee is held by its
  replacement before the thing that used to hold it goes. It is the first
  migration here to carry rule 10's destructive-DDL acknowledgement, for the
  `DROP CONSTRAINT` and the `DROP INDEX`; `DROP NOT NULL` widens and is exempt.
  A contract migration was affordable because the table was empty and
  unqueried — the table-task-then-behaviour-task rule paying out.
- **`0026_unaccent.sql`** (M8.5) is the fourth hand-written one, via
  `generate --custom`: `CREATE EXTENSION IF NOT EXISTS unaccent`, for the
  compendium search's accent folding, and `unaccent_immutable(text)`, a
  SQL-language wrapper declared `IMMUTABLE` because it names the dictionary —
  `unaccent()` itself is `STABLE`, since which dictionary it reads depends on
  `search_path`, and an expression index takes an immutable function only.
  `IF NOT EXISTS` for 0000's reason: `sorrel_template`/`sorrel` have the
  extension from the image build (`Docker/postgres-init/`), and the migration
  is what makes a from-scratch database match. A trusted extension, so
  `sorrel`, no superuser, and a Neon role may create it; `LANGUAGE sql`
  because a C-language wrapper would need superuser.
- **`0027_unaccent-indexes.sql`** (M8.5) adds `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm`, `gin_trgm_ops` over
  `unaccent_immutable(…)` of the searched columns — beside the raw trigram
  indexes rather than in their place, since the fuzzy finders still match the
  raw columns. `drizzle-kit generate` wrote the statements; `IF NOT EXISTS`
  was added by hand, as 0011's was. See
  ["The compendium read"](compendium-read.md).
- **`0029_spell-layers-soft-delete.sql`** (MB.110) makes `spell_ingredients`
  soft-deleted — see
  ["Layer order is the identity"](grimoire.md#layer-order-is-the-identity-and-what-that-costs-the-reorder)
  under the grimoire.
  `drizzle-kit generate` wrote the statements and the file was reordered by
  hand, as 0017 was: the delete columns and the partial layer index first,
  while every row is live, then the `(spell_id, layer_order)` key dropped for
  a surrogate `id`, then the other two partial indexes re-created under their
  own names with `deleted_at IS NULL` added. Its sidecar acknowledges the three
  drops and says why it is one PR rather than rule 10's two: no column is
  dropped, and nothing in `src/` names the constraints.
- **`0030_ingredient-lists.sql`** (MB.135) is the expand of MB.134's lists:
  `drizzle-kit generate` wrote the three `ADD COLUMN`s for `planets`,
  `zodiac_signs` and `colors`, and the fill was added by hand, one `UPDATE`
  per list copying its single column as a one-entry array where one is set.
  The template is migrated before it is seeded, so its lists start empty and
  `ingredient-lists.test.ts` re-runs the migration's own `UPDATE`s against the
  seeded rows. See
  ["The ingredient identity model"](identity-model.md).
- **`0031_refill-ingredient-lists.sql`** (MB.136) is the fifth hand-written
  one, via `generate --custom`, and fills the lists again from the singles
  MB.136 stops declaring, for anything the live deploy wrote after 0030. It
  had to be `--custom`: a plain `generate` diffs the schema, which no longer
  declares the singles, and would have emitted MB.137's drop, while
  `--custom` copies the last snapshot whole, so the singles stay in it.
  Data only, so no sidecar. The seed writes lists since MB.136, so
  `ingredient-lists.test.ts` puts the seeded rows back as a deployed database
  held them before re-running either fill. See
  ["The ingredient identity model"](identity-model.md).
- **`0032_ingredient-substitutes.sql`** (MB.139) and **`0033_deities.sql`**
  (MB.128) add tables while drops are pending, so both are `generate --custom`
  with their DDL taken from a `generate` run in a scratch copy, the pending
  drops left out and the snapshot extended by hand — the procedure is
  ["Expand/contract"](expand-contract.md). 0033 adds `deity_traditions` and
  `deities`, with their two `set_updated_at` triggers; see
  ["The deity vocabulary"](deity-vocabulary.md).
- **`0034_element-list.sql`** (MB.158) is the expand of MB.157's list, made
  the way 0032 was, because MB.137's and MB.141's drops are still pending.
  Its `ADD COLUMN` for `elements` came from the scratch `generate`. The fill
  was added by hand, as 0030's was: one `UPDATE` copying `element` as a
  one-entry array where one is set. `element-list.test.ts` re-runs that
  `UPDATE` against the seeded rows. See
  ["The ingredient identity model"](identity-model.md).
- **`0035_refill-element-list.sql`** (MB.159) is 0031 again for MB.157's
  list: `generate --custom`, so `element`, which MB.159 stops declaring,
  stays in the copied snapshot until MB.160 drops it. One
  `UPDATE` rederives `elements` from `element` for every row that
  disagrees, for anything the live deploy wrote after 0034. Data only, so no
  sidecar. The seed writes lists since MB.159, so `element-list.test.ts`
  put the seeded rows back as a deployed database held them before
  re-running either fill, until 0037 dropped the column both read. See
  ["The ingredient identity model"](identity-model.md).
- **`0036_drop-ingredient-singles.sql`** (MB.137) is the contract of MB.134's
  lists: `drizzle-kit generate` wrote the three `DROP COLUMN`s for `planet`,
  `zodiac` and `color` and a fourth for `substitutes`, which was cut, its
  column kept in the snapshot, since that drop is MB.141's. It fills nothing
  first, and its sidecar says why and gates it on a production release
  carrying MB.136. See ["The ingredient identity model"](identity-model.md).
- **`0037_drop-element.sql`** (MB.160) is the contract of MB.157's list: one
  `DROP COLUMN "element"`, with its `.ack.md` sidecar, and no last fill.
  It is `generate --custom`, because a plain `generate` would also emit
  MB.141's pending drop; its snapshot is 0036's with `element` deleted and
  nothing else changed. `element-list.test.ts` asserts the column gone, the
  type kept, and the drop as the file's only statement. See
  ["The ingredient identity model"](identity-model.md).
- **`0038_unknown-carries-formal-name.sql`** (MB.161) replaces
  `ingredients_nomenclature_declares_canonical_name` under the same name,
  so that an `unknown` entry may carry a formal name; see
  ["The ingredient identity model"](identity-model.md). `generate --custom`
  for the reason 0032 to 0034 were, MB.141's drop still pending: the two
  constraint statements taken from a scratch `generate`, and the snapshot's
  CHECK value changed by hand.
  Its sidecar acknowledges the `DROP CONSTRAINT` and says why it is one PR:
  the new CHECK only widens, and nothing reads a CHECK.
- **`0039_drop-substitutes-list.sql`** (MB.141) is the contract of MB.140's
  switch, and the first plain `generate` since 0031: with every other drop
  landed, it emitted the `DROP COLUMN "substitutes"` alone. Before the drop
  it copies across, as names, any list entry the table holds no row for, live
  or removed, in any case. Its sidecar acknowledges the drop and says why it
  is safe on production: v0.5.0 shipped MB.140 first.
  `ingredient-substitutes-schema.test.ts` adds the column back in its clone
  to re-run both fills. See ["Expand/contract"](expand-contract.md).
- **`0043_admin-role-changes.sql`** (MB.58) is a plain `generate` of
  `admin_role_changes` and its enum, with three statements added by hand: the
  table's `set_updated_at` trigger; the demotion of the seed's bootstrap user,
  which a database seeded before MB.58 holds as an admin and the seed never
  rewrites; and the backfill, one `bootstrap` row for every live admin,
  stamped as that admin. Both data statements re-run in
  `admin-role-changes-schema.test.ts`. See [M2.9's record](../design-decisions/m2.9-granting-admin.md),
  "What the audit trail records".
- **`0044_admin-role-change-pauses.sql`** (MB.62) creates
  `admin_role_change_pauses`, its pair CHECK and its one-open index, with the
  `set_updated_at` trigger added by hand. It writes no row: nothing is paused
  until someone pauses ([`mb.62-pause-ledger.md`](../design-decisions/mb.62-pause-ledger.md)).
  It was made while MB.168's drop of `ingredients.deities` was pending, so
  the drop `generate` also emitted is left out and the column kept in
  `0044_snapshot.json`: the state ["Expand/contract"](expand-contract.md)'s
  procedure leaves, and a scratch `generate` from it emits that drop alone.
- **`0046_admin-invitations.sql`** (MB.69) creates `admin_invitations` and
  its partial unique index on `token_hash`, with the `set_updated_at` trigger
  added by hand (["Admin invitations"](invitations.md)). Made while MB.168's
  drop was still pending, it leaves that drop out and keeps the column in
  `0046_snapshot.json`, as 0044 does.
- **`0048_drop-deities-list.sql`** (MB.168) is the contract of MB.167's
  switch, a plain `generate` as 0039 was: it emitted the
  `DROP COLUMN "deities"` alone. Before the drop it copies across, as
  unlinked names, any list entry the ingredient holds no row for, linked or
  not, live or removed, in any case, each after the ingredient's live rows in
  the list's order. Its sidecar acknowledges the drop, and says why production
  is not its gate: production is not live, the owner's call, so the release
  carrying MB.167 carries this too, and v0.5.0's reads fail only for that
  rollout. `ingredient-deities-schema.test.ts` adds the column back in its
  clone to re-run both fills. See ["Expand/contract"](expand-contract.md).
- **Migration files are committed**, not generated at deploy/build time —
  `src/db/migrations/**` is real source, reviewed like any other change.
- **`npm run db:seed`** runs `scripts/db-seed.ts`, which calls
  `seed(db, { scenario })` from `src/db/seed/index.ts` and then
  closes the pool `connection.ts` opened, or the process never exits.
  All three scenarios are implemented (M1.21, M1.22, M1.23 — ["The seed
  module"](seed-module.md), ["The standard scenario"](standard-scenario.md) and
  ["The demo scenario"](demo-scenario.md)) and all
  three are reachable from the CLI as of M1.24: **`SEED_SCENARIO`** picks one,
  defaulting to `minimal`. The script runs
  through **`tsx`**, alone among the scripts: bare Node's type stripping
  resolves no extensionless relative import, and the seed is the first thing
  under `src/` a script executes that has one.
- **`resolveScenario` (M1.24) refuses an unrecognised name rather than falling
  back to `minimal`.** Both readers of `SEED_SCENARIO` — the CLI and the
  `db-init` compose service through it — go through that one parse, so they
  cannot disagree about what `demo` means. A silent fallback would hand
  someone who mistyped `demo` one system user and one user, and they would then
  debug the app rather than the variable. Unset or blank is still `minimal`.
- **`npm run db:drop` and `npm run db:reset`** (M1.24). `db:drop` calls
  `dropSchema` from `src/db/seed/reset.ts`; `db:reset` is `db:drop &&
db:migrate && db:seed`, and that first step is what makes it a reset rather
  than a re-run. `dropSchema` drops **two** schemas inside one transaction:
  `public` (the tables, the enums, `set_updated_at()`, `pg_trgm`) and
  `drizzle` (drizzle-kit's `__drizzle_migrations` journal). Leaving the
  journal is the trap — `db:migrate` reads every migration as already applied,
  does nothing, and the seed then fails on tables that are gone. It recreates
  an empty `public` for migration `0000_enable-extensions` to put `pg_trgm`
  back into, which is why the reset is drop _then_ migrate and never a drop
  alone. A `SET LOCAL client_min_messages = warning` rides at the head of the
  transaction: `DROP ... CASCADE` emits a NOTICE per dependent object, around
  thirty of them by Wave 4, each rendered by postgres-js as a multi-line
  object that reads like a stack trace. Schemas the app does not own are left
  alone. `drop` is the one destructive verb in the CLI and refuses to run
  under `NODE_ENV=production`; nothing in `deploy.yml` or `migrate.yml` calls
  it, so the accident worth refusing is a production `DATABASE_URL` in a shell
  that also has this script.
- **`Docker/postgres-init/enable-extensions.sql`** also creates the `sorrel`
  role and database now, not just `pg_trgm`. Without it, a container built
  from `Dockerfile.postgres` would never get a `sorrel` role/database at
  all: `PGDATA` is already populated at image build time, so the entrypoint's
  usual first-boot "create `POSTGRES_USER`/`POSTGRES_DB` from env" step never
  runs for it. Still no schema or seed data: `db-init` applies both to
  `sorrel` at container start (M1.24), and the test harness applies them to
  its own clones of `sorrel_template` at test-run setup (M1.27) — nothing is
  baked in.
- **`sorrel` holds `CREATEDB` and owns `sorrel_template`** (M1.9), granted in
  the same init script. `postgres`'s own password is generated and discarded
  within that build step (`Dockerfile.postgres`), so `sorrel` is the only
  role any runtime connection can ever authenticate as — and cloning a
  database as a template requires either owning it or being a superuser.
  This is what lets the test harness (`tests/support/seeded-database.ts`)
  run `CREATE DATABASE sorrel_test_template TEMPLATE sorrel_template` as
  `sorrel`, migrate and seed that, and clone `sorrel_test_<n>` from it — and,
  by the same route through `sorrel_e2e_template`, each Playwright worker
  slot's `sorrel_e2e_<n>` and the configured-providers server's
  `sorrel_e2e_providers`. See `testing.md`.
- **`npm run db:studio`** (`make db-studio`, MB.21) is `drizzle-kit studio
--host 0.0.0.0 --port 4983`. It reads the same `drizzle.config.ts` as
  `db:generate`/`db:migrate` — no separate configuration — and needs no
  schema or seed data to work, it just shows empty tables until M1.21–M1.23
  land. The UI itself is hosted at `https://local.drizzle.studio`; the page
  connects from the browser back to `127.0.0.1:4983`, so the server only
  ever needs to serve data, never a UI bundle. From the devcontainer, run
  `npm run db:studio` directly (no `make`/`docker` there) — port 4983 is
  forwarded by `.devcontainer/devcontainer.json`. From the host, `make
docker-studio` starts it as a profiled compose service (`studio`), the
  same shape as `workshop`; `make docker-all` brings up every long-running
  service, studio included.

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
empty and runs every migration. On 2026-10-06 MB.171's 0045, MB.69's 0046,
MB.172's 0047 and MB.168's 0048 were in flight together, and regenerating 0046
to follow 0045 left it newer than 0047 and 0048: merged in number order, both
would have been skipped.

**`npm run check:migration-order` refuses that before the merge** (MB.173,
`scripts/check-migration-order.ts`). It reads the branch's journal from the
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
2. Delete the migration's `.sql`, its `meta/` snapshot and its
   `_journal.json` entry, taking the base's journal where they conflict.
3. Run `npm run db:generate -- --name <its name>`, the name after the old
   number. It numbers the migration after the base's and stamps a new `when`.
4. Put back whatever was written into the SQL by hand (a header comment, a
   trigger, a refill), and strip a pending column drop as
   [rule 10](expand-contract.md) requires while one is in flight.
5. Run `npm run check:migration-order` and `npm run check:destructive-ddl`; a
   renamed migration carries its `.ack.md` sidecar under its new tag.
