# CupboardEntryForm

`src/components/CupboardEntryForm/` is the form a coven's member annotates a compendium entry with (M12.17). The entry page opens it from **Annotate This Entry** ([`ingredient-entry.md`](ingredient-entry.md), "Cupboard buttons"), in a modal. It is a react-hook-form form, so the lists can be the shared ones; null against an empty list is told apart in `changes.ts` and `form-values.ts` (list entries as `{ value }`), not by the library. It edits the seven overrides of a coven's cupboard entry, saving through `annotateCupboardEntry` (`src/modules/ingredients/graphql/cupboard-entries.ts`).

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
- **Use the Compendium's.** Beside a field's label, shown only while the field is the coven's own. It hands the field back: the field shows the compendium's value again and the save sends `null`.
- **Lists.** The same field components the own-entry form uses (`IngredientForm/fields.tsx`, `suggestions.tsx`): Elements the multi-select, Celestial Bodies and Zodiac Signs the lookup lists suggesting from their curated vocabularies and the values in use, Colours the plain list, chips inside the control. Free text is allowed beside the suggestions, since a coven is not the compendium. Taking the last entry out and saving sends `[]`, a deliberate clear. Editing a list that showed the compendium's values makes the whole list the coven's own. Text left in a list's box at Save is added as an entry.
- **Undo and redo.** `useFormHistory` with `FormHistoryButtons`, as the own-entry form carries them (M12.9; `field.md`, "Undo and redo"). "Use the Compendium's" is a value change like any other, so it undoes; a handed-back field is derived from the values (it stays handed back only while it holds the compendium's), so an undo restores the right state.
- **Only changes are sent.** `changesOf` (`changes.ts`, pure) compares each field with what the form opened on. Blank text sends `null`, as the server reads it. An unchanged field is left out, so saving one field never pins the others to today's compendium text.

## Contracts

- Save is disabled until something changes, shows a spinner while saving, and Cancel is quiet; leaving a changed form asks first (`useDiscardGuard`).
- A `VALIDATION` error lands on its field by the issue's path, a leading `input` stripped; Label is the one the server refuses (another entry of the coven has it). Anything else shows in a `role="alert"` notice above the actions.
- On success the form calls `router.refresh()` so the page shows the marks and merged values, then `onDone`.

## Stories

`Unannotated` and `Annotated`. The workshop has no API, so a save answers with the generic error.

## Testing

`tests/components/CupboardEntryForm/index.test.tsx`: Save stays disabled until a change; only the changed field is sent; Use the Compendium's sends `null`; an emptied list sends `[]`; adding to an inherited list sends the whole list; Undo brings back a removed entry; a Label refusal lands on the Label field and the form stays open. The end-to-end flow is `tests/e2e/cupboard-screens.spec.ts`.
