# MB.167 — Read and write the picked form and deities

**Status:** approved · **Date:** 2026-10-06

The scoping plan as approved, kept beside [`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md), which records the decisions. Built on MB.166's branch while MB.166 was in review.

## Context

MB.165 added `ingredients.form_id` and the `ingredient_deities` table; MB.166 filled the table from `ingredients.deities` as unlinked names. Nothing reads or writes either yet, so a save still forgets which curated row was picked: Greek and Roman Hecate save alike, and so do Wax under _Animal_ and Wax under _Substance_. MB.167 switches every reader and writer to the link and the table. It also moves MB.162's compendium rule for form and deities from a spelling match onto the link. MB.168 then drops the column, and MB.169 shows the pick.

## Decisions (owner's calls, this scoping)

- **Names:** GraphQL `IngredientDeityInput { deityId, name }` and output `IngredientDeity { name, deity: Deity }`, after the table, mirroring `SubstituteInput`/`Substitute`. MB.132 keeps `DeityInput` for the admin's deity CRUD. MB.167's text is corrected to match.
- **Form text vs link:** a `formId` needs `form` text that folds (trimmed, lower-cased) to its row's name. Anything else is a field error at `form`. A match is written in the row's spelling.
- **`Deity` type with its tradition:** `Deity { id, name, slug, description, tradition: DeityTradition! }` and `DeityTradition { id, name, slug, description }`, the tradition through a `deityTraditionsById` loader, as `IngredientFormValue.group` does.

## Calls made without asking (named in the record)

- **A deity entry is exactly one of `deityId` and `name`**, held by the shared schema as substitutes are (`substituteRules`). A blank entry is refused rather than dropped, so a position counts the entries sent.
- **"Curated" means one thing everywhere: a live row under a live group or tradition**, as `findCuratedRowsByName` and the suggestions already read it. The write check, `formChoice` and `IngredientDeity.deity` all use it: a pick whose row _or_ group/tradition is soft-deleted reads back as its text with no link. (Review change: the earlier draft nulled `formChoice` on the row alone. That would have left `IngredientFormValue.group`, non-null, erroring under a deleted group.)
- **A held deity link is kept, as substitutes keep theirs** (owner's call, on review). Only a _new_ link must name a curated row.
  - A deity row the ingredient already holds is kept whether or not its deity is still curated: no refusal, no tombstone, its stored text unchanged.
  - The read shows such a row as a typed name (`deity: null`), so the form sends back its text. The service matches a sent name to a held link of that exact text whose deity is no longer curated, and keeps that row. A re-sent `deityId` matches its row too.
  - Edge case: an unlinked "Hecate" beside a dead-linked "Hecate" reads as two typed "Hecate"s. Sent back, the second is refused as a repeat, and the member removes one. This goes in the record.
  - **The coven tier only.** A compendium entry's every deity must link a curated row, held or not (below).
- **The form link is not "kept": a `formId` sent must be curated, and none sent clears it.** (Review refinement of the call above: it was made for the deity rows, where dropping a link tombstones a row. `form_id` is a column, so clearing it removes nothing: the text stays, and the read had already shown `formChoice: null`.) A `formId` naming no curated row is refused at `['formId']`, held or not.
- **A kept link to a curated row takes that row's current spelling** on save, so a renamed deity's name is refreshed the next time a member saves. A kept dead link keeps its stored text.
- **MB.162's delete and rename rules are unbuilt** (M5.6a, M5.6b and MB.132 are Not Started). "Follow the link" therefore lands as task-text amendments, not code:
  - A delete is refused while a live compendium entry _links_ the row. A tradition or form group is refused while a row under it is so linked.
  - A rename rewrites the text of the entries linking the row. A form's rewrite re-keys and re-slugs each.
  - The "last live spelling" clause goes for forms and deities, since a link names one row. It stays for planets and signs.
  - The reverse indexes on `ingredient_deities.deity_id` and `ingredients.form_id` become M5.6a's and MB.132's to add, since they build the read that wants them. MB.165's record left the index to MB.167's plan, and the plan finds MB.167 has no such read.

## Implementation

### 1. Shared schema — `src/modules/ingredients/validation/ingredient.ts`, `validation/types.ts`

- `formId: optionalText` beside `form`. Not a uuid → issue at `['formId']`. A `formId` with no `form` → issue at `['form']`.
- `deities: z.array(deity).nullish()`, where `deity = z.object({ deityId: optionalText, name: optionalText })`. Add a `deityRules` beside `substituteRules`: exactly one half; a bad uuid; the same link twice; an unlinked name repeated case-folded, each at `['deities', i]`. A typed name equal to a linked deity's name is fine. `asEntries` maps deities to a `DeityEntry` union as it maps substitutes.
- Planets, zodiac signs and colours: a repeat, case-folded and trimmed, is refused at `[field, i]` in `crossFieldRules`, blanks counted (they are still in the value there). This applies to both tiers.
- `deities` leaves `Lists` and `dropBlankEntries`.

### 2. Vocabulary — `src/modules/vocabulary/services/curated-values.ts`, `src/db/repository/vocabularies.ts`

- New `curatedRowsByIds(field: 'form' | 'deities', ids)` → `Map<id, name>` of live rows under a live group or tradition, through a new repository finder `findCuratedRowsByIds`. It shares the grouping predicate with `findCuratedRowsByName`.
- `curatedSpellings` and `CuratedField` narrow to `planets | zodiacSigns`. Form and deities no longer match by spelling.
- `findVocabularySuggestions`:
  - The deities' `IN_USE` source becomes `ingredient_deities.name`: live rows whose live parent is in the compendium or the proof's coven.
  - Every suggestion carries `id`: the curated row's id, or null in tier 2.
  - `FormSuggestion`, `DeitySuggestion` and `SuggestionRow` gain `id`. `readSuggestionPage` reads an `id` column.

### 3. Writes — `src/modules/ingredients/services/ingredient-rows.ts`, `workspace-ingredients.ts`, `compendium.ts`

- `columnsOf` drops `deities` and writes `formId`.
- New `resolveLinks(tier, fields, deities, held)`, shared by both tiers and run **before** `withAudit`, where `inCuratedSpellings` runs today (both read on another connection either way; MB.162's record already names that window).
  - `held` is the ingredient's current live deity rows: none on create, read through `findManyOfIngredients` on update and passed on to `replaceDeities`, so they are read once.
  - It reads `curatedRowsByIds` for `formId` and **every** deity id, held ones too, so a kept link to a curated row refreshes its spelling.
  - Issues: `['formId']` for an id naming no curated row; `['form']` for text not folding to the row's name; `['deities', i]` for a _new_ id naming no curated row. A held id that is no longer curated is kept with its stored text on the coven tier, and refused on the compendium tier.
  - It returns the fields with `form` and each curated link's `name` in the row's spelling, and throws one `ValidationError` carrying every issue.
  - **The slug is computed after it**, from the resolved `form`. Today the coven service computes it before any resolution, so that line moves.
- New `addDeities` and `replaceDeities(write, ingredientId, entries, held)` bring the live rows to the list:
  - **Match by key.** A link matches on `link:<deityId>` and a name as written on `name:<text>`, as `bringSubstitutesTo` keys. A name with no unlinked match also matches a held link of that exact text whose deity is no longer curated.
  - **Drop first.** Soft-delete the rows no longer listed, which frees their positions and the name and link indexes.
  - **Move through scratch, in two passes.** For the kept rows whose position changes: pass one moves each to `base + newPosition`, with `base = maxCurrentPosition + 1`, so every scratch value is above every live position; pass two moves each to `newPosition`. A row whose position is unchanged is not moved, and a spelling refresh is an update with no position in it. One `updateById` per step.
  - **Insert last.** Insert new rows at their positions.
  - The result: no tombstone, and no 23505 from the per-row index check.
- **Compendium** (`inCuratedSpellings` reworked into a compendium-only check):
  - `form` without `formId` → `['form']`, "pick it from the form list".
  - A deity entry without `deityId`, or whose id is no longer curated, held or not → `['deities', i]`. The admin re-picks. No dead link can exist there once M5.6a and MB.132 refuse the delete.
  - Planets and signs keep the spelling match.
  - Every refusal at once, as now.
- `parseInput` strips `deities` from `fields` alongside `folkNames` and `substitutes`. `IngredientFields` follows.

### 4. Reads — repository, services, loaders

- Repository: `findDeitiesOfIngredients(memberships, ids)`. It reads live `ingredient_deities` rows whose parent is readable, as `findManyOfIngredients` checks, left-joined to `deities` on `id = deity_id` AND the deity curated (live, under a live tradition), ordered by `(ingredient_id, position)`. This is not an escape hatch: the uncurated deity is filtered out and the row kept. It is added to the guard's pinned export list.
- `ingredient-children.ts`: `deitiesOf(session, refs)` → `IngredientDeityRow[] | Forbidden` per ref, in position order, admitted as `substitutesOf` is.
- Loaders:
  - `deitiesByIngredient`, in the ingredients module.
  - `ingredientFormsById` and `deityTraditionsById`, in the vocabulary module. The form loader reads through the same curated-by-id finder the write check uses, and answers `null` for an id no longer curated. The tradition loader is over `findManyByIds` and answers `NotFound`, as groups do; it is unreachable for a deity the read already filtered.
  - All three registered in `src/graphql/loaders/index.ts`.
- `updateIngredient`'s resolver clears `deitiesByIngredient` as it clears the other two loaders.

### 5. GraphQL

- `Ingredient`:
  - `formChoice: IngredientFormValue`, nullable, through `ingredientFormsById` when `formId` is set.
  - `deities: [IngredientDeity!]!`, through `deitiesByIngredient`.
- New types, in `src/modules/vocabulary/graphql/deities.ts`: `IngredientDeity { name, deity: Deity }`, `Deity { id, name, slug, description, tradition: DeityTradition! }` and `DeityTradition`.
- Inputs:
  - Both inputs gain `formId: ID`. It is required on `IngredientUpdateInput` as every field there is, so it takes `""` to clear.
  - Both take `deities: [IngredientDeityInput!]`.
- `FormSuggestion.id` and `DeitySuggestion.id` are `ID`, nullable.
- Run `npm run codegen` and update the SDL snapshot.

### 6. Drizzle schema, seed, fixtures, form

- `src/modules/ingredients/schema/ingredients.ts` stops declaring `deities`, with a comment as MB.136 left one. `ingredients-schema.test.ts` expects `deities` as the one column awaiting MB.168's drop.
- Seed, `src/db/seed/standard.ts` (`two-tier-vocabulary.ts` is untouched; it writes no ingredients):
  - `insertMissingIngredients` strips `deities` and writes `formId`, resolving each compendium form by its curated name. A name shared by two live forms (only `Curio` today) throws: the seed literal must then name its row, so it never guesses.
  - A new `insertMissingDeities` step after folk names writes the linked rows. It goes through `insertMissing`, keyed `ingredientId|lower(name)` over the live rows, with `position` taken from the literal's order. Only Mugwort and Bay Laurel carry deities, and every seeded deity name is unique. Keyed on the name rather than the link, so a local database that ran MB.166's fill (unlinked Artemis and Diana at positions 0 and 1) is not handed a second row at position 0. Staging seeds the reference vocabularies alone, so nothing there needs reconciling.
  - `SeedIngredient` in `seed/types.ts` follows.
  - `demo.ts` writes no deities. Its coven `rhizome` stays unlinked.
- Seed tests:
  - `tests/db/seed/standard.test.ts`'s deities case reads `ingredient_deities`, and it also asserts every compendium form and deity is linked.
  - `seeded-template.test.ts`'s MB.162 query swaps `unnest(deities)` for a join on the table, and checks `form_id` and `deity_id` against live rows.
- Fixtures:
  - `IngredientFixture` takes `deities: string[]` (unlinked names) and `formId`.
  - `tests/support/db/insert-ingredient.ts` writes `ingredient_deities` rows with `position`, beside the folk-name and substitute inserts, through the raw client (MB.101).
  - A small `insertDeityLink` writes a linked row, as `insertSubstituteLink` does.
  - `insert-ingredient.test.ts` follows.
- `IngredientForm/values.ts`: `toInput` sends `deities: deities.map(({ value }) => ({ name: value }))` and no `formId` (the form is create-only). `index.test.tsx`'s deity and form expectations follow. No visual change, since showing a pick is MB.169's.

### 7. Docs and task text

- New `claude-docs/design-decisions/mb.167-read-and-write-the-pick.md`, holding the calls above. Copy this approved plan to `mb.167-plan.md`.
- DESIGN.md §5 (form, deities, the compendium rule, `ingredient_deities`) and §7 (the `Ingredient`, input and suggestion types).
- `db/identity-model.md`, `db/ingredient-children.md`, `db/member-autofill.md`, `db/deity-vocabulary.md`, `db/compendium-writes.md`, `validation.md`, `graphql/schema.md`, `graphql/loaders.md`, and the decision records for MB.162 and MB.165 where they point forward.
- Task text, each then `task-board.mjs sync`ed:
  - MB.167: the type names.
  - M5.6a, M5.6b and MB.132: the rules follow the link, and the reverse index is theirs.
  - MB.169: the types it reads.

## Tests first (red, then green)

- **Validation** (`tests/modules/ingredients/validation/ingredient.test.ts`): deity one-of; repeated link or name at `['deities', i]`; typed name equal to a linked name passes; planet, sign or colour repeat at its index on both variants; bad `formId` uuid.
- **Workspace service** (db): linked form plus linked and typed deities read back; Greek and Roman Hecate read back as two.
  - Order kept. A reorder keeps row ids, writes the new positions, leaves no soft-deleted row, and raises no 23505.
  - A missing or deleted `formId` or deity id is a `ValidationError` at its path, never a 23503.
  - The text is written in the curated spelling.
  - Soft-deleting the linked form or deity, or its group or tradition, leaves the text, read back as `formChoice: null` or `deity: null`.
  - A save after that delete, sending back what was read (deity names, no `formId`), keeps the same deity row ids and links with no tombstone, and clears `form_id`. Re-sending a dead `deityId` is kept; a dead `formId` is refused. A _new_ link to the deleted row is refused.
- **Compendium service:**
  - MB.162's block in `compendium-entries.test.ts` is reworked. Its `UNCURATED` and `RETIRED` cases for form and deities become "unlinked" and "linked to a retired row (or a retired group or tradition)".
  - Unlinked form or deity refused beside the field, with the precondition that the same input saves on a coven ingredient.
  - Linked values saved.
  - The spelling test checks the link's text against `ingredient_deities` rather than the column.
  - The planet and sign spelling rule is unchanged.
- **Query shape:** `suggestions-query.test.ts`'s deity block asserts the in-use scan reads `ingredient_deities`.
- **GraphQL:**
  - A page of ingredients resolves `formChoice` and `deities` in one query each. This is counted with `compendium.test.ts`'s repository spies, as substitutes' one read is.
  - `graphql-workspace-ids.test.ts`'s `WHOLE_INGREDIENT` gains `formId`.
  - `formSuggestions` and `deitySuggestions` carry `id`, null for an in-use value.
  - In-use deities are read from the table.
  - The direct-id authorization tests on `deities` hold.
- **Schema:** nothing declares `ingredients.deities`, and the column still exists.

## Verification

1. `npm run test:coverage` (80% line).
2. `npm run pre-commit`.
3. `npm run codegen` with no diff after commit.
4. `npm run build`, because the RSC graph is only checked by a build.
5. `npm run db:reset` against the standard seed.

Then comment progress on MB.167. Stop for `/create-pr`.
