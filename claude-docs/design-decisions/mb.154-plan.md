# MB.154 — IngredientForm — References field

**Status:** approved · **Date:** 2026-10-06

The scoping plan as approved.

## Context

MB.153 shipped the references behaviour: `referenceSuggestions(workspaceId, query)`, `createReference`, `updateReference`, `Ingredient.references`, and `LocalIngredientInput.references` as `[{ referenceId, locator }]`. Nothing in the UI writes them yet. MB.154 adds the References field to `IngredientForm`: search existing sources (the compendium's and this coven's), link one with an optional locator, or add a new source through a citation sub-form without leaving the ingredient. M5.5's compendium page is the next to wrap the form; this task wires the coven form only, as the form does today.

## Decisions (owner's calls, this scoping)

- **References are rows beneath the box, not chips inside it.** The control holds only the search box. Each reference is a full-width row below it: the citation, wrapping in full; a "Locator" box; and its ×. This reads as a bibliography. The task text says "chip", so its entry and acceptance criterion are amended and synced.
- **The sub-form is an inline panel** beneath the field, a "New Reference" fieldset with Save Reference and Cancel. It is not a dialog: M8.16 will put this form in a modal, and a dialog here would stack two. There is no nested `<form>`.
- **A "New Reference" button replaces Add** beside the box. It opens the panel, as the list's "Add a reference" row does. Typed text is a search, never an entry, so Add has nothing to add.

## Calls made without asking (named in the record)

- **"Add a reference" is always the list's first row**, blank box included, in place of "Use what you typed". It does not prefill the panel: a search for "grimm" might be an author or a title.
- **Enter with nothing highlighted does nothing** but close the list. It never adds anything and never submits the ingredient.
- **A source already listed is not offered again**, filtered out of the suggestions as the element box filters its chosen choices. The schema's "already listed" refusal stays as the server's backstop.
- **Text left in the search box stops the save**, as in every list: 'Pick a source for "grimm", or clear the box'. **An open, unsaved panel stops it too**: "Save the new reference, or cancel it", on the References field's error element.
- **A row reads the plain `citation`**, as the task's chip did (MB.151), with a muted second line for its tier: "Compendium source" or "This coven's source". Italics stay MB.155's.
- **Kind labels for a reader:** Book, Chapter in a Book, Journal Article, Reference-Work Entry, Web Page. Each kind's fields come from what `renderCitation` prints for it (`src/lib/citation.ts`), so the panel offers nothing the citation would drop.
- **The estimate goes from 2h to 5h** through `task-board.mjs estimate`, since the panel and its per-kind fields are most of the work.

## The panel's fields per kind

Required fields are marked `*`.

| Kind                 | Fields, in order                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Book                 | Title\*, Authors, Contributors, Edition, Volume, Series, Place, Publisher, Published\*, then the online tail                    |
| Chapter in a Book    | Chapter Title\*, Book\* (`container`), Authors, Contributors, Pages, Edition, Volume, Series, Place, Publisher, Published, tail |
| Journal Article      | Article Title\*, Journal\*, Authors, Volume, Issue, Published, Pages, tail                                                      |
| Reference-Work Entry | Entry\*, Reference Work\*, Authors, Edition, Contributors, Place, Publisher, Published, tail                                    |
| Web Page             | Page Title\*, Site, Authors, Publisher, Published, Last Modified, Address\* (`url`), Accessed\*, Note                           |

The online tail is Read Through (`host`), Address, Last Modified, Accessed and Note. Kind comes first, and no other field shows until a kind is chosen. A kind change keeps what was typed, but only the chosen kind's fields are sent: the rest go as null.

Hints sit behind `InfoTip`s:

- Authors: "As printed, the first inverted: Grimm, Jacob."
- Contributors: "A sentence: Translated by Angela Hall."
- Published: "As precise as the source: 1985, November 1950."
- Title, container and note: "_Underscores_ italicise a title inside it."

The two days are `<input type="date">`, which sends `YYYY-MM-DD`.

## Implementation

### 1. Combobox — `src/components/Combobox/{index.tsx,types.ts}`

- A new prop, `create?: string`: an always-present first row reading that label, in place of the typed row. Picking it calls `onPick('', null)`. `arrange` builds it, so it counts as a row and the list opens on ArrowDown or the chevron with a blank box.
- Docs: `claude-docs/components/combobox.md` (Behaviour, the props contract), plus a story.

### 2. Generic fields — `src/components/IngredientForm/fields.tsx`, `types.ts`

- `useField`, `FieldShell`, `TextField` and `SelectField` become generic over the providing form's values (`FieldPath<V>`), so the panel reuses them, and `FieldError`, under its own `FormProvider`.
- `TextField` gains `type` (`'text' | 'date' | 'url'`).
- The ingredient form's call sites are unchanged.

### 3. Values — `values.ts`, `types.ts`

- `references: ReferenceListEntry[]` (`{ value: citation, link: { id, isGlobal }, locator }`).
- Add `drafts.references` and `EMPTY_VALUES` entries, and a `referencePanelOpen: boolean` the resolver reads.
- `toInput` sends `references: [{ referenceId: link.id, locator }]` and no citation text.
- `fieldNameOf` maps `['references', i]` to `references.i.value` and `['references', i, 'locator']` to `references.i.locator`.
- The resolver moves an entry's issue onto `value`, as it does for the lists, and adds the two save-stopping refusals above.

### 4. The field — new `src/components/IngredientForm/references.tsx`

