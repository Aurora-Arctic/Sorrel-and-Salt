# SafetyNote, ToxicMark, CautionMark and SafetyMark

`src/components/SafetyNote/` — how the project shows that an ingredient needs
care (M8.13a, story 53). Four components share the directory:

- **`SafetyNote`** (the default export) sets an ingredient's safety notes apart
  from its description, so a warning is noticed rather than skimmed past.
- **`ToxicMark`** is the Toxic badge, shown when the ingredient or a form on
  show is flagged toxic. M11.21 added the flags and left the badge to Wave 12.
- **`CautionMark`** is the Caution badge (M8.14), a summary for a reader who has
  not reached the notes yet: the word "Caution", no tip, nothing focusable, shown when the
  ingredient or a form on show has non-blank notes. On its own it is independent of
  Toxic; in a badge row `SafetyMark` keeps only one. It wears the tinted `caution` palette, quieter than Toxic's
  solid fill. The card uses it, and so does the entry page's head (the owner's call,
  2026-10-19), so a note on one form shows before the reader scrolls to that form;
  the page also keeps `SafetyNote` for the notes themselves.
- **`SafetyMark`** is a badge row's one safety badge (the owner's call, 2026-10-20):
  `ToxicMark` when the ingredient or a shown form is flagged, else `CautionMark`, else
  nothing. Toxic says more, so the two never share a row. It takes both marks' props.

This directory owns safety presentation for the whole project. The card (M8.14),
the entry page (M8.19) and the spell builder's toxic-ingredient warning (M10.18)
each use these two as they are, and none of them draws a warning of its own. In a badge row, the card's and the entry page's head, they are drawn through `SafetyMark`: on the card by a second `EntryMarks` in its top-right corner, and on the entry page by `IngredientEntry` itself on the back row, after New or Updated and ending flush with the pencil, its `EntryMarks` row taking `safety={false}` ([`ingredient-entry.md`](ingredient-entry.md), "Structure") ([`entry-marks.md`](entry-marks.md), "The order").

## Props

`SafetyNoteProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `safetyNotes` | The ingredient's own notes, shown first. `null`, empty or blank counts as none                                                                                                                                 |
| `variants`    | The forms the consumer shows (`SafetyVariant[]`): each one's notes follow, by name                                                                                                                             |
| `level`       | The Caution heading's level, 2–6, one below the heading it sits under; 3 if unset                                                                                                                              |
| `compact`     | A small block for a crowded place (the spell builder's open step, 2026-10-28): the Caution heading is body-sized ink and runs on in the line with the notes. The bar and the word still say it. Off unless set |
| `footnote`    | A line after the notes, inside the caution, for a consumer that shows no forms: the details modal names the forms that carry their own (M12.5). With it, the caution shows even with no notes                  |

`CautionMarkProps`: `safetyNotes` (the ingredient's own) and `variants`; notes on
either show the mark, and blank counts as none.

`ToxicMarkProps`:

| Prop       | What it is                                           |
| ---------- | ---------------------------------------------------- |
| `toxic`    | The ingredient's own flag                            |
| `variants` | The forms the consumer shows; any one flagged counts |

`SafetyVariant` is `{ form, formChoice?, safetyNotes?, toxic? }`, where `formChoice` is the curated form picked, as `{ group: { icon } }`. It describes a shape
rather than naming a GraphQL type, so a card's or the entry page's
`IngredientVariant` can be passed in unchanged.

## Contracts

- **Nothing to say, nothing rendered.** `SafetyNote` returns `null` when
  neither the ingredient nor any form it was given has notes that are more than
  whitespace, and it was given no `footnote`. `ToxicMark` returns `null` unless something is flagged. A
  consumer renders them both every time and does no checking of its own.
- **The consumer chooses which forms are shown** (MB.215). A card passes the
  ingredient together with the forms it lists. The entry page uses the note
  once for the ingredient, in its own place, and once under each variant's
  heading with that variant's notes as its own (`safetyNotes={variant.safetyNotes}`),
  since the heading above already names the form.
  A form's notes are listed under its name, after the ingredient's own. The name is capitalised (`capitalise`, as the form pickers label a form) and led by its group's `FormIcon`, so it reads as a form; a typed form, with no `formChoice`, gets the spoon. A form
  with no notes gets no line.
- **A form's toxic flag belongs to that form**, never to its ingredient, so the
  mark checks the ingredient and each form on show separately.
- **A region named by its visible heading.** The note is a `<section>` with
  `aria-labelledby` pointing at its Caution heading. A screen reader announces
  it as a region of its own, under the same word a sighted reader sees.
- **Text, not a control.** Nothing in either component takes focus: no
  tabindex, no link, no button.
- **The meaning never rests on colour.** The note carries its Caution heading,
  and the mark carries the word Toxic.

## Styling

Neither has a colour of its own; both use existing, contrast-checked tokens.
The mark is the solid `.badge badge--safety` primitive
([`styling.md`](../styling.md), "Badge palettes"). The note is ordinary text on
the page, set apart by a bar of the same safety fill, `$safety-bar-width` (the heavy rule, 3px), down its leading edge
(`badge-token('safety', 'fill')`) and a Caution heading in that same fill, so
the bar, the heading and the badge are one red. `$secondary`, the error red,
was tried for the heading first and read lighter than the bar on dark. A note filled solid with the safety red was far too
loud (the owner, 2026-10-17). The bar is decoration, since the heading carries
the meaning. The heading is set at the h4 size at any level, at Cormorant Unicase's 700,
with a hairline `-webkit-text-stroke` in its own colour, `$text-stroke-hairline`,
because 700 still read too light (the owner, 2026-10-17). MB.120 proposed
dropping the stroke and the owner kept it (2026-10-20): it is the design, not a
workaround.

The bar is `$safety-bar-width`, the heavy rule, so the note's rule is one of
the site's rule weights; it was a raw 4px until MB.120 (signed off by the
owner, 2026-10-20). The contrast below does not change, since it rests on the
size and weight.

**The heading must stay large text.** As text, the safety fill measures 4.71:1
on the dark page and 4.28:1 on the dark card (6.02:1 and 6.69:1 on light). That
clears WCAG's 3:1 for large text, which 24px at 700 is, but not the 4.5:1 for
body text. A smaller or lighter heading needs another ink.

The note keeps the line breaks typed into its textarea
(`white-space: pre-line`), and its paragraphs stop at `$measure`. `index.scss`
takes tokens only.

## Stories

[`index.stories.tsx`](../../src/components/SafetyNote/index.stories.tsx),
under `Feedback / Safety Note`:

`States` is a grid:

- Notes Only shows the ingredient's notes alone.
- With Forms adds two forms' notes; a third form has none, so it gets no line.
- Toxic shows the mark.
- Compact is the spell builder's small caution, its heading run on in the line.
- With Footnote adds the details modal's line after the notes; Footnote Only shows the
  caution with no notes, for the footnote alone.
- Caution Mark shows the caution mark for notes.
- Safety Mark, Notes and Safety Mark, Toxic Form show the one mark `SafetyMark` picks: the
  caution for notes alone, the toxic mark once a form is toxic.

## Testing

`tests/components/SafetyNote/index.test.tsx` checks:

- nothing renders for absent, `null`, empty or blank notes;
- the note is a region named by its own heading, at the level it was given;
- forms' notes are listed under their capitalised names and their groups'
  icons (the spoon for a typed form), after the ingredient's own, and a form
  with no notes is left out;
- the note renders when only a form has notes;
- the mark shows for the ingredient's flag or a form's, and renders nothing
  otherwise;
- neither component holds anything focusable.

**Not yet checked in a real browser:** axe. Accessibility is checked in
Playwright (CLAUDE.md, Testing), on the pages that show these components, and
M8.14 and M8.19 add the first of those scans.
