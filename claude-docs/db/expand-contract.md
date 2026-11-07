## Expand/contract and the destructive-DDL check

Drizzle generates no down migrations and none exist. The only rollback for a bad
release is a **deploy rollback**: redeploy the previous app version against the
database as it stands. That works only if every migration leaves the schema
compatible with the app version that shipped it _and_ the one before it. That is
expand/contract:

1. **Expand.** A migration that only adds (a column, a table, an index) is safe: old
   code ignores what it does not know.
2. **Migrate the app.** Ship code that uses the new shape, alongside the old for a
   transition (dual-write, read-with-fallback).
3. **Contract.** Once nothing depends on the old shape, a later migration removes it.

Renaming a column in one step is the case that goes wrong: `RENAME COLUMN` is atomic
in Postgres but not across a _deploy_. While Vercel rolls traffic from the old
version to the new, both read and write the same rows, and the old version's query
for the old name errors. Rename in two releases: release N adds the new column,
backfills it, writes both and reads `title ?? name`; release N+1 drops the old
column and the fallback. Release N is safe to roll back to N-1. Rolling N+1 back to N
breaks (N's dual-write still writes the old column), which is why the drop needs an
acknowledgement sidecar (below).

**A drop is the contract step alone, split across two tasks:** code references out
first, then the migration `drizzle-kit generate` produces, in a second PR with its
sidecar (CLAUDE.md rule 10; the procedure is `.claude/rules/database.md`'s).
`migrate.yml` runs before `deploy.yml` promotes, and Drizzle names every declared
column in a `SELECT`, so dropping a column the live deploy still declares breaks its
reads for the length of the rollout, and a rollback past the migration for good.
That holds on production as on staging, and a drop task waits only for its switch to
reach staging: the release that carries a drop must follow one that carried its
switch, unless production never declared the column (as with `0028`).

**"Deployed" means production too** when production's deploy declares the column. A
release runs every pending migration before it promotes, so a release carrying both
tasks drops the column under the deploy it replaces. The second task then merges
into `staging` only after a release carrying the first has reached production. Where
production never had the column, the second task needs no such wait. Between the two,
`db:generate` on any branch emits the drop; it belongs to the second task, and the
destructive-DDL check refuses it unacknowledged. A data migration may still ride in
the first, written with `generate --custom`, which copies the last snapshot rather
than diffing the schema, so the undeclared columns stay in it (`0031` and `0035` are
the worked cases).

**A table added while a drop is pending is `generate --custom` too**, with the DDL
taken from a `generate` run into a scratch copy of `src/db/migrations` (`--config`
naming a copy of `drizzle.config.ts` whose `out` is the copy), and the drop it also
emits left out. drizzle-kit prefixes `out` with `./`, so write the copy's path
relative to the repository: an absolute one resolves to nothing. The new snapshot is
the copied one plus that run's entries for the new tables, so the undeclared columns
stay in it and the drop is still the second task's to generate; a second scratch
`generate` from it should emit the pending drops and nothing else (`0032`, `0033`).

- **A column added to a table with a pending drop** works the same way with one more
  step. drizzle-kit sees a column added beside columns removed and stops to ask
  whether it is a rename, and with no terminal that prompt fails. So delete the
  pending columns from the scratch copy's last snapshot first, and the scratch run
  then emits the `ADD COLUMN` alone (`0034`).
- **A column added to tables with no pending drop**, while another table has one,
  needs no prompt: the run emits the new DDL and the drop, and the drop is cut from
  the SQL and its column put back in the new snapshot from the last one (`0045`).
- **A changed CHECK** follows the same procedure, its snapshot entry's value edited
  rather than a table or column added (`0038`).
- **A drop made while another is pending** is `generate --custom` as well, its `DROP`
  taken from the same scratch run and the other task's left out. The snapshot is the
  copied one less the dropped column, so a second scratch `generate` still emits the
  other drop and nothing else (`0037`).
- **A drop that fills first.** `0039` and `0048` fill the replacing table before they
  drop the list, for whatever the deploy before the switch wrote after the first
  fill. Unlike `0031`, that refill only adds: by the drop the switch has been writing
  the table, so a row there, live or removed, is newer than the list. `0048` places
  each entry after the rows its ingredient holds, since that list keeps the order
  entered.

### Renaming a table

Renaming a table in one step breaks the deploy still serving, as a column rename
does, because every statement it sends names the old table. Unlike a column, a table
can leave its old name behind as a **view** over itself (a saved query the database
treats like a table), so the rename needs no second table and no copying
([`design-decisions/mb.252-table-rename.md`](../design-decisions/mb.252-table-rename.md)).
`planets` to `celestial_bodies` (`0067`) is the worked case.

- **Expand in one migration.** Rename with `ALTER TABLE … RENAME TO`, then
  `CREATE VIEW <old> AS SELECT * FROM <new>`. Postgres writes through a view over a
  single table with no joins or aggregates, so the deploy before keeps reading and
  writing the same rows under the old name:
  - inserts and updates with `RETURNING`, and soft deletes, all work
  - the table's `set_updated_at` trigger still fires, because a rename keeps it
  - a connection that prepared statements against the table before the rename runs
    them through the view afterwards, because Postgres looks the name up again
    whenever it re-plans a statement

- **Rename the indexes, CHECKs and foreign keys in the same migration.**
  `vocabularyIndexes` and Drizzle's foreign-key names are built from the table's
  name, and the schema-drift test compares the names. The one cost is any code in the
  deploy before that looks up a constraint by name: for `0067` that was the friendly
  duplicate-slug error, which during the rollout, and after a rollback, becomes a
  generic error. The duplicate is still refused.
- **Declare the new name in the schema straight away**, and the old name nowhere. The
  schema-drift test lists tables only, so it doesn't compare views; its
  `PENDING_DROPS` list holds the view under the `view` kind, and any view missing
  from that list fails the test. `audit-columns.test.ts` reads base tables only,
  because `information_schema.columns` lists a view's columns as well as a table's.
- **Write the migration with `generate --custom`, and edit the snapshot by hand.**
  drizzle-kit stops to ask whether a table it hasn't seen before is a rename, and
  that question fails without a terminal. In the copied snapshot, change the table's
  key and name and its index, CHECK and foreign-key names; the `"<old>".` prefix in
  every index predicate; and every foreign key that points at the table. A second
  scratch `generate` must then report no changes.
- **The switch moves the code and refills.** It renames the code and GraphQL names and
  stops declaring the old columns, which `PENDING_DROPS` then holds. `0068` fills the
  new columns again for whatever the deploy before wrote after `0067`. The lists are
  rederived as `0031`'s were, so a cleared old list clears the new one. A link only
  adds, because no code ever changes or clears a link's body. A CHECK that has to
  count either column keeps naming the old one in the schema until the contract step.
- **The view locks the table's columns until the contract step drops it.** Postgres
  refuses `DROP COLUMN` or `ALTER COLUMN TYPE` on any column a view reads, so neither
  can happen to the table in between. The contract task drops the view, with its
  sidecar, once a release carrying the switch has reached production.
- **The contract drops the old columns and the view, and copies the links one last
  time** (`0069`). It copies `planet_id` into `celestial_body_id` wherever a link
  holds the old column alone, as `0039` copied its list: the switch never writes the
  old column, so such a link came from the deploy before. One of those can repeat a
  live link the switch wrote for the same body and reference, and copying it would
  break the new column's partial unique, so it is removed first, as the app removes a
  link. The lists get no last copy, as `0036` gave its single columns none, because a
  NULL new list may be a member's clear. The CHECK then counts the new column alone,
  and `PENDING_DROPS` empties.

**The CI check** (`checks / destructive-ddl`, `scripts/check-destructive-ddl.ts`, a
`checks.yml` leg) scans migration files new or changed in a PR for five forms:

- **any `DROP`**: column, table, type, constraint, index, function, trigger, view. A
  dropped type or constraint breaks a rolled-back release as readily as a dropped
  column. The two exceptions **widen** and pass: `DROP NOT NULL` and `DROP DEFAULT`
  only admit values the old code was already writing. `DROP INDEX` is deliberately
  inside the rule, so a changed index predicate (Drizzle emits `DROP INDEX` +
  `CREATE INDEX` for one) costs an acknowledgement line saying the rebuild is
  intentional.

  `0084_spells-revision-and-draft-title.sql` shows both widening forms passing with no
  sidecar. It drops `NOT NULL` from `spells.title` and adds `revision` as `NOT NULL`
  with `DEFAULT 1`, so the deploy before it, which never names `revision`, still
  inserts. A widened column is safe for the old deploy's writes, but not always for
  its reads: after `0084` a row may hold a null title, which the old deploy's GraphQL
  `Spell.title` declares non-null, so an untitled spell would fail that deploy's
  grimoire read. That was acceptable because nothing could write an untitled spell
  when it landed. A widening migration under a live writer needs the reader made
  tolerant first, in an earlier release.

- **`RENAME`** (column or table). An index rename is caught too, though it cannot break
  a rollback; Drizzle never emits one.
- **`ALTER COLUMN ... TYPE`**, flagged whenever present: telling narrowing from
  widening reliably needs a real SQL parser and the column's previous definition.
- **a `NOT NULL` addition**: `SET NOT NULL`, or `ADD COLUMN ... NOT NULL` with no
  `DEFAULT`.

Comments and string literals are stripped before any rule runs. Statements are split
on `;` with no awareness of dollar-quoted bodies, so a PL/pgSQL function is judged as
several fragments rather than one statement: harmless while no rule spans a
`BEGIN … END`, and the first thing to fix if one ever must. Only `*.sql` is scanned:
the `meta/*.json` files Drizzle writes beside each migration are excluded by the
paths filter in `pr-gate.yml` **and** by the script, which ignores anything else.

It passes when none of those forms appear. When one does, that migration must carry
an **acknowledgement sidecar** beside it, named for the migration it covers:

```
src/db/migrations/0002_solid_marauders.sql
  → src/db/migrations/0002_solid_marauders.ack.md
```

containing, anywhere in the file, a line of the exact form:

```
Destructive DDL acknowledged: <reason>
```

(case-insensitive, a non-empty reason required; the script's header comment holds
the regex). This is the one place the format is defined, so
`claude-docs/ci/reusable-checks.md` and the script both point back here.

**The acknowledgement is a sidecar, never a PR-body line.** A release PR rescans every
migration since the last release and sees no earlier PR body, and one body line would
bless every finding in a diff. The sidecar travels with its file and covers only that
file. The check reads nothing from GitHub. It is a `.md` file because the regex
anchors at the start of a line, which a `-- ` SQL comment would defeat. Every file
list here is scoped to `*.sql`, so a sidecar is never itself scanned.

**Locally, `npm run check:destructive-ddl` scans what this branch adds:** every
migration new or changed against its Gitflow base (`origin/staging`, or `origin/main`
for a `hotfix/*` or `release/*` branch), including one `db:generate` has just written
and not yet committed. `--base <ref>` picks another base. `--all` scans every
committed migration instead, an audit rather than a gate; it is green when every
destructive migration ships its sidecar and goes red on a real omission.

Each migration with findings carries its sidecar; the sidecar holds the reason, and
`--all` is the audit that proves none is missing. A false positive is acknowledged
the same way (`0061` adds a generated `NOT NULL` column).

### A migration gives up a lock it cannot take

The migrate job runs while the previous deploy is still serving, so a migration meets
live traffic. An `ALTER TABLE` needs the strongest lock on its table and waits for
every open transaction that has touched the table to end. While it waits, every later
statement on that table, a plain read included, queues behind it. So every migration
statement waits **5 seconds** for a lock at most (Postgres's `lock_timeout`), then
fails, and the job tries again later.

**Where it is set.** `drizzle.config.ts` adds `-c lock_timeout=5s` to the `options`
startup parameter of the database URL, through `withMigrationLockTimeout` in
`src/db/connection-url.ts`, which keeps any options the URL already carries. Every
`drizzle-kit` command reads that file, so `npm run db:migrate` on a laptop, the
migrate job and the test databases all migrate under the same timeout, and so does
`npm run db:studio`, which costs nothing there. The value lives in
`MIGRATION_LOCK_TIMEOUT`. Five seconds is longer than a request's own transaction
takes, and short enough that the reads queued behind the wait come to no harm.

**It needs the direct URL.** Neon's pooled endpoint (a host ending `-pooler`) runs
PgBouncer, which refuses startup options it cannot track and fails the connection
with `unsupported startup parameter in options` ([Neon, "Connection
errors"][neon-errors]). Neon recommends the direct connection for schema migrations
in any case ([Neon, "Connection pooling"][neon-pooling]). Each `DATABASE_URL` the
migrate job resolves must therefore be a direct one: the `DATABASE_URL_PRODUCTION`
and `DATABASE_URL_STAGING` secrets hold Neon's direct URL, the pooled one with
`-pooler` taken out of the host. The seed job and the deploy's build step read the
same two secrets, so they connect directly too; the running app reads `DATABASE_URL`
from Vercel's own environment and keeps the pooler. A pooled URL fails at connect, on
every attempt, rather than migrating without the timeout.

**A failed attempt leaves nothing behind.** drizzle-kit, with the `postgres` driver
this repo installs, applies through drizzle-orm's migrator
(`drizzle-orm/pg-core/dialect.js`, `migrate`), which runs every pending migration and
its row in `drizzle.__drizzle_migrations` inside one transaction. A lock timeout
aborts that transaction, so the whole batch rolls back and the next attempt starts
from the same place. `tests/db/migration-lock-timeout.test.ts` asserts this: a probe
migration that alters `users`, run while another connection holds a read transaction
open on it, fails within the timeout, leaves no column and no migration row, and
applies on a rerun once the reader has finished. A statement Postgres refuses inside a
transaction, such as `CREATE INDEX CONCURRENTLY`, cannot ride this migrator; none
exists today, and the first one needs its own plan.

**The retry.** `drizzle-kit migrate` has no retry of its own, so the "Apply pending
migrations" step in `.github/workflows/migrate.yml` makes three attempts, waiting 30
seconds after the first failure and 60 after the second. The third failure fails the
job, and `deploy.yml`'s `deploy` job, which `needs: migrate`, does not run: the result
is a failed deploy to rerun, not a hang. drizzle-kit prints no cause for a failed run,
so a migration that fails for any other reason is also tried three times, which costs
about a minute and a half. `tests/github/workflows/migrate.test.ts` runs the step's own
script with a stub `npm` and asserts the attempts and the waits.

**The seed does not inherit it.** The reference seeds in the same job open their own
connection through `src/db/connection.ts`, which sets no timeout. That is harmless: a
seed writes rows, and the row locks and `ROW EXCLUSIVE` table lock a write takes do
not conflict with the `ACCESS SHARE` lock a read takes, so a seed cannot queue the
site's reads.

**Not decided: a `statement_timeout` for the application.** Nothing sets
`statement_timeout` or `idle_in_transaction_session_timeout` on the application's own
connections in `src/db/connection.ts`. A request that left a transaction open would
make every migration fail its lock wait until it ended, so those timeouts would bound
how long a deploy can be held off. Whether to set them is a separate decision.

[neon-errors]: https://neon.com/docs/connect/connection-errors
[neon-pooling]: https://neon.com/docs/connect/connection-pooling
