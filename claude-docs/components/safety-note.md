# SafetyNote, ToxicMark and CautionMark

`src/components/SafetyNote/` — how the project shows that an ingredient needs
care (M8.13a, story 53). Three components share the directory:

- **`SafetyNote`** (the default export) sets an ingredient's safety notes apart
  from its description, so a warning is noticed rather than skimmed past.
- **`ToxicMark`** is the Toxic badge, shown when the ingredient or a form on
  show is flagged toxic. M11.21 added the flags and left the badge to Wave 12.
- **`CautionMark`** is the Caution badge (M8.14), a summary for a reader who has
  not reached the notes yet: the word "Caution", no tip, nothing focusable, shown when the
  ingredient or a form on show has non-blank notes. It is independent of Toxic, so
  both can show. It wears the tinted `caution` palette, quieter than Toxic's
  solid fill. The card uses it, and so does the entry page's head (the owner's call,
  2026-10-19), so a note on one form shows before the reader scrolls to that form;
  the page also keeps `SafetyNote` for the notes themselves.

This directory owns safety presentation for the whole project. The card (M8.14),
the entry page (M8.19) and the spell builder's toxic-ingredient warning (M10.18)
each use these two as they are, and none of them draws a warning of its own.

## Props

`SafetyNoteProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `safetyNotes` | The ingredient's own notes, shown first. `null`, empty or blank counts as none                                                                                                                |
| `variants`    | The forms the consumer shows (`SafetyVariant[]`): each one's notes follow, by name                                                                                                            |
| `level`       | The Caution heading's level, 2–6, one below the heading it sits under; 3 if unset                                                                                                             |
| `footnote`    | A line after the notes, inside the caution, for a consumer that shows no forms: the details modal names the forms that carry their own (M12.5). With it, the caution shows even with no notes |

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
the page, set apart by a 4px bar of the same safety fill down its leading edge
(`badge-token('safety', 'fill')`) and a Caution heading in that same fill, so
the bar, the heading and the badge are one red. `$secondary`, the error red,
was tried for the heading first and read lighter than the bar on dark. A note filled solid with the safety red was far too
loud (the owner, 2026-10-17). The bar is decoration, since the heading carries
the meaning. The heading is set at the h4 size at any level, with a 0.6px
`-webkit-text-stroke` in its own colour: Cormorant Unicase stops at 700, which
still read too light, so the stroke fakes a heavier weight (the owner, 2026-10-17).

**The heading must stay large text.** As text, the safety fill measures 4.71:1
on the dark page and 4.28:1 on the dark card (6.02:1 and 6.69:1 on light). That
clears WCAG's 3:1 for large text, which 24px at 700 is, but not the 4.5:1 for
body text. A smaller or lighter heading needs another ink.

The note keeps the line breaks typed into its textarea
(`white-space: pre-line`), and its paragraphs stop at `$measure`. Anything
beyond the tokens waits for Wave 12's design review.

## Stories

[`index.stories.tsx`](../../src/components/SafetyNote/index.stories.tsx),
under `Surfaces / Safety Note`:

- `Note` shows the ingredient's notes alone.
- `WithForms` adds two forms' notes; a third form has none, so it gets no line.
- `Toxic` shows the mark.
- `PhoneDark` and `PhoneLight` show the mark above the note at 375px, in each
  theme.

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
