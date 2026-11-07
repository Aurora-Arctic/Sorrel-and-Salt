## `updated_at` is the database's

DESIGN.md §5's second enforcement rule: `updated_at` is stamped by a trigger,
not by application code, so a fix made by hand in `psql` still stamps it and
the audit trail cannot be quietly bypassed. One PL/pgSQL function,
`set_updated_at()` (`0016_updated-at-trigger.sql`, replaced by
`0079_updated-at-skips-no-op.sql`), is attached `BEFORE UPDATE ... FOR EACH ROW`
to every audited table under the same trigger name, `set_updated_at`. A trigger
name is scoped to its table, so no table prefix is needed.

- **The assignment is conditional.** A value the statement supplied still loses,
  because a hand-written `UPDATE ... SET updated_at = …` is what the trigger
  exists to override. An `UPDATE` that changes nothing keeps the row's old
  `updated_at` and `updated_by`, so "when was this last changed" can be read from
  the column (the compendium's New and Updated markers, the sitemap's
  `lastModified`). "Changes nothing" compares the row as JSON with these left out:
  - `updated_at` and `updated_by`, because `withAudit` sends both on every write;
  - an ingredient's `seed_content_hash`, `curator_reviewed_at` and
    `curator_reviewed_by`, because a seed run or a review mark changes nothing a
    reader sees;
  - `revision`, because the `bump_revision` trigger moves it on every update and,
    by name order, runs first. It is the database's own counter of writes, not part
    of what the row says (claude-docs/db/grimoire.md, "Revision (M13.15)");
  - generated columns (an ingredient's `identity_key`), because Postgres computes
    those after a BEFORE trigger runs, so `NEW` holds none of them. The trigger
    looks up the table's generated columns in `pg_attribute` on every update, a
    small catalogue read that keeps the function table-agnostic.

  A no-op keeps both stamps: `updated_by` stays the person who last really changed
  the row, so a different user re-saving unchanged takes no credit. A fixture that
  writes a stamp alone must also change a real column or publish `app.touch_row`.

- **`now()`, not `clock_timestamp()`.** It is the transaction timestamp, so every
  row one transaction touches carries the same `updated_at`, and it matches the
  column's `DEFAULT now()`.
- **`BEFORE UPDATE` only.** An insert keeps its own stamps, which is what makes
  `created_at` and `updated_at` equal on a row nobody has edited.
- **The database owns _when_; `updated_by` comes from the session** (CLAUDE.md rule
  3). `RETURNING` reads the row the trigger already rewrote, so what a caller is
  handed and what is stored cannot disagree.
- **`applyAudit` still puts an `updatedAt` in the `SET` list, and it is always
  overwritten.** Only the database's value is ever stored, so an application whose
  clock has drifted cannot write a timestamp that disagrees with its neighbours.
  `tests/db/updated-at-trigger.test.ts` proves it by faking `Date` alone
  (`toFake: ['Date']`, leaving the driver's timers real), running a `withAudit`
  update whose payload says the year 2000, and reading back this year.

**Better Auth's adapter tables are deliberately excluded.** `accounts`,
`sessions` and `verifications` carry an `updated_at` and no audit columns at all
(`sessions.impersonated_by` is the `admin` plugin's, not an audit id): nothing
writes them through `withAudit`, and Better Auth's own `$onUpdate` stamps them
(`src/modules/identity/schema/auth.ts`). `rate_limits` carries no `updated_at`
at all, so `UNAUDITED_TABLES` leaves it out.

### A table added later does not get the trigger for free

An event trigger would attach one automatically on `CREATE TABLE`, but
`CREATE EVENT TRIGGER` requires superuser and `sorrel` deliberately is not one
(["Migrations and scripts"](migrations-and-scripts.md)). So **a new audited table
adds its own `CREATE OR REPLACE TRIGGER` line in its own migration**, copied from
an earlier one such as `0023_correspondence-vocabularies.sql`.

Forgetting it is a failing test, not a review note:
`tests/db/updated-at-trigger.test.ts` is the catalogue-introspection guard the
sweep-task rule requires. It applies the whole migration set into the worker's
clone, stubbing nothing, since which tables the sweep reached is the thing under
test. It then compares the tables carrying a `set_updated_at` trigger with
`AUDITED_TABLES` in `tests/support/db/table-metadata.ts`, a transcribed list,
because two empty sets are equal and something has to say they aren't.
`tests/db/audit-columns.test.ts` holds that list to the catalogue's tables
carrying all four audit stamps, and proves Better Auth's adapter tables carry an
`updated_at` and no audit id, so a new audited table reddens one file or the
other without either being edited.

### Touching a row

A touch must move the stamps that an UPDATE changing nothing keeps. It says so for
its own statement through `app.touch_row`, then clears it so no later write in the
transaction reads it. The one write that needs this is touching a parent whose
child rows changed (`writeChildren`), through the repository's
`touchByIdInCompendium` and `touchByIdInWorkspace`.
