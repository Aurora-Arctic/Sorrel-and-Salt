<!-- The approved plan for MB.252, stored beside the record it produced. The decision is mb.252-table-rename.md; this file is how it was reached and is not maintained after the PR lands. -->

# MB.252: rename the planets table, with a view standing in for it

## Context

MB.252 is the expand step for renaming the planet vocabulary, which people read as Celestial Bodies (MB.251). It is the first of three tasks that move the code and database names over, and it is the first table rename in this repo. The entry asked for one question to be answered before building: **can a view named `planets` handle every statement the live code sends?** The live code is the deploy that runs between the migration and MB.252's promotion, and also any later rollback to that deploy. `migrate.yml` runs the migration before `deploy.yml` promotes, so the old code always meets the renamed table for a while.

Work is in the worktree `/home/node/worktrees/mb.252`, on `feature/mb.252-celestial-bodies-table-and-columns-beside`, off `origin/staging` (`52f3db51`). The task is In Progress on the board (#875).

## What the scoping measured

**1. The current code runs unchanged against the renamed table.** In the worktree, a throwaway migration `0067_celestial-bodies-expand.sql` does the following:

- renames the table and the four foreign keys
- creates `CREATE VIEW planets AS SELECT * FROM celestial_bodies`
- adds the three new columns, with `reference_links`' new foreign key and partial unique index
- fills the new columns from the old
- re-adds the CHECK in its `coalesce` form

The Drizzle schema was left on `pgTable('planets')`, so every statement went through the view. Then the whole `db` project ran under `flock`: **1240 passed, 10 failed.** None of the failures was a statement the code sends.

- **7 failures** are the catalogue tests the entry predicts: `schema-drift` ×5, `audit-columns`, and `partial-unique-indexes`.
- **3 failures** are tests that reach the database by the Drizzle table's name, which still said `planets`:
  - `seed/index.test.ts`: one test reads `ctid` through the view; another checks the audit probe, which records the base table's name.
  - `vocabulary/schema/vocabularies.test.ts`: looks up `planets_trgm`.

  All three pass once the schema declares the new names.

- **Everything else passed through the view.** That covers the services, GraphQL, all the seeds (sources, astrology, compendium), the reference links, the trigram autofill, `IN_USE`, and the acceptance tests in the `db` project.

**2. Statements prepared before the migration still run after it** (a scratch script on a throwaway database). postgres.js prepares statements by default. A connection that had prepared a `SELECT`, an `INSERT … RETURNING` and an `UPDATE … RETURNING` against the table ran all three through the view after the rename, along with a soft delete. Postgres re-resolves `planets` when it re-plans, and the result columns are unchanged. A duplicate slug through the view raises `23505` and names the index on the base table.

**3. The statement inventory.** No `ON CONFLICT`, no `FOR UPDATE` and no `TRUNCATE` touches `planets`. The seed inserts only the rows it is missing (`insertMissing` in `src/db/seed/flat-vocabulary.ts`). The `set_updated_at` trigger stays on the table through the rename and fires for writes through the view.

**Answer: yes, the view serves every statement.** One limit applies until MB.254 drops the view: Postgres refuses `DROP COLUMN` or `ALTER COLUMN TYPE` on any `celestial_bodies` column the view uses. No scheduled task does either, and the doc will say so.

## Decision taken during scoping (owner, 2026-10-12)

**The table's indexes and CHECK are renamed in MB.252, not MB.253.** These are `planets_seed_key_unique`, `planets_slug_unique`, `planets_trgm` and `planets_description_not_blank`. The trade-off: during the minutes of the rollout, and after any rollback to the earlier deploy, adding a duplicate celestial body shows a generic error instead of "name taken". The duplicate is still refused, and the screen is admin-only.

What it saves:

- `slugIndex` no longer has to accept two names.
- `vocabularies.test.ts` no longer needs a different name prefix for one table.
- MB.253 no longer needs a second rename migration, a second sidecar, or the work to undo a two-name mapping.

This changes both the MB.252 and MB.253 entries, as set out under Docs below.

## Implementation (TDD: catalogue and behaviour tests first, watch them fail, then the migration and schema)

### Migration `src/db/migrations/0067_celestial-bodies-expand.sql`

Write it with `generate --custom`. Drizzle-kit stops to ask whether a table it hasn't seen before is a rename, and that prompt fails without a terminal. The throwaway SQL is the starting point, plus these changes:

- Rename the four indexes and the CHECK: `ALTER INDEX … RENAME TO celestial_bodies_…` and `ALTER TABLE … RENAME CONSTRAINT`.
- Add a header comment: what this migration is, why a view, and where the argument lives (MB.50).
- Keep the fill as a plain `UPDATE … WHERE <old> IS NOT NULL`, as `0030` did. Like `0030`, it changes `updated_at` on the rows it fills.
- Add the sidecar `0067_celestial-bodies-expand.ack.md`: `Destructive DDL acknowledged: …`. It covers the table, index and constraint renames, and the CHECK's drop and re-add.

### Snapshot `src/db/migrations/meta/0067_snapshot.json`

`--custom` copied 0066's snapshot. Edit the copy by hand with `node -e`:

- re-key `public.planets` to `public.celestial_bodies`
- rename its name, indexes, CHECK and foreign keys
- add `celestial_bodies text[]` to `ingredients` and `ingredient_variants`
- add `celestial_body_id`, its foreign key and its partial unique index to `reference_links`
- give the CHECK's value the `coalesce` form

**Check:** a second `generate` into a scratch copy of `src/db/migrations`, as `claude-docs/db/expand-contract.md` describes, must report no changes.

### Schema

- `src/modules/vocabulary/schema/astrology.ts`: change to `pgTable('celestial_bodies', …)` under the existing `planets` export, and pass `vocabularyIndexes('celestial_bodies', …)`. Fix the comment.
- `src/modules/ingredients/schema/ingredients.ts` and `ingredient-variants.ts`: add `celestialBodies: text('celestial_bodies').array()`. No code reads or writes it.
- `src/modules/ingredients/schema/reference-links.ts`:
  - Declare `celestial_body_id` and its partial unique index `reference_links_celestial_body_unique` **outside `SOURCED`**. `SOURCED_KEYS` drives the reference reads and writes, and the new column must stay unread.
  - Spell `reference_links_one_row` out by hand in its `coalesce` form, with a comment that the strict form is MB.254's.
  - The foreign key's name `reference_links_planet_id_celestial_bodies_id_fk` comes from Drizzle on its own.
- `src/modules/vocabulary/services/astrology.ts`: set `slugIndex: 'celestial_bodies_slug_unique'`.

### Tests

- **`tests/db/schema-drift.test.ts`**:
  - Add a `view` kind to `PENDING_DROPS` and list `{ table: 'planets', kind: 'view', droppedBy: 'MB.254' }`.
  - Make views visible to the test: the migrated database's views (`relkind = 'v'`) must equal the `view` entries, so a view nothing declares fails.
  - The "still held" check confirms that a `view` entry is a view.
- **`tests/db/audit-columns.test.ts`**: read base tables only, by joining `information_schema.tables` on `table_type = 'BASE TABLE'`. The count stays 27.
- **`tests/support/db/table-metadata.ts`**: change `AUDITED_TABLES` from `planets` to `celestial_bodies`. `updated-at-trigger.test.ts` then passes unchanged.
- **`tests/db/partial-unique-indexes.test.ts`**: classify `reference_links_celestial_body_unique`, using `reference_links_planet_unique`'s row as the model.
- **`tests/db/seed/index.test.ts`**: change the astrology seed's tables to `['celestial_bodies', 'zodiac_signs']`.
- **`tests/modules/vocabulary/schema/vocabularies.test.ts`**: change `SEARCHED` from `planets` to `celestial_bodies`.
- **New: `tests/db/celestial-bodies-expand.test.ts`**, for the acceptance criteria:
  - **The view.** The catalogue shows `celestial_bodies` as a table and `planets` as a view over it. A write through the view lands in the table.
  - **The fill**, checked against the seeded template. Every ingredient and variant with `planets` has the same list in `celestial_bodies`, and every link with `planet_id` has `celestial_body_id`.
  - **The CHECK.** A link with `planet_id` alone saves, a link holding both saves, and a link naming a second sourced row is refused with `reference_links_one_row`.
  - **The friendly error.** A duplicate slug under `celestial_bodies_slug_unique` comes back as the "name taken" validation error. This goes in the existing `tests/modules/vocabulary/services/astrology.test.ts` case if one is there already.
  - **Preconditions** are asserted too, so the test fails without the view or without the fill.

### Docs

- **`claude-docs/db/expand-contract.md`**: a new section, "Renaming a table", setting out the pattern this task settles:
  - rename the table, put a view under the old name, and give the indexes and keys their new names in the same migration
  - the old deploy reaches the table through the view, prepared statements included
  - the view blocks `DROP COLUMN` and `ALTER COLUMN TYPE` until the contract task drops it
  - the schema-drift test's `view` kind holds the view until then
  - `generate --custom`, with the snapshot edited by hand
- **`claude-docs/db/updated-at.md`**: the table list says `celestial_bodies`.
- **`claude-docs/db/astrology-vocabularies.md`**, **CLAUDE.md** line 23, and **DESIGN.md** §5 (l.449), the routes table (l.1243) and the decisions table (l.1935): each gets one corrected clause saying the table is `celestial_bodies` since MB.252, with a `planets` view until MB.254. Code and GraphQL still say `planets` until MB.253. The decision records stay as written.
- **`claude-docs/tasks/mb.md`**, then `task-board.mjs sync MB.252` and `sync MB.253`:
  - **MB.252**: the index and CHECK renames move in, the two-name mapping comes out, an acceptance criterion changes to "carry `celestial_bodies_` names; a duplicate slug returns the friendly error", and the doc list grows.
  - **MB.253**: drop the paragraph "The table's indexes and CHECK are renamed here" and its sidecar. The hours stay as an estimate unless you re-estimate them.
- **`claude-docs/design-decisions/mb.252-table-rename.md`**: the record of the index-name decision and of the view finding. **`mb.252-plan.md`**: this plan, copied, with the one-line comment.

## Verification

- `npm run pre-commit`
- `flock /tmp/sorrel-vitest.lock npm run test:coverage`, with the catalogue tests and the new test green
- `flock /tmp/sorrel-vitest.lock npm run test:stories`
- `npm run check:destructive-ddl`: passes with the sidecar
- `npm run db:reset` on the worktree's database, with the sources seed unchanged
- A scratch `generate` that reports no changes, which proves the snapshot matches
- The scoping probe re-run against the final migration: the old deploy's prepared statements through the view
- The full e2e suite (`flock /tmp/sorrel-e2e.lock …`), because this task adds a CHECK that the e2e helpers write through
- Before calling it done, check that no code reads or writes the new columns: grep for `celestialBodies` and `celestial_body_id` outside the schema files and tests
