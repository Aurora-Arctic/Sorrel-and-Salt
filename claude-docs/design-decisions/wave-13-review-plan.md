# Wave 13 review — plan

## Context

The owner asked for the same review Waves 9, 10 and 11 had: read Wave 13's 34 task entries against the code on staging, `DESIGN.md`, the decision records and the conventions landed since the entries were last corrected (2026-10-16, the spell steps and workings plan), and correct them before anyone builds. Four checks: every promised grimoire behaviour has a task; UX, usability and accessibility are written into the entries; DRY is written into the entries; the entries name the components, routes, helpers and commands that exist today.

Nothing is built or started: all 34 Wave 13 issues are open on the board (checked 2026-10-23). On staging the grimoire module holds only the three schema files and `setSpellVisibility`; no spell GraphQL, validation, route, nav row or story spec exists. Statuses do not move in this PR.

Worktree: `/home/node/worktrees/wave-13-review`, branch `feature/wave-13-review` off `origin/staging` at `8ce76932`. Doc-only change; no code.

Wave 13 order (`claude-docs/TASKS.md:57`): M10.1 · M13.1 · M10.5 → M10.9 · MB.8 · M10.10 · M13.2 · M10.11 → M10.16 · M13.3 · M10.17 → M10.21 · MB.6 · M10.22 · M13.4 → M13.8 · MB.123 · M13.9.

Files edited: `claude-docs/tasks/m13.md`, `claude-docs/tasks/m10.md` (M10.1, M10.5–M10.22), `claude-docs/tasks/mb.md` (MB.6, MB.8, MB.123), `claude-docs/waves/wave-13.md`, `claude-docs/TASKS.md` (row and counts), plus `claude-docs/design-decisions/wave-13-review-plan.md` (this plan).

## Owner decisions (decided 2026-10-23: the recommended option on every one, and the hours table accepted)

**D1. Story numbers 65–69 are taken.** MB.176 (bug reports, minted 2026-10-07) holds story 65 and says the v1 count becomes 53; M16.1–M16.6 (minted 2026-10-16) hold 70–75. The workings plan (also 2026-10-16) took 65–69 on top. Stories 67 and 68 have no text anywhere (the plan wrote only 65, 66 part and 69). `tests/support/story-sections.ts` ends at 64 and `tests/guards/story-sections.test.ts` fails on an unmapped story.

- Recommended: renumber the grimoire additions to **76–80** (65→76 record a working, 66→77 step units, 67→78 complete and deduct, 68→79 workings on the recipe page and the count, 69→80 steps), write the one-line text of 78 and 79 into M13.5 and M13.8, and make M13.4 responsible for the §10 list, the `story-sections.ts` rows (`'Coven - Spells - Workings'`) and the count statements in CLAUDE.md, `claude-docs/testing/acceptance.md:29` and `claude-docs/ci/reusable-checks.md:194`. M13.1 does the same for story 80.
- Alternative: move MB.176 to 76 and M16 to 77–82. More edits, in waves this review does not own.

**D2. Editing a saved spell has no task.** M10.12 builds `/grimoire/new` only; §9 (`DESIGN.md:1339-1341`) lists list, `new` and `[id]`, no edit route; §7 (`DESIGN.md:882-883`) has `createSpell` and `setSpellVisibility` but no `updateSpell`, although M10.10 builds one. The steps editor (M13.3) and the `note` field have no screen after creation.

- Recommended: mint **M13.10 — Edit a saved spell** (3h): `/coven/[slug]/grimoire/[id]/edit` reusing the spell builder, an Edit control on the recipe page (members and owners, never viewers), `updateSpell` added to §7 and the route to §9, story 55's flow extended. Placed after MB.6.
- Alternative: extend M10.12 (already 2h; would need +3h and two routes in one PR).

**D3. Deleting a spell has no task.** §5 (`DESIGN.md:492`) says a shared spell can still be deleted and `access-control.ts` grants `spell: ['delete']`, but no entry builds `deleteSpell`, its mutation or a control.

