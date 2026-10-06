# MB.164 to MB.169 — Show what a picked form, deity and substitute is, and store the pick

**Status:** decided · **Date:** 2026-10-06

## Context

The ingredient form's lookups show detail in their dropdown rows but drop it once a row is picked:

- **Form:** the row says "Wax (Animal)", but the field then reads "Wax".
- **Deities:** the row says "Hecate (Greek)", but the chip reads "Hecate".
- **Substitutes:** the row says "Mockwort (Fixtura vulgaris)" with "Compendium entry" under it. The chip keeps the formal name but loses whose entry it is and the form, so two Mockworts in different forms look the same.

The user wants to be able to tell that the right one is selected.

For Form and Deities, the detail isn't only hidden, it isn't stored. Curated names are deliberately not unique: two live "Wax" rows in different groups, two "Hecate" rows in different traditions. `ingredients.form` is `text` and `ingredients.deities` is `text[]` (DESIGN.md §5, lines 343–372). So "Wax (Animal)" and "Wax (Substance)" save identically. **The owner chose to store the choice first, and to build the UI on top of it.**

Owner's decisions:

- **Deity chips** read "Hecate (Greek)", the tradition inline, and the description is in a tooltip.
- **Form box:** after a pick it keeps "Wax" as editable text, with a muted "Animal" at its right before the chevron. Hovering "Animal" shows the description as a tooltip. Editing the text away from "Wax" drops the link.
- **Substitute chips** read as they do now. Form, whose entry it is and the description go in a hover tooltip.

## The architecture change, and what it keeps

This changes §5's rule "a vocabulary a member writes is text". It changes it by adding to the text, not replacing it:

- **The text stays.** `form` and each deity's name stay text, they stay identity (`canonicalKey` is unchanged), and an uncurated value such as `rhizome` stays writable.
- **The link is optional and sits beside the text.** It records which curated row a pick named, and only when the member picked one. Typed text is never resolved into a link behind the member's back, as §5 already says of substitutes.
- **A link to a soft-deleted curated row reads as unlinked text.** The repository's normal filter drops the row, and the name is still on the ingredient. That matches §5's "the value … moves into the uncurated bucket", and it needs **no new soft-delete exception** (rule 4).
- **Out of scope, but noted in the record:** two entries with the same formal name, one picked as "Wax (Animal)" and one as "Wax (Substance)", still collide on `canonicalKey`. Identity stays on the text.

This is recorded in `claude-docs/design-decisions/mb.165-record-the-picked-vocabulary-row.md`. DESIGN.md §5 is corrected in that PR: lines 343, 347, 364, 372, 413 and 450, and MB.127/MB.132's "stays `text[]`" wording.

## The tasks: one per PR, minted as MB.164–MB.169

Before minting, re-check the board and `git log` for the next free id; MB.162 is the highest today. MB.164's PR mints the rest, as MB.142 did. Each task gets an entry in `claude-docs/tasks/mb.md`, a row in `TASKS.md`'s Wave 8 execution order, a line in `waves/wave-08.md`, and `task-board.mjs sync`. The task notes say "after MB.x merges" where one depends on another.

| ID     | Task                                                                        | Kind      | Est. |
| ------ | --------------------------------------------------------------------------- | --------- | ---- |
| MB.164 | Show what a picked substitute is                                            | UI        | 2h   |
| MB.165 | Add `ingredients.form_id` and the `ingredient_deities` table                | table     | 2.5h |
| MB.166 | Fill `ingredient_deities` from `ingredients.deities`                        | data fill | 1h   |
| MB.167 | Read and write the picked form and deities, and hold the compendium to them | behaviour | 6.5h |
| MB.168 | Drop `ingredients.deities`                                                  | contract  | 1h   |
| MB.169 | Show what a picked form and deity are                                       | UI        | 3h   |

**Execution order:** MB.162 → MB.164 → MB.165 → MB.166 → MB.167 → MB.169 → … MB.168. MB.168 goes after MB.167 has deployed to staging (two-PR drop rule). Not production: it isn't live yet (owner, 2026-10-06).