- A `ReferencesField`: a fieldset, "References", with an info tip. It holds:
  - A Combobox: the box "Reference", `create="Add a reference"`, no `entries`, `onRemoveLast` taking the last row.
  - The New Reference button.
  - A `<ul>` of rows. Each row has the citation, the tier line, a labelled "Locator" input described by its citation, and an × named "Remove <citation>".
  - One `FieldError` and a "References changes" `<output>`, as `ListField`'s.
- Its lookup is a `ReferenceSuggestions` document through `useLookup`, from `suggestions.tsx` and exported for it. It is debounced, and asks nothing until the box is focused. The rows are the citation with the tier as a note, kept in rank order with no buckets.
- **The panel** (`ReferencePanel`, same file or `reference-panel.tsx`) runs its own `useForm` with `zodResolver(ReferenceInput, …, { raw: true })`:
  - Kind is a `SelectField` over `REFERENCE_KINDS`; the field table is data, keyed by kind.
  - Enter in a panel input calls `preventDefault` and saves the panel.
  - Save sends `createReference(workspaceId, input)`.
    - A `VALIDATION` error's `fieldErrors` go through `setError` beside their fields.
    - Any other error goes to a notice in the panel.
    - On success: append the entry, announce "Added <citation>", close the panel, focus the search box, and invalidate the cached `ReferenceSuggestions`.
  - Cancel closes the panel and returns focus to the box. Opening it focuses Kind.
- Placed last in `index.tsx`, after Safety Notes and before the actions.
- Run `npm run codegen` for the two new documents.

### 5. Story — `src/components/IngredientForm/index.stories.tsx`

- The fetch stand-in answers `ReferenceSuggestions` from invented sources (no real titles, per M1.25), in both tiers.
- It answers `CreateReference` after the save delay, refusing a title holding "taken" as a `VALIDATION` error on `title`.
- "What to try" gains lines for picking, a locator, the panel per kind, and the refusals.

### 6. Tests (TDD, written first) — new `tests/components/IngredientForm/references.test.tsx`, plus a Combobox case

- **Lookup:** asks only once the box is used and the typing settles, with the coven's id. Each row shows its citation and tier. A listed source is not offered.
- **List:** a pick, by click and by keyboard, adds a row reading the citation and is announced. The × and Backspace in the empty box remove a row, with the focus kept on the box.
- **Sending:** a locator typed is sent with the id. The input carries only ids and locators, and parses with `LocalIngredientInput`. A server error pathed to `['references', 1]` lands on that row.
- **Panel:**
  - It opens from the button and from the "Add a reference" row, focusing Kind.
  - Per kind (table-driven over all five), only that kind's fields show, the required ones marked by `aria-required` and the asterisk.
  - A resolver error lands inline (a chapter with no book, a web page with no address).
  - A server field error lands beside `title`, through the same `FieldError` element.
  - Save adds the new reference to the list by id and closes the panel, with the focus back on the box.
  - Enter in a panel input saves the reference and sends no `CreateWorkspaceIngredient`.
  - Cancel closes the panel and returns the focus.
- **Save stoppers:** search text left in the box, and an open panel.
- **Combobox:** the create row is first even when blank, and picking it calls `onPick` with no option.

### 7. Docs and tracking

- `claude-docs/components/ingredient-form.md`: the fields list, "The lookups", "What it sends", the `fieldNameOf` table, Stories and Testing.
- `claude-docs/tasks/mb.md`: MB.154's chip text becomes rows. Then `task-board.mjs sync MB.154` and `estimate MB.154 5`.
- Copy this plan to `claude-docs/design-decisions/mb.154-plan.md`.

## Verification

- `npm run test:coverage` (the `dom` project carries the new tests), and `npm run pre-commit`.
- `npm run build`: a client component and new documents.
- **In the browser:**
  - Run `npm run workshop` (Ladle) and drive the `IngredientForm` story at 375px and in both themes: pick, locator, panel per kind, refusals, keyboard only.
  - Run axe through `next-devtools` `browser_eval` against the story if the browser tool is available. If it isn't, scan by hand as M5.9 did, and say which.
  - Playwright's axe scan arrives with M5.5's page, as the doc already says.

## Widened in the build (owner's calls, after approval)

- **One control height.** Fields, select and suggesting boxes and buttons all stand at `$control-height`, 44.5px (`_variables.scss`; `claude-docs/styling.md`). The chips' extra room moved from the control onto the chip list, so a box holding one row of chips keeps the height.
- **The list's ◆ marker** is cancelled on the reference rows, as on every other list.
- **New Reference or "Add a reference" while the panel is open** scrolls it back into view and focuses Kind, keeping what was typed.
- **A Locator tip**, and **one row per source**: several places go in its one locator, "pp. 12–19, 40; chap. 3". Repeating a pick was offered and declined, since it would drop the five one-link-per-source indexes and rework the link diff.
- **Formatting and checks in the shared schema** (`validation/reference-format.ts`), applied by the form as each field is left: tidied spacing, a title's wrapping quotes dropped, ranges en-dashed, `https://` added, editions as "2nd ed."; a date with no year, non-numeric pages or article volume/issue, an address with a space or no dotted host, and a day after tomorrow (UTC) or modified after accessed refused. Locator shorthand ("112" → "p. 112") was offered and not chosen. All 278 seeded sources pass unchanged. Folded into MB.154 rather than a task of its own, and the estimate went to 8h.
- **Save Reference shows the save's spinner** while in flight, as Save Ingredient does, and Cancel waits with it. A day after tomorrow reads "That day is in the future".
- **Suggestion lists span the field and stay on the screen**: `@floating-ui/react-dom` (DESIGN.md §14), anchored to a list field's row, flipping above when there is more room, no taller than the room it has, fixed so M8.16's modal cannot clip it; a long unbroken word in a row breaks rather than scrolling the list. The estimate went to 9h.
