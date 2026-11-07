# CupboardEntryForm

`src/components/CupboardEntryForm/` is the form a coven's member annotates a compendium entry with. The entry page opens it in a modal from the **Annotate** icon (or More, where it is not the main icon) ([`ingredient-entry.md`](ingredient-entry.md), "Cupboard buttons"). It edits the seven overrides of a coven's cupboard entry, saving through `annotateCupboardEntry` (`src/modules/ingredients/graphql/cupboard-entries.ts`). Its props are in `types.ts` (`CupboardEntryFormProps`).

It is a react-hook-form form, so the lists can be the shared ones. Null against an empty list is told apart in `changes.ts` and `form-values.ts` (list entries as `{ value }`), not by the library.

An override is either the coven's own value or nothing, in which case the page shows the compendium's. `null` means "use the compendium's", and an empty list is the coven clearing the field on purpose (`applyCupboardEntry` in `validation/cupboard-merge.ts`).

## Fields

Seven, in this order: Label, Description, Safety Notes, Elements, Celestial Bodies, Zodiac Signs, Colours.

- **Prefill.** A field with an override opens on it. A field without one shows the compendium's value, except Label, which opens blank with the compendium's name as its placeholder (a blank label is the compendium's name).
- **Restore Original.** At the right end of a field's label row (accessible name `Restore Original: <Field>`, as Copy From Ingredient is named), shown only while the field is the coven's own. Its place is the shared `.field__label-action` primitive (`_primitives.scss`, the same as Copy From Ingredient): an auto left margin, one line, and a height under the label's so it never changes the row's height. `index.scss` gives a list's legend its full width so the margin has room to act. It hands the field back: the field shows the compendium's value again and the save sends `null`.
- **Tips.** A field keeps an info tip only for a rule its label does not say ([`info-tip.md`](info-tip.md), "When a field gets a tip"). Label's says it stands in for the compendium's name and is unique in the coven. The four lists share one wording, `listHint`: the list is the coven's own in place of the compendium's, and an empty one says the entry has none. Colours adds "in a working, not the colour it is". Description and Safety Notes have none.
- **Lists.** The same field components the own-entry form uses (`IngredientForm/fields.tsx`, `suggestions.tsx`): Elements the multi-select, Celestial Bodies and Zodiac Signs the lookup lists suggesting from their curated vocabularies and the values in use, Colours the plain list, chips inside the control. Free text is allowed beside the suggestions, since a coven is not the compendium. Taking the last entry out and saving sends `[]`, a deliberate clear. Editing a list that showed the compendium's values makes the whole list the coven's own. Text left in a list's box at Save is added as an entry.
- **Undo and redo.** `useFormHistory` with `FormHistoryButtons`, as the own-entry form carries them (`field.md`, "Undo and redo"). "Restore Original" is a value change like any other, so it undoes. A handed-back field is derived from the values (it stays handed back only while it holds the compendium's), so an undo restores the right state.

## Contracts

- **Only changes are sent.** `changesOf` (`changes.ts`, pure) compares each field with what the form opened on, so saving one field never pins the others to today's compendium text.
  - A field the coven did not override is sent once its value differs from the compendium's.
  - A field the coven did override is sent once its value differs from the coven's own.
  - A field handed back to the compendium sends `null`.
  - A text field that was cleared sends `null`, because the server reads a blank as no value.
  - A list that was emptied is sent as `[]`, not `null`: the coven cleared it on purpose, and an empty list is a value.
- **The form autosaves** (`useAutosave`, [`autosave.md`](../autosave.md)): 3 s after the last change, at most every 30 s while typing. Each save sends `expectedRevision`, the revision the last save returned. A stale one is refused (`STALE_WRITE`), and `SaveStatus` offers Keep Mine and Reload. Save is disabled until something changes and shows a spinner while saving.
- **There is no Cancel button.** Close, Escape and a click outside save what is unsaved and then close (`useSaveOnClose`), with no discard question. A refused save keeps the form open. The "Did you mean" rule does not apply, since the form has no name field.
- **A `VALIDATION` error lands on its field** by the issue's path, a leading `input` stripped. Label is the one the server refuses (another entry of the coven has it). Anything else shows in a `role="alert"` notice above the actions.
- **`aside`, optional, is a render prop for the far end of the actions row** (`FormActions`' `aside`). It is handed the form's `onRefused`, so what it draws can show a refusal in the form's own alert; `dirty`, whether the form holds changes not yet saved; and `discardAsking`, which is always false now that Close saves. The Annotate dialog draws its More menu there, or its lone button: Make It Ours reads `dirty` to warn that unsaved changes are lost.
- **After each save** the form calls `router.refresh()` so the page shows the marks and merged values, and merges what it sent into the overrides it holds. `onDone` runs on Save and Close, not after an autosave.

## Not here

Stories: `src/components/CupboardEntryForm/index.stories.tsx` (`States`, a control choosing Default or Annotated; the workshop has no API, so a save answers with the generic error). Tests: `tests/components/CupboardEntryForm/` and `tests/e2e/cupboard-screens.spec.ts`.