**MB.162 finishes as designed (owner's call, 2026-10-06).** Another session is building it in `/app`. It matches compendium form and deities by spelling, and an entry holding "Wax" counts as curated while either Wax is live. **MB.167 takes over moving that to links:**

- A compendium entry's form and deities must each carry a link to a live curated row.
- MB.162's delete-refusal and rename-cascade rules for form and deities work on the link, not the spelling.
- Planets and signs keep MB.162's spelling match.

Estimated at about +1.5h on MB.167. MB.162's entry isn't edited by MB.164, since the other session holds `tasks/mb.md` changes. MB.167's entry names the work instead.

### MB.164 — Show what a picked substitute is (independent; lands first)

**`src/components/Combobox/entry.tsx`, `types.ts`:**

- `ComboboxEntryProps` gains `detail?: string`.
- When `detail` is set, the tooltip shows `value` and `detail` together, and opens on hover or × focus whether the text is cut off or not. Without `detail`, it keeps today's only-when-cut-off rule.
- The × gets `aria-describedby` pointing at the tooltip (joined with `errorId`), so a screen reader hears the detail too.
- Escape and the 150ms close delay are unchanged.

**`src/components/IngredientForm/suggestions.tsx`:**

- `IngredientSuggestions` also asks for `form` and `description`. Both are already on `Ingredient`, so the schema doesn't change.
- `substituteOptions` puts `form`, `isGlobal` and `description` into the `link`.

**`types.ts`:** `SubstituteLink` gains `form`, `isGlobal` and `description`, which are display only.

**`values.ts`:**

- New `entryDetail(entry)` returns "Dried leaf · Compendium entry — description", or undefined for typed text.
- `toInput` still sends `{ ingredientId }` only.

**`fields.tsx` `ListField`:** passes `detail={entryDetail(row)}`. Chip text (`entryText`) is unchanged.

**Tests:**

- `tests/components/Combobox/index.test.tsx`: a tooltip with detail opens on an uncut chip, and the ×'s description includes it.
- `tests/components/IngredientForm/index.test.tsx`, around the linked-substitute cases (~:1899, :2043): the tooltip names form and tier, and typed text has none.

**Also:**

- Story: add a `form` to the INGREDIENTS mock.
- Docs: `combobox.md` "An entry" and `ingredient-form.md` lines 120–130 and 182–193.

### MB.165 — The table task

**`src/modules/ingredients/schema/ingredients.ts`:**

- Adds `formId: uuid('form_id').references(() => ingredientForms.id)`, nullable.
- Adds CHECK `form_id is null or form is not null`.

**New `src/modules/ingredients/schema/ingredient-deities.ts`:**

- Shaped on `ingredient-substitutes.ts`: `id`, `ingredientId` FK, `deityId` (nullable FK to `deities`), `name text not null` (the label, so a soft-deleted deity still reads by name), and `...auditColumns`.
- Partial index on `ingredient_id`.
- Partial unique `(ingredient_id, deity_id)` where linked.
- Partial unique `(ingredient_id, lower(name))` where unlinked. Greek and Roman Hecate may both sit on one ingredient.
- CHECK name not blank.
- Its own `set_updated_at` trigger line.

**Migration and tests:**

- The migration is additive, and `db:generate`'s own: MB.141, whose pending drop `db:generate` would otherwise emit, merges first (owner, 2026-10-06).
- Schema tests: amend `ingredient-forms-schema.test.ts:125-150` and `deities-schema.test.ts:112-135`. They now assert that the text stays and that the key is nullable and separate.
- New `tests/modules/ingredients/schema/ingredient-deities-schema.test.ts`.

**Docs:** the design-decision record and the DESIGN.md §5 corrections ride this PR.

### MB.166 — The fill

A `generate --custom` migration copies each `ingredients.deities` entry into `ingredient_deities` as an **unlinked** name, never auto-linked. It follows MB.139's shape, and a `tests/db` test asserts the result row by row.

### MB.167 — Read and write the links

**Validation (`validation/ingredient.ts`):**

- Adds `formId: optionalText`.
- `deities` becomes `{ deityId?, name? }[]`, using the `substituteRules`/`asEntries` pattern.

**Services:**

- In `ingredient-rows.ts`, `columnsOf` writes `form_id`. A `formId` must name a live curated row, or the save is refused with a `ValidationError` on `form`. `form` is written as that row's name.
- Deities are written with `addDeities`/`replaceDeities`, copied from the substitute helpers. A linked deity must be live, and its `name` is that deity's name.
- The workspace and compendium services both go through these.

**GraphQL:**

- Input: `IngredientInput.formId: ID`, and `deities: [DeityInput!]` (`{ deityId: ID, name: String }`).
- Read: `Ingredient.formChoice: IngredientFormValue`, which is null when unlinked or when the row is soft-deleted. `Ingredient.deities` becomes `[DeityRef!]` with `name` and `deity: Deity` (nullable, with the tradition).
- Both use per-request DataLoaders through `define-loader.ts`.

**Suggestions:**

- `FormSuggestion` and `DeitySuggestion` gain `id: ID`, null for an in-use row. The repository already selects it as `tiebreak`.
- `IN_USE` for deities reads `ingredient_deities`.

**Also:**

- Remove every code reference to `ingredients.deities`, the Drizzle schema included, without running `db:generate`.
- The seed writes deities through the table.
- Update `IngredientForm` minimally so it still sends a valid input: deities go as `{ name }`, and there's no `formId` yet.
- Regenerate the SDL snapshot and run `npm run codegen`.
- Direct-id refusal tests: a `formId` or deity id that is soft-deleted, or that names no row, is refused as a field error. The precondition asserted is that the row exists, or existed. The vocabularies are global, so there is no cross-workspace case.

### MB.168 — Drop the column

Drops `ingredients.deities` in a migration with its `.ack.md` sidecar. It goes only after MB.167 has deployed to staging, since production isn't live yet.

### MB.169 — Show what a picked form and deity are

**Form:**

- `IngredientFormValues` gains `formLink?: { id, group, description }`. A pick sets it; editing the text away from its name clears it.
- `toInput` sends `formId`.
- `Combobox` gains an `adornment?: { text, detail }` prop: muted text before the clear and chevron controls, with the tooltip from MB.164. It is also announced through the input's `aria-describedby`.
- `FormField`'s `SuggestField` passes `onPick`'s option through. Today `fields.tsx:183` drops it.

**Deities:**

- `ListEntry` for deities gains `link?: { id, tradition, description }`. `deityOptions` carries `link` and `key` from the new suggestion `id`.
- The chip reads "Hecate (Greek)" through `entryText`, and its tooltip carries the description through `entryDetail`.
- `toInput` sends `{ deityId }` or `{ name }`.

**Tests:**

- Picking Greek Hecate, then Roman Hecate, gives two distinct chips and two distinct `deityId`s in the sent input.
- The Form adornment appears on a pick and clears on edit.
- Typed `rhizome` sends no `formId`.

**Also:** stories and both component docs.

**Styling:** only tokens and the existing `.combobox__note` muted style, so no design review is needed.

## Reused, not rebuilt

- **Link-or-text pattern:** `ingredient-substitutes.ts`, `substituteRules`/`asEntries` (`validation/ingredient.ts:82-94, :176-198`), `addSubstitutes`/`replaceSubstitutes` (`services/ingredient-rows.ts:79-171`), and `toInput`'s link branch (`values.ts:89-91`).
- **Tooltip:** `ComboboxEntry`'s tooltip and the `tip-bubble` mixin. "Name (qualifier)" labels come from `qualified()` (`suggestions.tsx:142`).
- **Fill/switch/drop sequence:** follows MB.138 → MB.141 and MB.158 → MB.160.

## Verification (per task)

- `npm run pre-commit` and `npm run test:coverage` (80% line). The schema tasks also run `npm run check:destructive-ddl`.
- MB.165–167: run `npm run db:reset` and check the seeded rows with `psql`. MB.167: run `npm run build`, since the RSC graph is involved.
- UI tasks (MB.164, MB.169): open the `IngredientForm` story in the workshop. Hover and Tab to each chip's × and check the tooltip. Check that Greek and Roman Hecate read differently. Then run the Playwright axe pass over the form.
