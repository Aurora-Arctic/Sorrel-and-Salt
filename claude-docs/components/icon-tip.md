# IconTip

`src/components/IconTip/` — a short word shown beside an icon control, such as
"Edit" beside a pencil, for a sighted reader who cannot tell what the mark
does. The owner's call in MB.115: "Change all Edit buttons to the edit icon
with a "Edit" tooltip. Make it larger outside the form though." The directory
also holds what every Edit control shares: the pencil, and the list rows'
Edit link.

| File            | What it holds                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `icon-tip.tsx`  | `IconTip`, the default export: a wrapper that gives the one control in it a tip                                                                                                                                                                                                                                                                        |
| `edit-link.tsx` | `EditLink`, a list row's Edit: the larger pencil, as a link, wearing the tip; `AnnotateLink`; and `QuickLookLink`, an entry's Quick Look eye                                                                                                                                                                                                           |
| `icons.tsx`     | `PencilIcon`, the pencil every Edit control draws, the ingredient form's as well, `PlusIcon`, the shared Add's plus, `CheckIcon`, a tick for a compendium card's In My Ingredients (M9.12), `LinkIcon`, `UndoIcon` and `RedoIcon` (the history buttons' and Restore Original), and `CopyIcon` (Copy From Ingredient), and `MysticEyeIcon` (Quick Look) |

## The props contract

`IconTip`:

| Prop        | Meaning                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| `tip`       | The word or two shown: "Edit", "Edit Source". Shown only, never read (see "Accessibility").  |
| `children`  | The one icon control, a `<button>` or a link, which keeps its own name, role and attributes. |
| `placement` | `'side'` (the default), `'below'` or `'above'`: where the tip stands (see "Placement").      |

`EditLink`:

| Prop      | Meaning                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `href`    | Where the edit opens, a typed `Route`: a list's address with its modal open (a soft navigation, `next/link`).                            |
| `name`    | What it edits. The link is named "Edit" and this, "Edit Aluminium, Aluminium", in `visually-hidden` text.                                |
| `heading` | The head of the modal the link opens, a `ModalHeading` (M9.18). The page builds it on the server with the builder the loaded modal uses. |

`EditLink` is a client component since M9.18. A plain press of it opens the
modal at once under `heading`, over a skeleton, and the form arrives in the
same dialog ([`modal.md`](modal.md), "Opening at once"). It is still a link:
a press with a modifier key, a new tab, or one before the script has loaded
follows `href` as before.

`QuickLookLink` takes `EditLink`'s props and a `place`, the modal place its press shows in ([`modal.md`](modal.md), "Two places on one page"). It is named "Quick Look" and the entry, and opens the entry's details modal over its list (M12.5, [`ingredient-entry.md`](ingredient-entry.md), "The details modal").

## Where it is used

- **`LinkIcon` inside a link** is drawn through `LinkIconHint`
  ([`link-hint.md`](link-hint.md)), so the chain turns into the loading ring
  while the link is pending; the bare `LinkIcon` is the glyph alone.

- **The admin lists' Edit**: `GroupList`, `GroupedValueList` (every value
  page: categories, forms, deities, celestial bodies, zodiac signs) and
  `CompendiumList`, each through `EditLink`.
- **Annotate on a coven's list** (`CovenCards`), through `AnnotateLink`:
  `AnnotateIcon`, an open book with a filled pencil,
  drawn at stroke width 1.25 rather than the set's 1.5, the owner's call
  (M8.17, 2026-10-19).
- **Add and held on a compendium card** (`CompendiumCards`' `AddIcon` and `HeldLink`, M9.12): `PlusIcon` on a button tipped "Add to My Ingredients", and `CheckIcon` on a link tipped "In My Ingredients", both `.icon-tip__add`/`.icon-tip__held` (Edit's size and green), at the card's bottom right, ahead of a curator's pencil. The button shows the shared spinner in the plus's place while it works.
- **More on a coven's list** (`CovenCards`' `CardMore`): `DotsIcon`, three
  vertical dots, inside a `MenuButton` with `.icon-tip__edit`, tipped
  "More", where the card holds two or more choices; and, where its one
  choice is Delete or Remove, `BinIcon` on a button of its own,
  `.icon-tip__remove`, tipped with its verb (M8.17; the owner's call,
  2026-10-20).
