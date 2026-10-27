## `updated_at` is the database's (M1.18)

DESIGN.md §5's second enforcement rule: `updated_at` is stamped by a trigger,
not by application code, so a fix made by hand in `psql` still stamps it and
the audit trail cannot be quietly bypassed.
`0016_updated-at-trigger.sql` adds one PL/pgSQL function —

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$;
```

— and attaches it `BEFORE UPDATE ... FOR EACH ROW` to each of the fifteen
tables then carrying the four audit stamps. The trigger takes the same name,
`set_updated_at`, on every one: a trigger name is scoped to its table rather
than shared with indexes, so there is nothing for a table prefix to
disambiguate.

- **The assignment is conditional since MB.106 (`0079_updated-at-skips-no-op.sql`).**
  A value the statement supplied still loses — a hand-written `UPDATE ... SET updated_at = …`
  is what the trigger exists to override — but an `UPDATE` that changes nothing
  now keeps the row's old `updated_at` and `updated_by`, so "when was this last
  changed" can be read from the column (the compendium's New and Updated
  markers, the sitemap's `lastModified`). "Changes nothing" compares the row as
  JSON with five things left out: `updated_at` and `updated_by`, because
  `withAudit` sends both on every write; an ingredient's seed and review
  state, `seed_content_hash`, `curator_reviewed_at` and `curator_reviewed_by`
  (M14.5, `0081_compendium-seed-state-expand.sql`), because a seed run or a
  review mark changes nothing a reader sees; `revision` (M13.15,
  `0084_spells-revision-and-draft-title.sql`), because the `bump_revision`
  trigger moves it on every update and, by name order, runs first; and
  generated columns (an ingredient's `identity_key`), because Postgres
  computes those after a BEFORE trigger runs, so `NEW` holds none of them.
  `revision` is the database's own counter of writes, not part of what the
  row says (claude-docs/db/grimoire.md, "Revision (M13.15)"). A no-op keeps both: `updated_by` stays the person who last really changed the row, so a
  different user re-saving unchanged takes no credit, and a fixture that writes a stamp
  alone must also change a real column or publish `app.touch_row`. The one write that must move `updated_at` with nothing
  else changing is touching a parent whose child rows changed
  (`writeChildren`): it publishes `app.touch_row` as `on` for its own statement,
  through the repository's `touchByIdInCompendium` and `touchByIdInWorkspace`.
  The trigger looks up the table's generated columns in `pg_attribute` on every
  update, a small catalogue read that keeps the function table-agnostic.
- **`now()`, not `clock_timestamp()`.** It is the transaction timestamp, so
  every row one transaction touches carries the same `updated_at`, and it
  matches the `DEFAULT now()` the column already carries.
- **`BEFORE UPDATE` only.** An insert keeps its own stamps, which is what makes
  `created_at` and `updated_at` equal on a row nobody has edited.
- **Only `updated_at` moves, and only on a real change.** The database owns _when_; `updated_by` still
  comes from the session, per CLAUDE.md rule 3, and a no-op keeps the old one. `RETURNING` reads the row the
  trigger already rewrote, so what a caller is handed and what is stored cannot
  disagree.
- **`applyAudit` still puts an `updatedAt` in the `SET` list, and it is
  always overwritten.** Both paths stamp, but only one value is ever stored —
  the database's — so an application whose clock has drifted cannot write a
  timestamp that disagrees with its neighbours.
  `tests/db/updated-at-trigger.test.ts` proves it by faking `Date` alone
  (`toFake: ['Date']`, leaving the driver's timers real), running a
  `withAudit` update whose payload says the year 2000, and reading back this
  year.

**Better Auth's three adapter tables are deliberately excluded.** `accounts`,
`sessions` and `verifications` carry an `updated_at` and no audit columns at
all (`sessions.impersonated_by` is the `admin` plugin's, MB.53, not an audit
id): nothing writes them through `withAudit`, they are not part of the audit
trail, and Better Auth's own `$onUpdate` stamps them (`src/modules/identity/schema/auth.ts`).
Its fourth, `rate_limits` (MB.75), carries no `updated_at` at all — Better
Auth's model declares none — so it is not a counter-example the sweep could
mistake, and `UNAUDITED_TABLES` leaves it out.

### A table added later does not get the trigger for free

An event trigger would attach one automatically on `CREATE TABLE`, but
`CREATE EVENT TRIGGER` requires superuser and `sorrel` deliberately is not one
(["Migrations and scripts"](migrations-and-scripts.md)). So **a new audited table adds its own
`CREATE OR REPLACE TRIGGER` line in its own migration** — one line, copied.
`0023_correspondence-vocabularies.sql` (MB.92) is the first to do it, for
`celestial_bodies` and `zodiac_signs`.

What makes forgetting that a failing test rather than a review note is
`tests/db/updated-at-trigger.test.ts`, the catalogue-introspection guard the
sweep-task rule requires. It applies the whole migration set into the worker's
clone — which tables the sweep reached is the thing under test, so unlike the
per-table schema tests it stubs nothing — and then compares the tables carrying a `set_updated_at` trigger with `AUDITED_TABLES` in `tests/support/db/table-metadata.ts`,
the twenty-six transcribed because two empty sets are equal and something
has to say they aren't. `tests/db/audit-columns.test.ts` holds that list to
the catalogue's tables carrying all four audit stamps, and proves Better
Auth's adapter tables carry an `updated_at` and no audit id (MB.188), so a
new audited table reddens one file or the other without either being edited.
