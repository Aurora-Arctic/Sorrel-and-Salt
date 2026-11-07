# Celestial body and zodiac as keeper-curated vocabularies

**Status:** decided. Live home: `claude-docs/db/astrology-vocabularies.md`.

## Decision

- **Only the celestial body (planet) and zodiac move, and as vocabularies like `form`.** The two `ingredients` columns stay `text`; the tables feed the autofill and the keeper's curation list; deleting a row rewrites no ingredient; a value off the list stays writable (`DESIGN.md` §5: a vocabulary a member writes is text).
- **`ingredient_forms` is the pattern**: text column on `ingredients`, curated table in `vocabulary`, seeded reference data run by `migrate.yml`, a suggestion field listing curated values then in-use uncurated ones, and an admin page with the uncurated to-do list. Five differences:
  1. **One tier, no group.** `src/db/seed/two-tier-vocabulary.ts` assumes a group tier, so the seed needs a flat helper over `insertMissing` (`src/db/seed/idempotent.ts`).
  2. **The tables are small (19 and 13 rows).** A trigram index still lands, since the set is keeper-extensible, but an `EXPLAIN … index scan` assertion cannot pass on a two-page table. The suggestion task asserts the `%`-plus-`SET LOCAL` shape and drops the planner assertion.
  3. **"One-click add" cannot be one click**, because `description` is NOT NULL and CHECK non-blank: the to-do list's add control opens the create form prefilled with the value and asks for a description.
  4. **Two scopes.** The member's autofill reads the compendium and the current workspace; the keeper's to-do list reads the compendium tier only, since a keeper has no access to any workspace's ingredients. The compendium-tier finder joins `TIER_SEAM` in `tests/guards/module-boundaries.test.ts`.
  5. **Order.** The model is recorded before the table transcribes it (the model-before-table rule); the tables land while empty and are inert until the seed; the suggestion field adopts the existing mechanism rather than building a second; the admin page reuses the form-vocabulary page.
- **The earlier correspondence validation stays** until a later task deletes `validation/correspondences.ts`; one task per PR means the docs task cannot delete code.

## Why

A vocabulary a member writes is text, so a column that became a foreign key would refuse values the curated list lacks.

## Rules out

- **Making `nomenclature` / `NAMELESS_KINDS` a keeper-editable table.** The CHECK `ingredients_nomenclature_declares_canonical_name` hardcodes `'none'` and `'unknown'`, and a CHECK cannot read another table, so the coupling would become a trigger; the Zod coupling rule, the local variant's `none` default, the seed fixtures' exhaustive `Record<Nomenclature, …>` and the SDL `enum Nomenclature` would all reshape. That makes the identity model's most load-bearing set editable.
- Foreign keys from `ingredients` to the new tables.
