# MB.154 — IngredientForm — References field

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

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
