# IconTip

`src/components/IconTip/` — a short word shown beside an icon control, such as
"Edit" beside a pencil, for a sighted reader who cannot tell what the mark
does. The owner's call in MB.115: "Change all Edit buttons to the edit icon
with a "Edit" tooltip. Make it larger outside the form though." The directory
also holds what every Edit control shares: the pencil, and the list rows'
Edit link.

| File            | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon-tip.tsx`  | `IconTip`, the default export: a wrapper that gives the one control in it a tip                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `edit-link.tsx` | `EditLink`, a list row's Edit: the larger pencil, as a link, wearing the tip (both it and `AnnotateLink` take an optional `className` in place of the default `icon-tip__edit`); `AnnotateLink`; and `QuickLookLink`, an entry's Quick Look eye                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `icons.tsx`     | `PencilIcon`, the pencil every Edit control draws, the ingredient form's as well, `PlusIcon`, the shared Add's plus, `CheckIcon`, a tick for a compendium card's In Every Cupboard (M9.12) and a yes in the user tables, `CrossIcon`, a cross for a box's clear, a row's remove and a no in the user tables, `ChevronIcon`, the chevron every box, menu button and Show More draws (its user gives it a class, `chevron-icon` by default, and `textSized` sizes it at 1em where no stylesheet does), `LinkIcon`, `UndoIcon` and `RedoIcon` (the history buttons' and Restore Original), and `CopyIcon` (Copy From Ingredient), `MysticEyeIcon` (Quick Look), `CloseIcon` (an X; the Preview pane's Close), `StockIcon`, a jar with a cloth tied over it (Edit Stock), `CauldronIcon`, a cauldron with two leaves, drawn at stroke 1.25 (Record a Working), and `CompleteIcon`, the jar shelf's round flask (read from `SHAPES.flask`) with a tick on its bulb (Complete on a draft working), and `PrintIcon`, a printer (the recipe page's lone Print, for a role whose menu would hold nothing else) |

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
- **The buttons beside them** (`icon-button.tsx`, the owner's calls, 2026-10-20), shared by the coven cards' foot, the entry page's icons and the Quick Look window, so the places cannot differ: `RecordButton` (the cauldron, tipped "Record a Working" and named "Record a Working of" and the spell, as Preview and More carry the spell's name), `BinButton` (the bin, tipped with its verb, "Delete Ingredient" or "Remove"), `AnnotateButton` (Annotate as a button, where a press asks which coven first), `QuickLookButton` (the Quick Look eye as a button, in `.icon-tip__look`; `size="small"` adds `.icon-tip__look--small`, the mark at `$glyph-size` in a `$icon-size` (24px) box, for the spell builder's step rows and inventory lines, 2026-10-29; for the coven's Add Ingredient form, whose held duplicates open their details over the form in the page; [`ingredient-form.md`](ingredient-form.md), "Quick Look in the warning", M12.48) `PreviewButton` (the corner-brackets icon on a spell's recipe page, named "Preview Spell <title>"; owner, 2026-10-30). `PreviewButton` wears `icon-tip__edit--plain`, the text colour, as the page's pencil does; `RecordButton` keeps the accent green. Print is an item of the page's `MoreMenu`, not a button. and `MoreMenu` (the three dots, a [`MenuButton`](menu-button.md) taking items or sections, named "More for <entry>"). `CompendiumEditLink` is the pencil for the compendium's own edit on the entry page, named and tipped "Edit in Compendium". Each is named "<verb> <entry>" in hidden text, with the verb as the tip, and takes the entry's name as the card names it (`cardName`, "Name, Formal").
- **Edit Stock on a coven's card and its Quick Look window** (M9.9), through [`StockDialog`](stock-dialog.md): `StockIcon`, a jar with a cloth tied over its mouth and a wavy hem, not the pencil, which Edit beside it already wears (the owner's pick, 2026-10-20), in `.icon-tip__edit` (the accent green; Edit and Annotate beside it wear `icon-tip__edit--plain`, the text colour, passed to `EditLink` and `AnnotateLink` as `className` by the coven card's foot only), first in the foot, tipped "Edit Stock" through `ModalButton`'s `tip` so the tip wraps the button and never the dialog it opens, named "Edit Stock, <ingredient>". Staged removal in the dialog uses `BinButton` (verb "Remove", named by the form).
- **Annotate on a coven's list** (`CovenCards`), through `AnnotateLink`:
  `AnnotateIcon`, an open book with a filled pencil,
  drawn at stroke width 1.25 rather than the set's 1.5, the owner's call
  (M8.17, 2026-10-19).
- **Add and held on a compendium card** (`CompendiumCards`' `AddIcon` and `HeldMark`, M9.12): `PlusIcon` on a button tipped and named "Add to My Ingredients" and then the entry (MB.120), `.add-icon` (Edit's size and green; its styles are [`add-icon.md`](add-icon.md)'s, MB.120), and `CheckIcon` in `.add-icon--held`, the same box and green, a status mark tipped and named "In Every Cupboard" and then the entry (MB.120) on a button that does nothing else when pressed, there so the keyboard reaches its tip (the owner's call of 2026-10-20), and whose press opens the tip (`opensOnPress`, below), at the card's bottom right, ahead of a curator's pencil. The button shows the shared spinner in the plus's place while it works.
- **More on a coven's list** (`CovenCards`' `CardMore`): `DotsIcon`, three
  vertical dots, inside a `MenuButton` with `.icon-tip__edit`, tipped
  "More", where the card holds two or more choices; and, where its one
  choice is Delete or Remove, `BinIcon` on a button of its own,
  `.icon-tip__remove`, tipped with its verb (M8.17; the owner's call,
  2026-10-20).
- **A jar line's stock badge** (`StockBadge`, M9.8), tipped "Low Stock at 10 g or less" or "Out of Stock" (the owner's call, 2026-10-20: an icon alone is an icon tip, not an InfoTip). Low's statement is also written out of sight as the button's description, since the bubble is hidden from a screen reader ([`stock-badge.md`](stock-badge.md)).
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

It runs on the same [`useTip`](info-tip.md) hook as InfoTip, but comes and
goes faster:

- **It opens once the pointer has rested on the control for 300ms, and at
  once on the control's focus.** A pointer passing over a row of pencils on
  its way somewhere else opens nothing. Both are heard on the wrapper, which
  is no larger than the control (the bubble is fixed, outside its box);
  focus bubbles up to it from the control. The wrapper rather than the
  control, so any control can sit inside without IconTip taking over its
  props. A focus inside the control's own open menu bubbles there too and is
  ignored: the menu says what the control does (the owner's call of
  2026-10-20 put a menu under the three dots).
- **A status mark's press opens it too** (`opensOnPress`, the owner's call,
  2026-10-20), as a tap or a click does on InfoTip's ⓘ. The card's In Every
  Cupboard check and the entry page's In Your Cupboard shelf are buttons that do
  nothing else, and on touch there is no hover, and a tap focuses no button in
  Safari, so without it the word would never show there. The click is heard on
  the wrapper as it bubbles up, and opens rather than toggles: on touch the
  emulated hover may have opened it already. A control with a press of its own
  (a pencil, the plus) does not take it, since its press says what it does.
- **It is shut while the control's menu is open** (the owner's call,
  2026-10-20). Around a control that opens a menu (a `MenuButton` icon: the
  card's plus, the entry page's pencil), the wrapper asks whether a button in
  it says `aria-haspopup` and `aria-expanded="true"`. While one does, a
  hover or a focus opens nothing (a hover's 300ms wait included: `useTip`'s
  `canOpen` asks as it opens), and a tip already showing is taken away by a
  `MutationObserver` on `aria-expanded`, so a menu opened by a press or by
  ArrowDown with the pointer resting on the control loses it too. It is in the
  wrapper, not in `MenuButton`, so every caller gets it and `MenuButton`
  knows nothing of tips. With the menu closed the next hover or focus shows it
  again; an Escape that closes the menu and hands the focus back does not, the
  menu still being drawn open at that instant, until the next hover.
- **It closes the moment the pointer leaves the control**, with no wait,
  and fades out over `$icon-tip-fade`, 120ms rather than every other tip's
  500ms.
- **The bubble cannot be hovered** (`pointer-events: none`): the owner's
  call, 2026-10-20, against WCAG 1.4.13's clause that hover content be
  hoverable. The tip repeats one word the control already says to a sighted
  reader by its shape and to assistive technology by its name, it is
  `aria-hidden`, and a tip that held on while the pointer crossed onto it
  covered the row beside the control for no gain. Dismissible (Escape) and
  persistent (it stays while the pointer rests on the control) still hold.
- **It closes on Escape, blur, or the pointer leaving.** Escape is
  heard on the document and marked handled while a tip is open, so it
  closes the tip alone: inside a modal, as the ingredient form is, the
  first Escape shuts the tip and the next one reaches the modal.
- **It is in the page while open and for its fade after**, so an open tip is
  one that exists. It fades in from a starting style and, closed, fades back
  out over `$icon-tip-fade` (a closing class, and a timer of the same length that
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
  round `$radius` and a help `$cursor` make InfoTip's ⓘ and the crown. A
  button takes the shared focus ring (`focus-ring`; MB.121, where the keyboard
  pass found the browser's default ring on them); an icon link keeps the
  accent ring the typography gives every link, so the rule names a button
  alone, through `:where(button)` to keep its weight a class's.
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
- **The bubble** is the `tip-bubble` mixin's, InfoTip's look, opened by
  `tip-bubble-open($icon-tip-fade)` so it fades in and out over 120ms, and
  takes no pointer.
- **At phone width** a list's Edit cell carries `.data-table__card-action`,
  which stands it at its card's top right ([`../styling.md`](../styling.md),
  "Tables at phone width").

## Stories

[`index.stories.tsx`](../../src/components/IconTip/index.stories.tsx),
`Forms / Icon Tip`, filed by kind rather than place, as the pencil is used in
the admin lists and the ingredient form alike. `States` is a grid of the tip on each control (Edit Link, Compendium Edit Link, Annotate Link, Quick Look Link, Bin Button, Annotate Button, Quick Look Button, More Menu). `InAListRow` is three banded rows
of a list's own table, with the pencil in an unlabelled last column at the
row's end, so it shows on the page and on the card. At 375px, from the toolbar viewport menu, the rows are cards with the pencil at each card's top
right. Hover or focus a pencil to see its tip. The form's pencils are in the
ingredient form's stories, and every list's in its own.

## Testing

`tests/components/IconTip/index.test.tsx` covers the 300ms hover wait, a
passing pointer opening nothing, the close the moment the pointer leaves and
the 120ms fade, focus opening at once and blur closing, Escape closing the tip alone (the key marked
handled only while it is open), Escape inside a `Modal` closing the tip first
and the modal second, the tip kept out of the accessibility tree, and
`EditLink`'s role and name. Each list's test finds its Edit links by their
names, and the ingredient form's tests its buttons, so a renamed control
fails there.

## Placement

`placement` is `side` (the default, left of the control), `below` (its right edge on the control's) or `above` (centred over it).

- `side` suits every Edit, which stands at the end of its line, so to its left is room the line already has.
- `above` suits a segment of the radio strip, where a tip to the side would cover the next segment and one below would cover the chosen name printed under the bar.
- `below` suits a mark at a row's right end with rows beneath it, such as the account menu's count, where a tip to the left would cover the row's words and one centred under it would run past the edge a menu panel clips at.

In a table row the tip is centred above the control, because level with it the tip covered the row's own text. A phone card keeps the left. The placement is a flat property on the wrapper rather than JavaScript's guess, since only the container query knows which the table is showing.

## Tip behaviour

The tip's text is drawn for a sighted user and never read aloud, since the control's own name says it. `opensOnPress` opens the tip on a press, for a status mark whose button does nothing else. It opens rather than toggles, and is not for a control with its own press.

The tip wrapper is also the tip's anchor, kept to ask whether a menu is open under it. Hover is read on the wrapper rather than the control, so any control can be the child without its props being taken over, and focus bubbles there too. A focus inside the control's own menu also bubbles there and is ignored, since the open menu says what the control does. A closing tip is no longer open but still in the page for the fade, and a timer clears it.

The tip is `fixed`, so a table frame's sideways scroll clips nothing. It fades in from its starting style over `$icon-tip-fade` rather than every other tip's `$tip-fade`. It takes no pointer: the tip is heard on its control alone and closes the moment the pointer leaves, so a bubble that caught the pointer would only cover what is beneath it. The wrapper is middle-aligned, so a mark taller than its row's text sits level with it rather than on its baseline.

## The controls built on it

- `EditLink` is a list row's icon link into a dialog. A press opens the row's modal at once under the given heading, over a skeleton while the form loads, and the link still works as an address. It is named by its verb and the row's name in hidden text.
- Edit in Compendium, on a compendium entry for an admin or a curator, is named and tipped "Edit in Compendium" so it cannot be taken for a coven's own choice.
- Annotate in a coven's list wears `AnnotateIcon`, an open book with a pencil, not Edit's pencil, since it writes the coven's notes over a compendium entry. Its stroke is 1.25 rather than the set's 1.5 so the lines sit apart at 16px, and the pencil is filled.
- `QuickLookLink` is the eye beside an entry's name, in its own class as it sits in the name's line. `QuickLookButton` serves where the details open in the page rather than at an address, such as over the Add Ingredient form's held duplicates.
- `MoreButton` is the three dots: a menu of further choices, as flat items (a spell's) or in labelled sections (an entry's Compendium and Coven). A lone Delete or Remove is the bin instead. A More drawn with words keeps its chevron.
- The icon controls that are buttons rather than links are shared by the coven cards' foot, the entry page and the Quick Look window so the places cannot differ.

## The icons

Every line icon on a 16-unit box is drawn at stroke 1.5 unless its drawing needs another, and then the icon's comment says why. The exceptions are the eye's outline at 1, the jar at 1.2, and Annotate, the cauldron and the Complete flask at 1.25. The stock badge's marks, the spell builder's supply marks, the source form's page and pencil, and the InfoTip ring are 1.5 like the rest. The icons on a 24-unit box (the section nav's and the form icons, at 1.6) and the shelf mark on a 32-unit box (1.2) keep their own strokes.

The mystic eye (Quick Look) is an almond eye whose iris is a tilted waxing crescent with a four-point star. The copy icon is two overlapping sheets, for Restore Original and Copy From Ingredient. The undo and redo icons are mirror images on the same 16-unit box, sized by attribute since a bare `svg` in a `.btn` has no size of its own. The jar icon is a jar with a cloth tied over its mouth, the cloth's hem wavy, worn by Edit Stock in place of the pencil. Its stroke is 1.2 as the jar is drawn larger.

## Ink and size

The Edit pencil beside Complete on a draft working's row (`EditButton`'s `plain`) uses the same `$text-primary`, while Complete keeps the green.

A coven card foot's Edit and Annotate icons use `$text-primary` (chalk on the dark page, the body text on the light one, where pure white would vanish on a card) in place of the accent green, which its Edit Stock pencil keeps. The hover and focus tint stays the edit pencil's.

The three dots use `$card-more-ink` wherever they stand (a card's foot, the entry page, the Quick Look window), at rest and pressed alike, where the pencil and bin beside them keep their green and wax. The compendium card's Edit in Compendium wears the same ink (`icon-tip__edit--ink`). Its hover and focus tint stays the edit pencil's green and the focus ring is the link's own.

The Quick Look eye is `$glyph-size-large` * 4 / 3 in the same 2rem box as the pencil, so the foot's height and the eye's line with the pencil stay put. `math.div` is used since Sass has dropped `/` for division. In the card foot it takes the dots' ink, set after the green so it wins.

The action icons of a card's foot, an entry page's head and the Quick Look window's head are 13% larger than the large size (`$action-icon-size`): the pencils (Edit, Annotate, Edit Stock), the plus and its held check, the bin, the three dots and the eye. The eye's mark is 11% past the pencil's there, and the jar of Edit Stock is 11% past the others, each in the same box. The same classes in a list row, a table or a form stay at `$icon-size-large`. Each place that works a gap out from the box (the stock lines' badge inset, the entry's title room, the window's controls row) reads `$action-icon-size` too.