- Recommended: mint **M13.11 — Delete a spell** (2h): service under `spell: ['delete']`, soft delete that carries the spell's steps and workings with it, mutation, a Delete control on the recipe page following M9.10's pattern (`.btn--destructive`, `ConfirmQuestion`), `deleteSpell` in §7. Placed after M13.10, before M10.22.
- Alternative: fold into M13.10 (breaks one task per PR).

**D4. Reopening a completed spell that has workings.** M10.20 says "Marking complete is explicit and reversible"; M13.5 records a working only against a `complete` spell. A working pins the revision it was made from (§13 note in M13.1), so an existing working survives a reopen.

- Recommended: reopening stays allowed; existing workings keep their records and deductions; no new working can be recorded until the spell is complete again, with an explaining error. Written into M10.20 and M13.5.
- Alternative: refuse reopening while any working exists.

**D5. The working permission.** `access-control.ts` has `spell: [read create update delete]` for member and owner and `spell: ['read']` for viewer; nothing for workings. A permission is a per-role statement, never a rank.

- Recommended: M13.5 adds a `working` statement (`read create update delete` for member and owner, `read` for viewer) to `access-control.ts` and its tests, so viewers write nothing and the check reads as what it is.
- Alternative: reuse `spell: ['update']` for recording a working (reads as editing the recipe, which it is not).

## Corrections (no decision needed; applied by the lanes)

Every item below was checked against staging unless marked "lane verifies first".

### Lane 1 — data layer entries: M10.1, M13.1, M13.2, M13.9, M10.5–M10.10, MB.8

