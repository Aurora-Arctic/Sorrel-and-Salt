# AccessCards

`src/components/AccessCards/` — the privacy policy's "Who Can See What" section (`/privacy`): who may see each kind of data the site keeps, as one card per kind rather than a table of ten rows by six roles. A card's summary line holds the kind of data and six marks, one per role, so a reader sees at a glance who can see it. Opening the card shows every role's full wording, one line each. A row of short role labels sits over the cards on the same columns as the marks, and stays pinned to the top of the window while the cards scroll beneath it, so a reader far down the list can still tell which mark is which role.

It is server rendered with no script: each card is a native `<details>` element, which the browser opens and closes itself and which a keyboard reaches as a button. The three marks are drawn in CSS and carry hidden text for a screen reader (see "Accessibility").

## Props

`AccessCardsProps` (`types.ts`):

| Prop    | What it is                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `roles` | The roles in column order, each an `AccessRole`: its full `name`, read in the open card, and the `short` label over its column |
| `rows`  | One `AccessRow` per kind of data: the `data` it is about and one `AccessCell` per role, in the roles' order                    |

An `AccessCell` is the cell's full `text` and its `mark`, one of `yes`, `part` or `no`. The mark is data set beside the text, never read out of it, so a reworded cell keeps the mark its author gave it until the author changes that too. The privacy page sets each mark by the cell's opening words: a cell that starts "Yes" is `yes`, one that starts "No" is `no`, and one that starts "Only" or "Which" is `part`.

## The three marks

Each mark is a different shape, so colour only confirms what the shape says:

| Mark   | Word    | Drawing                                                              |
| ------ | ------- | -------------------------------------------------------------------- |
| `yes`  | Yes     | The site's four-point star (the ✦ list marker's shape) in the accent |
| `part` | In Part | A ring half filled, in the warning ochre                             |
| `no`   | No      | A short dash in the muted ink                                        |

A key above the cards shows the three beside their words, and a sentence under it names the six roles in column order, since the labels over the columns are a few letters each.

## Accessibility

- Each `<details>` is named by its kind of data alone (`aria-labelledby` on its name), not by the marks on the same line, so a screen reader lists the cards by what they are about.
- On the summary line each mark carries hidden text naming the role and the reading: "Coven Owner: Yes.". In the open card the role is the term (`dt`) and the cell's wording its definition (`dd`), with the mark's word hidden before them.
- The label row over the columns is hidden from assistive technology (`aria-hidden`): its letters repeat what the hidden text already says in full. Each label is an `<abbr>` whose `title` is the role's full name.
- The summary takes the shared focus ring, drawn inside its edge so the card's corner does not clip it.
- Under forced colours (Windows high-contrast mode) the marks are drawn in the text colour, as the ✦ list marker is, since the system would otherwise paint their fills away.

## Styling

`index.scss`. The label row and every summary line share one grid, a name column, six mark columns and the chevron's, with the same side padding, so the labels sit over the marks by construction. The row pins with `position: sticky` under the top inset, in the page's ground so a card does not show through, and releases where the list ends; nothing between it and the window clips, which sticky needs. At the width a table turns into cards (`$table-stack-width`) the name takes the whole first line, the marks drop to a second line in the same columns, and the row gives up its "Kind of Data" label, which has no room beside six columns. The open card lists each role on a line of its own: mark, role, wording; on a phone the role sits above the wording.

## Where it is used

The privacy policy only (`src/app/(public)/privacy/page.tsx`), where `ACCESS_ROWS` and `ROLES` hold the text. The working notes behind each cell are in `claude-docs/design-decisions/m15.2-privacy-policy-notes.md`, "Who can see what".