- **Quick Look on the lists of entries** (M12.5), through `QuickLookLink`: left of each name on the admin Compendium list, and at each card's bottom left on a coven's Ingredients and the public compendium. `MysticEyeIcon` is an almond eye whose iris is a waxing crescent with a small four-point star, its outline drawn at stroke width 1 rather than the set's 1.5 (the owner's pick, 2026-10-20). It wears `.icon-tip__look`: Edit's large box, 2rem, and accent ink, with the eye drawn a third bigger than the pencil, `$glyph-size-large` * 4 / 3, about 1.667rem (the owner's call, 2026-10-20). The box stays, so a card foot's height and the eye's line with the pencil do not move; the eye leaves about 3px clear of the box on each side.
- **The ingredient form's three Edit buttons**, each wrapped in `IconTip`
  around its existing button: a variant's pencil and a reference row's
  pencil ("Edit"), and an open reference row's Edit Source ("Edit Source"),
  which draws a page with a pencil (`SourceEditIcon`, in the form's own
  `icons.tsx`) so that it does not look like the row's pencil beside it
  ([`ingredient-form.md`](ingredient-form.md), "Editing a source").
- **Each segment of a radio strip** (`RadioGroupField`'s `layout="strip"`,
  M12.7), named by its option's label, above it: the form group's Icon picker
  draws icons alone, and the owner asked for each one's name on hover
  (2026-10-16). The segment is a `label` round a hidden native radio, which
  keeps its own name, so the tip stays decoration here too
  ([`field.md`](field.md)).

## Behaviour

It follows WCAG 1.4.13, content on hover or focus, through the same
[`useTip`](info-tip.md) hook as InfoTip:

- **It opens on hover and on the control's focus.** Both are heard on the
  wrapper, which holds the tip as well as the control; focus bubbles up to
  it from the control.
- **It stays while the pointer is over it.** Leaving both closes it after
  150ms, long enough to cross the small gap onto the tip.
- **It closes on Escape, blur, or the pointer leaving both.** Escape is
  heard on the document and marked handled while a tip is open, so it
  closes the tip alone: inside a modal, as the ingredient form is, the
  first Escape shuts the tip and the next one reaches the modal.
- **It is in the page while open and for its fade after**, so an open tip is
  one that exists. It fades in from a starting style and, closed, fades back
  out over `$tip-fade` (a closing class, and a timer of the same length that
  then takes it out of the page) rather than vanishing (the owner's call at
  MB.7's review, 2026-10-12).

## Accessibility

The tip is decoration. Each control's own name already says Edit and what:
"Edit Testcraft", "Edit Oil", "Edit Source Fixture, Testwort Herbal". So the
tip carries `role="tooltip"` and `aria-hidden="true"`, and no control lists
it in `aria-describedby`: as a description it would read "Edit" a second
time. A link stays a link and a button a button, with the names they had as
words, so the tests and the e2e specs find them as before.

- **The account menu's invitation count** (M10.32), a red circle at the right
  end of the Your Account row, wearing "You have N Coven Invitations" with
  `placement="below"` ([`account-menu.md`](account-menu.md)).
- **The admin pages' shared Add** (`add-action.tsx`): the tip is its label,
  "Add Category", and draws only at the page header's narrow width, where the
  label is hidden and the link is a plus alone, and, on a tabbed page, at or under
  680px of the header's own width; never at or under 350px (`$add-below-width`), where the Add is labelled again
  ([`page-header.md`](page-header.md), "Styling").

## Placement

**To the left of the control, level with it** (`right: 100%`, centred
vertically), one layer up (`z-index: 1`). Every Edit stands at the end of its
line: a list row's last column, a phone card's top right, a form row's
actions, so the room to its left is the line's own. Not above, as InfoTip's
tip is: a `.data-table-frame` scrolls sideways, and a box that scrolls one way
clips both ways, so a tip above the first row or card was cut off. The tip
covers the text beside the control while it is open.

**In a table row, centred above the control** (`.data-table .icon-tip__bubble`),
the owner's call at MB.115's review, so it covers nothing of the row's own. Above the first row is the header row,
inside the frame, so nothing is clipped. A phone card (a `.data-table--stack`
table under `$table-stack-width`) keeps the tip to the left: above the first
card's top-right Edit is only the card's padding, and the frame would cut it
off.

**Below the control, its right edge on the control's** (`placement="below"`,
`.icon-tip__bubble--below`), for a mark at the right end of a row with rows
beneath it, such as the account menu's invitation count (M10.32, the owner's
call). A tip to its left would cover the row's own words, and one centred under
it would run past the edge of the menu panel. The panel no longer clips, so the
tip can hang past the panel's edge. It fades in from, and out to, two pixels above
its place. It is the one placement chosen by a prop; the others follow from
where the control sits.

