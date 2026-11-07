# IngredientForm: the References field

**Status:** decided. Live home: `claude-docs/components/ingredient-form.md`, "The references" and "The new reference panel".

## Decision

- **References are rows beneath the box, not chips inside it.** The control holds only the search box. Each reference is a full-width row: the citation wrapping in full, a "Locator" box, and its ×. It reads as a bibliography. A row reads the plain `citation` with a muted second line for its tier: "Compendium source" or "This coven's source". Italics are a later task's.
- **The sub-form is an inline panel** beneath the field, a "New Reference" fieldset with Save Reference and Cancel. It is not a dialog, because the form itself may sit in a modal and a dialog here would stack two. There is no nested `<form>`.
- **A "New Reference" button replaces Add** beside the box. Typed text is a search, never an entry, so Add has nothing to add.
- **"Add a reference" is always the list's first row**, blank box included. It does not prefill the panel: a search for "grimm" might be an author or a title.
- **Enter with nothing highlighted only closes the list.** It never adds anything and never submits the ingredient.
- **A source already listed is not offered again**, as the element box filters its chosen choices. The schema's "already listed" refusal stays as the server's backstop.
- **Text left in the search box stops the save**: 'Pick a source for "grimm", or clear the box'. **An open, unsaved panel stops it too**: "Save the new reference, or cancel it", on the References field's error element.
- **Kind labels:** Book, Chapter in a Book, Journal Article, Reference-Work Entry, Web Page. Each kind's fields come from what `renderCitation` prints for it (`src/lib/citation.ts`), so the panel offers nothing the citation would drop.

## Why

A citation is long and a chip truncates it. The panel's per-kind fields are most of the work, so it matches the citation renderer exactly.

## Rules out

- Chips inside the control.
- A dialog for the new-reference form.
- Add-from-typed-text.