1. **M10.1** (`m10.md:7-22`): "make test-stories reports them" → "`npm run test:stories` reports them"; "Sixteen failing tests" → "sixteen `test.fixme` browser flows, one per story". Story numbers per D1. `tests/e2e/stories/06-grimoire.spec.ts` does not exist, so "Create" is right; the README row at `tests/e2e/stories/README.md:61` says "47-57" and the entry must widen it.
2. **M13.1**: the next migration is `0083` (when this review ran it was `0081`, the latest being `0080_astrology-position-expand.sql`; by the start of M13.1 staging held `0081_compendium-seed-state-expand.sql` and a branch in flight held `0082`); say so. The 0067 precedent creates its view with `SELECT *` before the `ADD COLUMN`s, so the view misses new columns and `0068` refilled rows: M13.1 must create the view after the adds (or list columns), and say whether rows an old deploy writes through the view need a refill. `position` replaces `layer_order` which is `NOT NULL`: backfill `position` from `layer_order`. The rename list must name every constraint and index, because renaming a table renames none of them: `spell_ingredients_spell_id_layer_order_unique`, `_spell_id_variant_id_unique`, `_spell_id_custom_name_unique`, CHECKs `_ingredient_or_name` (today `= 1`, becomes `<= 1`), `_form_only_on_custom`, `_variant_with_ingredient`, `_name_not_blank`, `_form_not_blank`, FK `spell_ingredients_variant_fk` and the five migration-created FKs, trigger `set_updated_at`. Add to the file list: `spellLayerWrites` (`lockLayersOfVariants`, `moveLayers`) and `SpellLayerRow` in `src/db/repository/types.ts`; seed `src/db/seed/types.ts` and `demo.ts`; tests `tests/db/migrations/0072-fluid-ounces.test.ts`, `tests/modules/grimoire/schema/types.ts`, `tests/db/seed/demo.test.ts`; the ingredient-service tests selecting from the table are three, not two (`convert-compendium-to-local`, `compendium-entries`, `workspace-ingredients`). `findManyOfSpellIngredientsIncludingSoftDeleted` reads categories and folk names of ingredients in readable spells, not steps: do not rename it to "steps". `existsIn` is in `select.ts`, not `spells.ts`. The old names go into `PENDING_DROPS` (`tests/db/schema-drift.test.ts:50-55`, kinds `view` and `column`) and M13.9 empties them. The "two-step column rename" rule: cite `.claude/rules/database.md:72` (RENAME is destructive DDL) rather than an unnamed heading. §5 and `db/grimoire.md` carry the two `num_nonnulls` CHECKs. Story 80 (D1).
3. **M13.2**: `unitConvert` (`src/modules/ingredients/units/convert.ts:74`) refuses every `count` conversion, identical units included. State: a step in `count` saves when the jar's unit is `count` too, by equality, and deduction subtracts it without calling `unitConvert`. Validation paths are arrays: `['steps', i, 'unit']`, not `steps.0.unit` (`src/lib/errors.ts:39`, `src/graphql/errors.ts:13`). No `src/modules/grimoire/validation/` exists: MB.8 creates it, M13.2 extends it. Story number per D1; "Story 66 (part)" → the step-units story is wholly M13.2's once numbered.
4. **M13.9**: cite `0069_drop-planet-columns.sql` and its `.ack.md` (MB.254) as the contract precedent. "No code or doc names `layer_order`, `instructions` or the view" → "no code or live doc; design-decision records and migrations keep the old names".
5. **M10.6**: `resolveSpellVisibility()` is not built; what exists is `setSpellVisibility` (`src/modules/grimoire/services/spell-visibility.ts`, a service with `withAudit`). Reword M10.6 as the one-way rule on `setSpellVisibility` plus a pure readable-spells predicate used by every spell finder and, later, by workings (one helper, not two inline checks: M13.5 names it).
6. **M10.5, M10.9**: `findPageInWorkspace` and `findPageInTiers` (`src/db/repository/finders.ts:129,154`) require `NotVisibilityScoped` (`types.ts:62`), so they cannot page `spells` or `spell_workings`. M10.9 adds a spell-scoped page helper beside them, through `t.pagedConnection`; M13.6 reuses it. Judgement: M10.9 +0.5h.
7. **M10.10**: "layer" → "step" wording; name which column each write touches (`note`, with `instructions` only until M13.9); the table is `spell_steps` (view `spell_ingredients` until M13.9). Same three-word note for every M10 entry after M13.1 in the order.
8. **MB.8**: "imports M9.2's shared unit-to-dimension module" → name `src/modules/ingredients/units/` (`dimensionOf`, `Unit`); "layer" → "step"; creates `src/modules/grimoire/validation/`.
9. **M13.1 and M13.4**: say which audit column set each new table spreads: `auditColumns` for rows that soft-delete, `auditStampColumns` (`spell-categories.ts`'s choice) for replaced-wholesale rows such as participants and deductions.

### Lane 2 — UI entries: M10.11–M10.22, MB.6, M13.3, MB.123

10. **M10.11**: the search stack is now `IngredientSearch` (list shell), `defineSearchParams` (add a grimoire set beside `COVEN_PARAMS`), `readPageCursors`, `pagerHrefs`, `Pager`, `FilterForm`, `ListFrame`, `SearchSentence`, `FacetPanel`/`FacetCombobox` with M12.52's sort order (`claude-docs/components/ingredient-search.md`; model page `src/app/(shell)/coven/[slug]/ingredients/page.tsx`). Name them instead of "category chips", "debounced search" and "URL state". Add: the `sections.ts` row (the comment at `src/components/CovenNav/sections.ts:13-16` reserves it for M10.11; icon `grimoire` exists), a `PARTS_OF_SECTION.grimoire` entry in `src/lib/coven-path.ts:92-96` (shape `cards`, title, filter) for the M12.33 skeleton, `requireSession()` in the page (the shell layout does not call it), `metadata.title`, a `SpellCard` in the `IngredientCard`/`CovenCards` pattern with `CovenCards`' empty and no-match states (`coven-cards.md:29-42`), `PendingLink` for navigation, `Skeleton` for the region. Judgement: 2h → 4h.
11. **M10.12**: `/new` only; the edit route is M13.10 (D2). Loading and failure wording per M12.33 and M12.31: `BusyButton` on Save, `Notice` in the form, no `loading.tsx`. Form save rules: Save disabled until valid, spinner while saving, quiet Cancel. Title Case labels; no "(Optional)".
12. **M10.13**: state the control for a two-value, widen-only choice (recommend a `ComboboxSelect` or the radio the Stock dialog uses; lane verifies which the codebase has) and that the explaining error on narrowing is shown with `Notice`.
13. **M10.14**: "Grouped category chips reused from IngredientSearch" → display with `CategoryChips`, edit with `CategoryPicker` (`claude-docs/components/category-chips.md`, `category-picker.md`); neither is part of IngredientSearch.
14. **M10.15**: "Compose IngredientSearch with an Add to jar action slot" → the picker is the `ingredientSuggestions` type-ahead with two headed groups, "Your Ingredients" then "Compendium" (`claude-docs/graphql/schema.md` ~404–430; cupboard plan line 127); the saved step stores `ingredient_id` plus `variant_id`, never a cupboard row; a spell may name a live compendium variant with no cupboard row; a retired compendium variant already in use still shows but cannot be newly added. Quantity and unit fields use `StockFields`' unit select if it is reusable (lane verifies). Judgement: 2h → 3h.
15. **M10.16**: "layer" → "step"; reorder by handle and by keyboard, reusing the sortable flow in `Combobox` (`sortable.tsx`, `flow.ts`; lane verifies the export name); an aria-live message after move, add and remove, and focus kept on the moved row.
16. **M10.17**: Save and error wording per the form save rules; `BusyButton`, `Notice`.
17. **M10.18**: cite `claude-docs/components/safety-note.md` (its line 22 already names the spell builder) and the marks `ToxicMark`, `CautionMark`, `SafetyMark` from `EntryMarks`; say which mark sits beside a step.
18. **M10.19**: "not held" → "not in the cupboard"; a compendium-only step counts as out of stock, since no jar exists for it; use `StockBadge` and `stockState` (`stock-badge.md`); never colour alone.
19. **M10.20**: reopening per D4; the unit refusal result from `unitConvert` is shown as text, never NaN or a guess.
20. **M10.22**: no change to the print rule (`.claude/rules/components.md` already reserves `_print.scss` for M10.22). Add: the print control is a `BusyButton`-free plain button, hidden in print, and the 375px layout prints the summary first.
21. **MB.6**: delete "a card's tooltip" clause (M12.43: no tooltip unless a rule or format trap; IconTip is not hoverable). Add `LastEdit` (`claude-docs/components/last-edit.md`) under the title, no Edit or Delete control (first written as placeholders for M13.10 and M13.11 to fill; changed 2026-10-23 after the review agent noted they would ship as dead buttons, so each task adds its own control), `requireSession()`, the jump menu pattern from the ingredient entry page if sections exceed one screen (lane verifies the component name), `Skeleton` shape `page` via `PARTS_OF_SECTION`. Judgement: 2h → 3h.
22. **M13.3**: "Placeholders stay short with the detail in the InfoTip" → "placeholders are one or two example words; an InfoTip only where a rule or format trap needs it (M12.43)". Keyboard reorder and live-region announcement as in item 15; a step with `body` only, `ingredient` only, or both is each reachable from the keyboard. A `StepRow` presentation component under `src/components/` shared with MB.6's read view and M13.8. Judgement: 2.5h → 4h.
23. **MB.123**: "_Left by MB.115_" names `StackTable` (a sub-export of `DataTable`, `src/components/DataTable/index.tsx:79`) and `FilterSelectField` (in `src/components/Field/`): cite by path. Add to the review list: `SpellCard` and the card list's empty states, `Skeleton` shapes, the focus ring (M12.45), click feedback (M12.31), tooltip triage (M12.43), and that after add, remove and reorder of a step, focus and an aria-live message are asserted in the story spec, since axe does not check them.

### Lane 3 — workings entries: M13.4–M13.8, the two new entries, wave file, TASKS.md row

24. **M13.4**: stories per D1 (list, `story-sections.ts` rows, the four count statements); `auditStampColumns` for participants and deductions per item 9; §5 carries the three tables and their CHECKs. Judgement: 2h → 3h for the story and count edits.
25. **M13.5**: `updateStock` (`src/modules/ingredients/services/stock.ts:121`) opens its own `withAudit`, so it cannot join the working's transaction. Add a repository-level decrement writer that takes the caller's write handle, called inside the working's `withAudit`; no second service path. One pure `planDeductions` in `src/modules/grimoire/` computes the preview (M13.7) and the completion (M13.5), tested to agree. Count units deduct by equality (item 3). An instruction-only step deducts nothing, asserted. Existing workings keep their own visibility when the spell widens. Reopening per D4. Permission per D5. "read under their last name (MB.10)" → "read under the display name the user's row last held (`displayNamesOf`, MB.10)". Judgement: 3.5h → 4.5h.
26. **M13.6**: `Spell.workings` through the spell-scoped page helper from item 6 and `t.pagedConnection`; loaders through `defineLoader` only; the deduction preview query returns `planDeductions`' result, with a per-step refusal reason.
27. **M13.7**: follow `claude-docs/components/modal.md` (`Modal`/`ModalButton`, focus return to the Record button, unsaved-changes warning, `ConfirmQuestion` for the destructive question); a refused conversion shows per row as "not deducted: units differ", never a silent zero; participants picker is a `Combobox` of co-members with chips inside the control; Title Case; form save rules. Judgement: 3.5h → 4.5h.
28. **M13.8**: "The grimoire card (M10.11) shows the count" → `SpellCard` (item 10) shows `workingCount`; workings list reuses `StepRow`/`LastEdit` patterns; the recipe page's working rows show the recorder and participants through `displayNamesOf`.
29. **New entries** M13.10 and M13.11 per D2 and D3, in `m13.md`, with stories 55 (edit) and a new line in §10 if the owner wants a story for delete (recommend none: deletion is story 56's "stays with its author" rule exercised, not a new story).
30. **`waves/wave-13.md` and `TASKS.md:57`**: new order `… M10.21 · MB.6 · M13.10 · M13.11 · M10.22 · M13.4 → M13.8 · MB.123 · M13.9`; counts in `m13.md:3` and `TASKS.md` milestone table updated (m13 becomes 11 tasks, hours per the judgements the owner accepts).

### Judgements on hours (owner accepts or rejects each)

| Entry  | Now  | Proposed | Why                                                      |
| ------ | ---- | -------- | -------------------------------------------------------- |
| M10.9  | 2h   | 2.5h     | spell-scoped page helper                                 |
| M10.11 | 2h   | 4h       | search stack, nav row, skeleton entry, card, empty state |
| M10.15 | 2h   | 3h       | two-group picker, variant id, quantity and unit          |
| MB.6   | 2h   | 3h       | steps, summary, LastEdit, jump menu, skeleton            |
| M13.3  | 2.5h | 4h       | keyboard reorder, three step kinds, StepRow              |
| M13.4  | 2h   | 3h       | stories and count statements                             |
| M13.5  | 3.5h | 4.5h     | decrement writer, planDeductions, permission statement   |
| M13.7  | 3.5h | 4.5h     | modal conventions, preview, refusal rows                 |
| M13.10 | —    | 3h       | new                                                      |
| M13.11 | —    | 2h       | new                                                      |

## Execution after approval

**No code changes at all, comments included.** The PR touches only files under `claude-docs/`. Where an entry says a code comment or file must change (the `sections.ts` reservation comment, `story-sections.ts`, `PENDING_DROPS`, `CLAUDE.md`'s story count, `DESIGN.md` §5/§7/§9/§10), the entry assigns that change to the task that builds the feature; this PR does not make it.

Three Sonnet lanes (general-purpose, `model: sonnet`), doc-only, in the worktree, each briefed with its items above and the sweeps' `path:line` evidence; each verifies a "lane verifies first" item by reading the named file before writing. Lanes 1–3 touch different entries; lane 3 also owns `wave-13.md` and `TASKS.md`.

Main session: commits per lane (`Wave 13 review: …`, no attribution), then:

- `node scripts/task-board.mjs sync <every edited ID>`; `estimate` for the accepted hour changes.
- Mint M13.10 and M13.11 through `/create-feature-task`'s mechanism (`task-board.mjs`), milestone Wave 13 — Grimoire, placed after MB.6.
- `reorder` dry-run; `--apply` only from a staging checkout once the row is in.
- Milestone description PATCH with `gh api --input` for the new order.
- Copy this plan to `claude-docs/design-decisions/wave-13-review-plan.md`.
- PR into staging only when the owner asks; suggest `/clear` at the boundary.

## Verification

Doc-only: `npm run format:check` and `npm run lint` on the changed files; no coverage run. `node scripts/task-board.mjs list` filtered to Wave 13 shows 36 open issues after minting.