**Centred above the control** (`placement="above"`,
`.icon-tip__bubble--above`), for a control in a row of its kind, a segment
of the radio strip (M12.7): a tip to the side would cover the next segment,
and one below the chosen name printed under the bar. It fades in from, and out
to, two pixels below its place.

**Over the Add's plus, above it**, placed by `useTip` so it stays inside the window at the line's end, at `layer('floating')`. The action's wrapper carries no `translate` (it is brought down to the heading's letters with `position: relative; top` instead): a `translate` makes the wrapper a stacking context, which would rank the tip's layer only inside it and hold the tip under the shell's bar once the page is scrolled.

## Styling

Tokens and three mixins in `_mixins.scss`, so every Edit matches:

- **`icon-button($target, $glyph, $radius, $cursor)`**: a square box with no
  text and a transparent ground, the mark at `$glyph`, in the muted ink and
  `$text-primary` when pointed at or focused. `$icon-size` around
  `$glyph-size` (1.5rem around 1rem, WCAG 2.2's 24px target) by default; a
  round `$radius` and a help `$cursor` make InfoTip's ⓘ and the crown.
- **`icon-button-remove`**: the × and the bin's answer, the wax and a tint
  of it 20% into the card, as the combobox's chip-remove and the form's
  remove icons wear.
- **`icon-button-edit`**: the pencil's ink, `$accent`, and, pointed at,
  focused or open (`aria-expanded`), a tint of it 20% into the card.
- **Sizes**: the ingredient form keeps the 24px box and 1rem icon beside
  its fields' text; a list row's `EditLink` (`.icon-tip__edit`) takes
  `$icon-size-large` around `$glyph-size-large`, 2rem around 1.25rem,
  and so does a list card's lone bin (`.icon-tip__remove`), in the remove
  answer's colours. The Quick Look eye keeps that box but draws its glyph at 4/3 of the
  pencil's.
- **Contrast**: the accent on the page, on the card (banded rows, stacked
  cards and the modal) and on its own tint each clear 3:1, a control's floor
  (`tests/scss/tokens.test.ts`, "an Edit pencil").
- **The bubble** is the `tip-bubble` mixin's, InfoTip's look.
- **At phone width** a list's Edit cell carries `.data-table__card-action`,
  which stands it at its card's top right ([`../styling.md`](../styling.md),
  "Tables at phone width").

## Stories

[`index.stories.tsx`](../../src/components/IconTip/index.stories.tsx),
`Layout / Icon Tip`, filed by kind rather than place, as the pencil is used in
the admin lists and the ingredient form alike: `InAListRow`, three banded rows
of a list's own table, with the pencil in an unlabelled last column at the
row's end, so it shows on the page and on the card, and the `PhoneDark` /
`PhoneLight` pair, the rows as cards with the pencil at each card's top
right. Hover or focus a pencil to see its tip. The form's pencils are in the
ingredient form's stories, and every list's in its own.

## Testing

`tests/components/IconTip/index.test.tsx` covers hover, the pointer crossing
onto the tip, focus and blur, Escape closing the tip alone (the key marked
handled only while it is open), Escape inside a `Modal` closing the tip first
and the modal second, the tip kept out of the accessibility tree, and
`EditLink`'s role and name. Each list's test finds its Edit links by their
names, and the ingredient form's tests its buttons, so a renamed control
fails there.
