# CupboardEntryForm

`src/components/CupboardEntryForm/` is the form a coven's member annotates a compendium entry with (M12.17). The entry page opens it from the **Annotate** icon (or More, where it is not the main icon) ([`ingredient-entry.md`](ingredient-entry.md), "Cupboard buttons"), in a modal. It is a react-hook-form form, so the lists can be the shared ones; null against an empty list is told apart in `changes.ts` and `form-values.ts` (list entries as `{ value }`), not by the library. It edits the seven overrides of a coven's cupboard entry, saving through `annotateCupboardEntry` (`src/modules/ingredients/graphql/cupboard-entries.ts`).

An override is either the coven's own value or nothing, in which case the page shows the compendium's. The form keeps that difference: `null` means "use the compendium's", and an empty list is the coven clearing the field on purpose (M12.16; `applyCupboardEntry` in `validation/cupboard-merge.ts`).

## Props

`CupboardEntryFormProps` (`types.ts`):

| Prop           | What it is                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `workspaceId`  | The coven's workspace id                                                                                   |
| `ingredientId` | The compendium entry annotated                                                                             |
| `compendium`   | `CompendiumValues`: the entry's own name, description, safety notes, elements, bodies, signs and colours   |
| `overrides`    | `CupboardOverrides`: the coven's seven values, each `null` where it has none                               |
| `onDone`       | Called after a save, and on Cancel (after Discard Changes if anything changed); the owner closes the modal |

## Fields

Seven, in this order: Label, Description, Safety Notes, Elements, Celestial Bodies, Zodiac Signs, Colours.

- **Prefill.** A field with an override opens on it. A field without one shows the compendium's value, except Label, which opens blank with the compendium's name as its placeholder (a blank label is the compendium's name).
- **Restore Original.** At the right end of a field's label row (an accessible name `Restore Original: <Field>`, as Copy From Ingredient is named), shown only while the field is the coven's own. Its place is the shared `.field__label-action` primitive (`_primitives.scss`, the same as Copy From Ingredient): an auto left margin, one line, and a height under the label's so it never changes the row's height (the owner's call, 2026-10-19). `index.scss` gives a list's legend its full width so the margin has room to act. It hands the field back: the field shows the compendium's value again and the save sends `null`.
- **Tips.** A field keeps an info tip only for a rule its label does not say (the owner's call, 2026-10-20; [`info-tip.md`](info-tip.md), "When a field gets a tip"). Label's says it stands in for the compendium's name and is unique in the coven. The four lists share one wording, `listHint`: the list is the coven's own in place of the compendium's, and an empty one says the entry has none; Colours adds "in a working, not the colour it is". Description and Safety Notes have none.
- **Lists.** The same field components the own-entry form uses (`IngredientForm/fields.tsx`, `suggestions.tsx`): Elements the multi-select, Celestial Bodies and Zodiac Signs the lookup lists suggesting from their curated vocabularies and the values in use, Colours the plain list, chips inside the control. Free text is allowed beside the suggestions, since a coven is not the compendium. Taking the last entry out and saving sends `[]`, a deliberate clear. Editing a list that showed the compendium's values makes the whole list the coven's own. Text left in a list's box at Save is added as an entry.
- **Undo and redo.** `useFormHistory` with `FormHistoryButtons`, as the own-entry form carries them (M12.9; `field.md`, "Undo and redo"). "Restore Original" is a value change like any other, so it undoes; a handed-back field is derived from the values (it stays handed back only while it holds the compendium's), so an undo restores the right state.
- **Only changes are sent.** `changesOf` (`changes.ts`, pure) compares each field with what the form opened on. Blank text sends `null`, as the server reads it. An unchanged field is left out, so saving one field never pins the others to today's compendium text.

## Contracts

- Save is disabled until something changes, shows a spinner while saving, and Cancel is quiet; leaving a changed form asks first (`useDiscardGuard`).
- A `VALIDATION` error lands on its field by the issue's path, a leading `input` stripped; Label is the one the server refuses (another entry of the coven has it). Anything else shows in a `role="alert"` notice above the actions.
- `aside`, optional, is a render prop for the far end of the actions row (`FormActions`' `aside`), handed the form's `onRefused`, so what it draws can show a refusal in the form's own alert, `dirty`, whether the form holds unsaved changes, and `discardAsking`, whether the unsaved-changes confirmation is asking. The Annotate dialog draws its More menu there, or its lone button (M8.17): Make It Ours reads `dirty` to warn that unsaved changes are lost, and both confirmations step aside while `discardAsking`, since they are drawn in the same card.
- On success the form calls `router.refresh()` so the page shows the marks and merged values, then `onDone`.

## Stories

One story, `States`, with a control that chooses Default or Annotated. The workshop has no API, so a save answers with the generic error.

## Testing

`tests/components/CupboardEntryForm/index.test.tsx`: Save stays disabled until a change; only the changed field is sent; Restore Original sends `null`; an emptied list sends `[]`; adding to an inherited list sends the whole list; Undo brings back a removed entry; a Label refusal lands on the Label field and the form stays open; Label and the four lists carry a tip, and Description and Safety Notes none. The end-to-end flow is `tests/e2e/cupboard-screens.spec.ts`.

## Notes from code comments: the changed fields

The fields that changed. A field handed back sends null when the coven held an override; a text field cleared sends null, as the server reads blank; a field the coven did not override sends its value only once it differs from the compendium's; one it did sends its value once it differs from its own. An emptied list is sent as `[]`: the coven cleared it on purpose.
