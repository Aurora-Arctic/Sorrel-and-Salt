# AccessCards

`src/components/AccessCards/` — the privacy policy's "Who Can See What" section (`/privacy`): who may see each kind of data the site keeps, as one card per kind rather than a table of ten rows by six roles. A card's summary line holds the kind of data and six marks, one per role, so a reader sees at a glance who can see it. Opening the card shows every role's full wording, one line each. A row of short role labels sits over the cards on the same columns as the marks, and stays pinned to the top of the window while the cards scroll beneath it, so a reader far down the list can still tell which mark is which role.

It is server rendered with no script: each card is a native `<details>` element, which the browser opens and closes itself and which a keyboard reaches as a button. The three marks are drawn in CSS and carry hidden text for a screen reader (see "Accessibility").

## Props

`AccessCardsProps` (`types.ts`). A cell’s mark is data set beside its text, never read out of it, so a reworded cell keeps the mark its author gave it until the author changes that too. The privacy page sets each mark by the cell’s opening words: “Yes” is `yes`, “No” is `no`, and “Only” or “Which” is `part`.

## The three marks

Each mark is a different shape, so colour only confirms what the shape says:

| Mark   | Word    | Drawing                                                                                 |
| ------ | ------- | --------------------------------------------------------------------------------------- |
| `yes`  | Yes     | The site's four-point star (the ✦ list marker's shape) in the accent                    |
| `part` | In Part | The same star, its left half filled and its right half an outline, in the warning ochre |
| `no`   | No      | A short dash in the muted ink                                                           |

A key above the cards shows the three beside their words, and a sentence under it names the six roles in column order, since the labels over the columns are a few letters each.

## Accessibility

- Each `<details>` is named by its kind of data alone (`aria-labelledby` on its name), not by the marks on the same line, so a screen reader lists the cards by what they are about.
- On the summary line each mark carries hidden text naming the role and the reading: "Coven Owner: Yes.". In the open card the role is the term (`dt`) and the cell's wording its definition (`dd`), with the mark's word hidden before them.
- The label row over the columns is hidden from assistive technology (`aria-hidden`): its letters repeat what the hidden text already says in full. Each label wears an [`IconTip`](icon-tip.md) with the role's full name, placed below it (above would run under the site's bar while the row is stuck): it shows once the pointer has rested on the label for 300ms, or on a tap (`opensOnPress`), and fades out over 120ms, as every icon tip does. The label is a plain span, not a control, so the hidden row holds nothing focusable and the names are spoken once only, in the cards. A sighted keyboard user reads the full names in the sentence above the cards and in each open card. The marks on a card's line carry no tip: the open card gives the wording.
- The summary takes the shared focus ring, drawn inside its edge so the card's corner does not clip it.
- Under forced colours (Windows high-contrast mode) the marks are drawn in the text colour, as the ✦ list marker is, since the system would otherwise paint their fills away. The In Part star is a mask over a background colour, as the warning triangle is, so its half fill holds there too.

## Styling

`index.scss`. The label row and every summary line share one grid, a name column, six mark columns and the chevron's, with the same side padding, so the labels sit over the marks by construction. The row pins with `position: sticky` at the frame's `--sticky-top` (the bar's height), and keeps a gap (`$stuck-pad`, one `space(4)`) between the bar and the labels the way IngredientSearch's search row does: as padding inside the row, pulled up by a matching negative margin so the unstuck layout is unchanged, and filled by the row's page-ground background so no card shows through the gap. It releases where the list ends; nothing between it and the window clips, which sticky needs. At the width a table turns into cards (`$table-stack-width`) the name takes the whole first line, the marks drop to a second line in the same columns, and the row gives up its "Kind of Data" label, which has no room beside six columns. The open card lists each role on a line of its own: mark, role, wording; on a phone the role sits above the wording. Role and wording are both set at the `small` type size, the wording with prose leading. The chevron at the end of the summary line is the shared `ChevronIcon` under the `disclosure-chevron` mixin, so it turns over as every other disclosure's does.

## Where it is used

The privacy policy only (`src/app/(public)/privacy/page.tsx`), where `ACCESS_ROWS` and `ROLES` hold the text. The working notes behind each cell are in `claude-docs/design-decisions/m15.2-privacy-policy-notes.md`, "Who can see what".
