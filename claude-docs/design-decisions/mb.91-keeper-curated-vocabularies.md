# Planet and zodiac as keeper-curated vocabularies (MB.91)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Decision

**Decided with the user:** only planet and zodiac move, and they move as _vocabularies_ like `form` — the two `ingredients` columns stay `text`, the tables feed the autofill and the keeper's curation list, deleting a row rewrites no ingredient, and a value off the list stays writable (§5's rule: a vocabulary a member writes is text).

- `nomenclature` / `NAMELESS_KINDS` — all of the above, plus the table must carry `carriesFormalName` (and the italics rule) because the CHECK `ingredients_nomenclature_declares_canonical_name` hardcodes `'none'`/`'unknown'` and a CHECK cannot read another table, so the coupling becomes a trigger; the Zod coupling rule, the local variant's `none` default, the seed fixtures' exhaustive `Record<Nomenclature, …>` and M8.5's `enum Nomenclature` in the SDL all reshape. About 8h+, and it makes the identity model's most load-bearing set editable. Not recommended.

## The precedent, and where it does not transfer

`ingredient_forms` is the pattern: text column on `ingredients`, curated table in `vocabulary`, seeded reference data run by `migrate.yml`, a suggestion field (M4.7a) that lists curated values then in-use uncurated ones, an admin page (M5.6a) with the uncurated to-do list. Five differences to record rather than gloss:

1. **One tier, not two.** No group. `src/db/seed/two-tier-vocabulary.ts` assumes a group tier, so the seed needs a flat helper over `insertMissing` (`src/db/seed/idempotent.ts`).
2. **19 and 13 rows.** A trigram index still lands with the table (the set is admin-extensible), but an `EXPLAIN … index scan` assertion in M4.7/M4.7a's style cannot pass on a two-page table. The suggestion task asserts the `%`-plus-`SET LOCAL` shape and drops the planner assertion, saying why.
3. **"One-click add" cannot be one click**: `description` is NOT NULL and CHECK non-blank, so the to-do list's add control opens the create form prefilled with the value and asks for a description. M5.6a's wording gets the same correction.
   Two invariants decide the scopes: the member's autofill reads the compendium **and the current workspace**; the keeper's to-do list reads the **compendium tier only** — a keeper has no access to any workspace's ingredients (M6.6). The compendium-tier finder joins `TIER_SEAM` in `tests/guards/module-boundaries.test.ts`.
   New Wave 8 row: `M4.5 · MB.91 · MB.92 · MB.93 · M4.7 · M4.7a · MB.94 · M4.8 · MB.81 · … · M5.6a · MB.95 · M5.6b · M5.7 · …`. Why: MB.91 precedes MB.92 under the MB.35 rule (the model is recorded before the table transcribes it); MB.92/MB.93 land straight after because both are inert until MB.94 and cheapest while empty; MB.94 follows M4.7a because it adopts that mechanism rather than building a second; MB.95 reuses M5.6a's page and precedes M5.7, which gates it.
   **M4.5 stays as it is.** It is coherent and tested; one-task-per-PR means the docs task cannot delete code, so MB.93 deletes `validation/correspondences.ts`. M4.5's entry gets a forward pointer in MB.91's pass.

### MB.91 — docs and scoping only (MB.35's shape)

Only Markdown changes; `npm run pre-commit` and the vitest job stay green (run `tests/db/seed/forms.test.ts` to prove the §5 slice is intact).
