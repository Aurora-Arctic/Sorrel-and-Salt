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

- **The assignment is unconditional, and that is the point.** A value the
  statement supplied loses — a hand-written `UPDATE ... SET updated_at = …` is
  precisely what the trigger exists to override — and so does an `UPDATE` that
  changes nothing else, because a statement that touched the row is a touch.
- **`now()`, not `clock_timestamp()`.** It is the transaction timestamp, so
  every row one transaction touches carries the same `updated_at`, and it
  matches the `DEFAULT now()` the column already carries.
- **`BEFORE UPDATE` only.** An insert keeps its own stamps, which is what makes
  `created_at` and `updated_at` equal on a row nobody has edited.
- **Only `updated_at` moves.** The database owns _when_; `updated_by` still
  comes from the session, per CLAUDE.md rule 3. `RETURNING` reads the row the
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
`sessions` and `verifications` carry an `updated_at` and no `*_by` columns at
all: nothing writes them through `withAudit`, they are not part of the audit
trail, and Better Auth's own `$onUpdate` stamps them (`src/modules/identity/schema/auth.ts`).
Its fourth, `rate_limits` (MB.75), carries no `updated_at` at all — Better
Auth's model declares none — so it is not a counter-example the sweep could
mistake, and `UNAUDITED_TABLES` leaves it out.

### A table added later does not get the trigger for free

An event trigger would attach one automatically on `CREATE TABLE`, but
`CREATE EVENT TRIGGER` requires superuser and `sorrel` deliberately is not one
("Migrations and scripts" above). So **a new audited table adds its own
`CREATE OR REPLACE TRIGGER` line in its own migration** — one line, copied.
`0023_correspondence-vocabularies.sql` (MB.92) is the first to do it, for
`planets` and `zodiac_signs`.

What makes forgetting that a failing test rather than a review note is
`tests/db/updated-at-trigger.test.ts`, the catalogue-introspection guard the
sweep-task rule requires. It applies the whole migration set into the worker's
clone — which tables the sweep reached is the thing under test, so unlike the
per-table schema tests it stubs nothing — and then compares two catalogue
queries: the tables carrying all four audit stamps, and the tables carrying a
`set_updated_at` trigger. A new audited table reddens it without that
file being edited. The list of eighteen is transcribed there as well, because
two empty sets are equal and something has to say they aren't.
