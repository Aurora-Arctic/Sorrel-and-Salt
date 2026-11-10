# SafetyNote, ToxicMark, CautionMark and SafetyMark

`src/components/SafetyNote/` — how the project shows that an ingredient needs care. Props are in `types.ts`.

- **`SafetyNote`** (the default export) sets an ingredient's safety notes apart from its description, so a warning is noticed rather than skimmed past.
- **`ToxicMark`** is the Toxic badge, shown when the ingredient or a form on show is flagged toxic.
- **`CautionMark`** is the Caution badge, a summary for a reader who has not reached the notes yet: the word "Caution", no tip, nothing focusable, shown when the ingredient or a form on show has non-blank notes. It is independent of Toxic and wears the quieter tinted `caution` palette. The card and the entry page's head use it, so a note on one form shows before the reader scrolls to that form.
- **`SafetyMark`** is a badge row's one safety badge: `ToxicMark` when the ingredient or a shown form is flagged, else `CautionMark`, else nothing. Toxic says more, so the two never share a row. It takes both marks' props.

This directory owns safety presentation for the whole project; the card, the entry page and the spell builder's toxic-ingredient warning use these as they are, and none draws a warning of its own. In a badge row they are drawn through `SafetyMark`: on the card by a second `EntryMarks` in its top-right corner, and on the entry page by `IngredientEntry` itself on the back row, its `EntryMarks` row taking `safety={false}` ([`ingredient-entry.md`](ingredient-entry.md), "Structure"; [`entry-marks.md`](entry-marks.md), "The order"). The line under each note saying the notes are incomplete and linking `/disclaimer` is [`DisclaimerNotice`](document-page.md#disclaimer-notice)'s, drawn by the entry page beside each `SafetyNote`.

## Contracts

- **Nothing to say, nothing rendered.** `SafetyNote` returns `null` when neither the ingredient nor any form it was given has notes that are more than whitespace, and it was given no `footnote`. `ToxicMark` returns `null` unless something is flagged. A consumer renders them every time and does no checking of its own.
- **The consumer chooses which forms are shown.** A card passes the ingredient together with the forms it lists. The entry page uses the note once for the ingredient and once under each variant's heading with that variant's notes as its own (`safetyNotes={variant.safetyNotes}`), since the heading already names the form.
- **A form's notes are listed under its name, after the ingredient's own**, the name capitalised (`capitalise`) and led by its group's `FormIcon`; a typed form, with no `formChoice`, gets the spoon. A form with no notes gets no line. `SafetyVariant` is a shape rather than a GraphQL type, so a card's or the entry page's `IngredientVariant` can be passed in unchanged.
- **A form's toxic flag belongs to that form**, never to its ingredient, so the mark checks the ingredient and each form on show separately.
- **`compact`** is a small block for a crowded place (the spell builder's open step): the Caution heading is body-sized ink and runs on in the line with the notes.
- **`footnote`** is a line after the notes, inside the caution, for a consumer that shows no forms (the details modal names the forms that carry their own). With it, the caution shows even with no notes.
- **`level`** is the Caution heading's level, 2 to 6, one below the heading it sits under; 3 if unset.
- **A region named by its visible heading**: a `<section>` with `aria-labelledby` pointing at its Caution heading.
- **Text, not a control.** Nothing takes focus. The meaning never rests on colour: the note carries its Caution heading, and the mark the word Toxic.

### Styling

Neither has a colour of its own; both use existing, contrast-checked tokens.

- **The mark is the solid `.badge badge--safety` primitive** (`claude-docs/styling.md`, "Badge palettes").
- **The note is ordinary text set apart by a bar** of the safety fill down its leading edge, with a Caution heading in the same fill, so bar, heading and badge are one red. `$secondary`, the error red, reads lighter than the bar on dark. A note filled solid with the safety red is far too loud. The bar is decoration, since the heading carries the meaning.
- **The heading is set at the h4 size at any level**, at Cormorant Unicase's 700 with a hairline `-webkit-text-stroke` (`$text-stroke-hairline`), because 700 alone reads too light. The stroke is the design, not a workaround.
- **The heading must stay large text.** The safety fill measures 4.71:1 on the dark page and 4.28:1 on the dark card (6.02:1 and 6.69:1 on light). That clears WCAG's 3:1 for large text, which 24px at 700 is, but not the 4.5:1 for body text. A smaller or lighter heading needs another ink.
- **The note keeps the line breaks typed into its textarea** (`white-space: pre-line`).

## Not here

Stories: `index.stories.tsx` (`Feedback / Safety Note`). Tests: `tests/components/SafetyNote/index.test.tsx`.
