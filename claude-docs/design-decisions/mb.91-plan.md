# Planet and zodiac as admin-curated vocabularies (MB.91)

## Context

M4.5 settled `ingredients.planet` and `ingredients.zodiac` as free text with suggested values, and put the suggestions in a TypeScript constant — `src/modules/ingredients/validation/correspondences.ts`, 19 bodies and 13 signs. The user asked what it would take to put the five hardcoded lists (`NOMENCLATURE_KINDS`, `NAMELESS_KINDS`, `INGREDIENT_ELEMENTS`, `PLANET_SUGGESTIONS`, `ZODIAC_SUGGESTIONS`) in the database so an admin can edit them without a deploy. Adding a body today is a deploy — the shape `form`'s vocabulary had before MB.35, and wrong for the same reason.

**Decided with the user:** only planet and zodiac move, and they move as _vocabularies_ like `form` — the two `ingredients` columns stay `text`, the tables feed the autofill and the admin's curation list, deleting a row rewrites no ingredient, and a value off the list stays writable (§5's rule: a vocabulary a member writes is text).

**What the other three would take, for the record (out of scope):**

- `element` — a table plus a contract migration moving `ingredients.element` off the `ingredient_element` enum to `text` (`DROP TYPE`, `ALTER COLUMN … TYPE`, with an `.ack.md` sidecar; it would run against zero production rows, as MB.40's did), seed, suggestions, admin page — about 6h — and it reverses a recorded position (§5, §14: "a closed, fixed set: the exact opposite of `form`").
- `nomenclature` / `NAMELESS_KINDS` — all of the above, plus the table must carry `carriesFormalName` (and the italics rule) because the CHECK `ingredients_nomenclature_declares_canonical_name` hardcodes `'none'`/`'unknown'` and a CHECK cannot read another table, so the coupling becomes a trigger; the Zod coupling rule, the local variant's `none` default, the seed fixtures' exhaustive `Record<Nomenclature, …>` and M8.5's `enum Nomenclature` in the SDL all reshape. About 8h+, and it makes the identity model's most load-bearing set editable. Not recommended.

## The precedent, and where it does not transfer

`ingredient_forms` is the pattern: text column on `ingredients`, curated table in `vocabulary`, seeded reference data run by `migrate.yml`, a suggestion field (M4.7a) that lists curated values then in-use uncurated ones, an admin page (M5.6a) with the uncurated to-do list. Five differences to record rather than gloss:

1. **One tier, not two.** No group. `src/db/seed/two-tier-vocabulary.ts` assumes a group tier, so the seed needs a flat helper over `insertMissing` (`src/db/seed/idempotent.ts`).
2. **19 and 13 rows.** A trigram index still lands with the table (the set is admin-extensible), but an `EXPLAIN … index scan` assertion in M4.7/M4.7a's style cannot pass on a two-page table. The suggestion task asserts the `%`-plus-`SET LOCAL` shape and drops the planner assertion, saying why.
3. **DESIGN.md §5's insertion point is constrained.** `tests/db/seed/forms.test.ts:24-28` slices §5 from `**\`ingredient_forms\`**`to`**\`ingredient_form_groups\`**`and reads every`|` line inside as a form. The new paragraphs and table go **after** the "`ingredients.form`is`text`" paragraph (L319) and **before** `**\`categories\`**` (L321). The new test slices its own anchors the same way.
4. **`standard` seeds no uncurated planet** (its six values — `'Moon'`, `'Mars'`, … — all match the seeded Title Case names, case-insensitively). The suggestion task decides whether `standard` gains one, in `rhizome`'s shape.
5. **"One-click add" cannot be one click**: `description` is NOT NULL and CHECK non-blank, so the to-do list's add control opens the create form prefilled with the value and asks for a description. M5.6a's wording gets the same correction.

Two invariants decide the scopes: the member's autofill reads the compendium **and the current workspace**; the admin's to-do list reads the **compendium tier only** — an admin has no access to any workspace's ingredients (M6.6). The compendium-tier finder joins `TIER_SEAM` in `tests/guards/module-boundaries.test.ts`.

## Recommended approach — five tasks, all Wave 8, ~8.5h

**Status.** Approved 2026-09-28 and minted as MB.91–MB.95 (#511–#515) in the Wave 08 milestone; MB.90 had meanwhile been taken by the Day 1 guide, so every id here is one higher than the plan was drafted with.

| ID    | Title                                                                  | Position in Wave 8       | Hours |
| ----- | ---------------------------------------------------------------------- | ------------------------ | ----- |
| MB.91 | Make the planet and zodiac suggestion lists admin-curated vocabularies | after M4.5               | 2     |
| MB.92 | `planets` and `zodiac_signs` schema                                    | after MB.91              | 1.5   |
| MB.93 | Seed the planet and zodiac vocabularies                                | after MB.92, before M4.7 | 1.5   |
| MB.94 | Scoped suggestion fields for planet and zodiac                         | after M4.7a              | 1.5   |
| MB.95 | Admin planet and zodiac CRUD                                           | after M5.6a, before M5.7 | 2     |

New Wave 8 row: `M4.5 · MB.91 · MB.92 · MB.93 · M4.7 · M4.7a · MB.94 · M4.8 · MB.81 · … · M5.6a · MB.95 · M5.6b · M5.7 · …`. Why: MB.91 precedes MB.92 under the MB.35 rule (the model is recorded before the table transcribes it); MB.92/MB.93 land straight after because both are inert until MB.94 and cheapest while empty; MB.94 follows M4.7a because it adopts that mechanism rather than building a second; MB.95 reuses M5.6a's page and precedes M5.7, which gates it.

**M4.5 stays as it is.** It is coherent and tested; one-task-per-PR means the docs task cannot delete code, so MB.93 deletes `validation/correspondences.ts`. M4.5's entry gets a forward pointer in MB.91's pass.

### MB.91 — docs and scoping only (MB.35's shape)

Only Markdown changes; `npm run pre-commit` and the vitest job stay green (run `tests/db/seed/forms.test.ts` to prove the §5 slice is intact).

- **DESIGN.md** — §5 L285 rewritten to point at the two tables; `**\`planets\`**`and`**\`zodiac_signs\`**`paragraphs plus one`Vocabulary | Values`table (19 bodies, 13 signs, lower-case, seed order) inserted between L319 and L321; §5 L249 admin sentence; §7 L610 (five reads under the`compendium` tag); §9 route table (`/admin/planets`, `/admin/zodiac-signs`); §14 rows: seventh and eighth curated resource, no order column (alphabetical lists, match-ranked suggestions), descriptions as search surface (Lilith's says _Black Moon_, the nodes' _Rahu/Ketu_, Ophiuchus's _Serpentarius_), to-do list compendium-tier only.
- **CLAUDE.md** — commands table gains `db:seed:correspondences`; rule 6 and the "Admins curate …" invariant name the two vocabularies.
- **db.md** — "The correspondence vocabularies" beside "Categories, and the two group vocabularies"; a seed section beside "The form vocabulary seed" carrying M4.5's Sources list.
- **validation.md** — drop the `correspondences.ts` row and the Sources section; the planet/zodiac bullet points at db.md.
- **modules.md** ownership row; **ci.md** ~L839 names the third seed target.
- **TASKS.md** — MB.92–MB.95 entered and indexed, Wave 8 row, MB paragraph; amendments: M4.7a (service parameterised by table and column, in-use scan reads `lower(btrim(column))`), M5.4 (nav), M5.6a (add-control wording; to-do list compendium-tier only), M5.7 ("…and the two correspondence vocabularies"; per-mutation tests cover them), M5.10a (Combobox serves four fields; group clause is `form`'s only), M4.5 forward pointer.
- Copy this plan to `claude-docs/design-decisions/mb.91-plan.md`; mint the issues with `gh` and update the Wave 08 milestone description in the same pass.

> **Superseded names (MB.93).** The files, script and functions below say `correspondences`; they shipped as `astrology` — `schema/astrology.ts`, `seed/astrology.ts`, `db:seed:astrology`, `seedAstrology` — because in §5 a correspondence is every property an ingredient carries, element and deities included, not these two. The migration keeps its shipped tag, `0023_correspondence-vocabularies`.

### MB.92 — table task

`src/modules/vocabulary/schema/correspondences.ts` holding both tables (one file per pair, as `ingredient-forms.ts` does): `id`, `name`, `slug`, `description` NOT NULL + `CHECK (btrim(description) <> '')`, `...auditColumns` from `../../identity/schema/users`; partial unique index on `slug WHERE deleted_at IS NULL`; one multicolumn gin index per table over `(name, description)`, spelled `.using('gin', sql\`${table.name} gin_trgm_ops\`, sql\`${table.description} gin_trgm_ops\`)`as`ingredients.ts`'s `ingredients_trgm`is. No group, colour, order column or`workspace_id`. Migration via `npm run db:generate -- --name correspondence-vocabularies`, then **two `CREATE OR REPLACE TRIGGER set_updated_at …`lines appended by hand** — the first table since 0016 to carry its own (rule 3). Add both names to`AUDITED_TABLES`in`tests/support/db/table-metadata.ts`.

Tests: `tests/modules/vocabulary/schema/correspondences-schema.test.ts` in `ingredient-forms-schema.test.ts`'s shape — exact column set, partial-index predicate, `23514` on a blank description naming the CHECK, slug freed by soft delete, no `group_id`/colour/order/`workspace_id`, trigram index present in the catalogue, and `ingredients.planet`/`.zodiac` nullable text with no FK (schema assertion plus the migration-file regex scan the forms test uses). `tests/db/updated-at-trigger.test.ts` passing is what proves the trigger lines.

### MB.93 — seed task

`src/db/seed/correspondences.ts`: `PLANETS` and `ZODIAC_SIGNS` as `{ name, description }[]` in §5's order, Title Case (`Sun`, `North Node`, `Ophiuchus`), slugs derived. New `src/db/seed/flat-vocabulary.ts` — `seedFlatVocabulary(tx, { table, items, noun })` over `insertMissing`, keyed on slug, ignoring `deleted_at`. Exports `seedCorrespondences(db)` and `seedCorrespondenceVocabularies(tx)` in the categories/forms split; `standard` calls the latter in its own transaction. `scripts/db-seed.ts` target `correspondences`; `package.json` `db:seed:correspondences`; `.github/workflows/migrate.yml` seed step gains the line; `.github/workflows/deploy.yml` `seed-changed` path list gains `src/db/seed/correspondences.ts` (and `flat-vocabulary.ts`). **Delete `src/modules/ingredients/validation/correspondences.ts`**; `tests/modules/ingredients/validation/ingredient.test.ts`'s `describe.each` reads the seed literals instead; rewrite the comment in `validation/ingredient.ts` naming the deleted file. `standard.ts`'s capitalised planet values are untouched (they equal the seeded names).

Tests: `tests/db/seed/correspondences.test.ts` in `forms.test.ts`'s shape — parse §5's new table (assert the parse: two vocabularies, 19 and 13), every value seeded in order and nothing else, Title Case, descriptions non-empty and pairwise distinct, reseed adds nothing / resurrects nothing soft-deleted / overwrites no rewritten description, bootstrap-user stamps and the GUC probe trigger; `standard.test.ts` counts include both tables and every `planet` the compendium sets is curated (case-insensitively).

### MB.94 — suggestion fields (adopts M4.7a)

`vocabulary/services/` service parameterised by table and column; GraphQL `planetSuggestions` / `zodiacSuggestions`, one `CorrespondenceSuggestion` type, each a `pagedConnection`. Curated rows first (name match outranks description match, `%` under `SET LOCAL pg_trgm.similarity_threshold`), then in-use uncurated values from the compendium and the current workspace only — `lower(btrim(value))` not among live rows' `lower(name)`. Compendium-tier finder added to `TIER_SEAM`. Authorization tests assert a value held only by unrelated workspace X never appears, with the precondition that X holds it. No planner assertion (difference 2). If `standard` gains an uncurated planet, one entry, asserted in `standard.test.ts`.

### MB.95 — admin CRUD (reuses M5.6a's page)

`/admin/planets` and `/admin/zodiac-signs`; `PlanetInput` / `ZodiacSignInput` (`name`, `description`, no slug) in `vocabulary/validation/`, in `CategoryInput`'s shape; create/update/soft-delete mutations per table, admin-gated in the service, firing `revalidateTag('compendium', { expire: 0 })`. Compendium-tier to-do list with the prefilled add control. Soft-deleting an in-use value rewrites no ingredient (asserted by row) and the value then appears in the to-do list. Non-admins reach neither page nor mutation; slug collision pathed to `name`.

## Verification

- MB.91: `npm run pre-commit`; `npx vitest run --project db tests/db/seed/forms.test.ts` (the §5 slice); `npx vitest run --project unit tests/guards/doc-citation.test.ts`.
- MB.92: `npm run db:generate` emits the two tables; `npm run test:coverage` — `updated-at-trigger`, `audit-columns`, the new schema test; `npm run check:destructive-ddl` reports nothing (purely additive).
- MB.93: `npm run db:reset` then `SEED_SCENARIO=standard`; `npm run test:coverage` (seed tests, `standard.test.ts`, `ingredient.test.ts` after the import change); `make act-check` on the migrate leg if the workflow edit is doubted.
- MB.94/MB.95: `npm run test:coverage` including direct-id denial tests; codegen regenerated (`npm run codegen`), SDL snapshot updated; by hand through Altair (`claude-docs/manual-api-testing.md`); MB.95's pages through Playwright with axe.
