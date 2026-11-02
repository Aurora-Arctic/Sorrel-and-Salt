# DisclaimerNotice

`src/components/DisclaimerNotice/` — the one line under an ingredient's safety notes saying the notes are not complete, with a link to the disclaimer page (`/disclaimer`, read on [`DocumentPage`](document-page.md)). It takes no props and reads nothing.

The line is drawn whether or not there are notes: an ingredient with no safety note is exactly the case the disclaimer covers, so the line cannot depend on [`SafetyNote`](safety-note.md), which draws nothing when there is nothing to say. [`IngredientEntry`](ingredient-entry.md) places it after `SafetyNote` in the Details section and in each form's section, on the compendium page and on a coven's entry page alike; the details modal and the cards, which summarise, do not carry it.

It is a `<p role="note">`, so a screen reader hears it as an aside to the section rather than as part of the notes, and its link is named "Read the Disclaimer". The text is muted and small (`.disclaimer-notice`), a step of air below the notes.

`tests/components/DisclaimerNotice/index.test.tsx` proves the link and its role; `tests/components/IngredientEntry/index.test.tsx` proves the line is in the Details section and in every form's, with notes and without; `tests/e2e/compendium-entry.spec.ts` and `tests/e2e/cupboard-entry.spec.ts` find it on a built page of each route and pass axe with it there.
