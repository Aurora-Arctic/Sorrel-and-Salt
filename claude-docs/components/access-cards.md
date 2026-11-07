# AccessCards

`src/components/AccessCards/` — the privacy policy's "Who Can See What" section (`/privacy`): who may see each kind of data the site keeps, as one card per kind rather than a table of ten rows by six roles. A card's summary line holds the kind of data and six marks, one per role; opening the card shows every role's full wording. A row of short role labels sits over the cards on the same columns as the marks and stays pinned under the site's bar while the cards scroll. Server rendered with no script: each card is a native `<details>`.

Used by the privacy policy only (`src/app/(public)/privacy/page.tsx`), where `ACCESS_ROWS` and `ROLES` hold the text. The working notes behind each cell are in `claude-docs/design-decisions/support.md`, "Who can see what".

## Props and marks

`AccessCardsProps` is in `types.ts`. A cell's mark is data set beside its text, never read out of it, so a reworded cell keeps the mark its author gave it until the author changes that too. The privacy page sets each mark by the cell's opening words: "Yes" is `yes`, "No" is `no`, "Only" or "Which" is `part`.

Each mark is a different shape, so colour only confirms what the shape says: `yes` is the site's four-point star in the accent, `part` ("In Part") the same star half filled in the warning ochre, `no` a short dash in the muted ink. A key above the cards shows the three, and a sentence under it names the six roles in column order, since the labels over the columns are a few letters each.

## Accessibility

- Each `<details>` is named by its kind of data alone (`aria-labelledby`), not by the marks on the same line, so a screen reader lists the cards by what they are about.
- On the summary line each mark carries hidden text naming the role and the reading: "Coven Owner: Yes.". In the open card the role is the `dt` and the wording its `dd`.
- The label row is `aria-hidden`: its letters repeat what the hidden text says in full. Each label wears an [`IconTip`](icon-tip.md) with the role's full name, placed below (above would run under the bar while the row is stuck) and opened by a tap (`opensOnPress`). The label is a plain span, not a control, so the hidden row holds nothing focusable. A keyboard user reads the full names in the sentence above the cards and in each open card; the marks on a card's line carry no tip.
- The summary takes the shared focus ring, drawn inside its edge so the card's corner does not clip it.
- Under forced colours the marks are drawn in the text colour, since the system would otherwise paint their fills away. The In Part star is a mask over a background colour, as the warning triangle is, so its half fill holds there too.

## Styling

The label row and every summary line share one grid (a name column, six mark columns and the chevron's) with the same side padding, so the labels sit over the marks by construction. The row is `position: sticky` at the frame's `--sticky-top`, with its gap (`$stuck-pad`) to the bar as padding inside the row, pulled up by a matching negative margin so the unstuck layout is unchanged, as IngredientSearch's search row does. Nothing between the row and the window may clip, which sticky needs. At `$table-stack-width` the name takes the whole first line, the marks drop to a second line in the same columns, and the row gives up its "Kind of Data" label, which has no room beside six columns. The chevron is the shared `ChevronIcon` under the `disclosure-chevron` mixin.
