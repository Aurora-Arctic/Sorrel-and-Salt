# SpellCard

`src/components/SpellCard/` draws one spell in the grimoire's list (M10.11, story 56). It
shows:

- the spell's title, or "Untitled Spell" when it has none (`UNTITLED_SPELL`), since a draft
  may have no title;
- its intent, the member's own sentence saying what the spell is for, cut to three lines;
- a Draft badge, on a draft only;
- a Private badge, on a private spell only (M10.13);
- the categories its author assigned it, as `CategoryChips`;
- who last edited it and when, as `LastEdit` ([last-edit.md](last-edit.md)), in the card's
  foot as an ingredient card's is, when the caller hands in an edit (the owner, 2026-10-27);
- how many times it has been made, "Made once" or "Made 3 times", when `workingCount` is above
  zero (M13.8), on the same line as the edit, after a dot: "Edited 5 minutes ago · Made 3 times";
- its actions, in the foot: the Quick Look eye at the left, and Record a Working, the Edit
  pencil and the More menu at the right, each drawn only when the caller hands in what it
  needs (below).

The card is presentational: it takes props and works nothing out from the data, as
[ingredient-card.md](ingredient-card.md) is.

## Props

| Prop            | What it is                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | The spell's id. It gives the title heading the id the card is named by                                                                |
| `href`          | The spell's recipe page, which the title links to. None leaves the title plain text                                                   |
| `title`         | The title, or null. Null or blank lists as "Untitled Spell"                                                                           |
| `intent`        | The intent, or null. Without one the card draws no paragraph                                                                          |
| `status`        | `draft` or `complete`                                                                                                                 |
| `visibility`    | `private` or `workspace`: who can see it                                                                                              |
| `categories`    | The assigned categories, each with its group's colours. Never the derived ones (DESIGN.md §5)                                         |
| `workingCount`  | How many complete workings the viewer can see, from the count loader. Zero or none says nothing on the foot line                      |
| `lastEdit`      | Who last edited it and when, `{ by, at }`, worked out by the caller. None draws no line                                               |
| `editHref`      | Where the Edit pencil opens the spell, the tab's own address plus `?edit=<id>`. None draws no pencil                                  |
| `recordWorking` | What the Record a Working button needs: `{ workspaceId, recorderId }`. The dialog reads the rest once opened. None draws no button    |
| `more`          | What the More menu needs: `{ workspaceId, covenSlug, deletedHref, canDuplicate, canDelete }`. None, or nothing allowed, draws no menu |
| `lookHref`      | Where the Quick Look eye opens the spell, the tab's own address plus `?spell=<id>`. None draws no eye                                 |
| `level`         | The title's heading level, 2 by default                                                                                               |

## Its name

The `article` is named by its title heading through `aria-labelledby`, so a test or a screen
reader finds a spell by `getByRole('article', { name: 'Hearth Warding Jar' })`. The grimoire
list leaves its items unnamed, so the title is heard once.

## Only a draft is marked

A draft card carries a Draft badge, and a complete card carries no status badge at all:
complete is the default state, so marking it says nothing (the owner, 2026-10-27, amending
M10.11's "Draft and complete are visually distinct"). The badge is `.badge--draft`, whose
palette in `$badge-palettes` (`src/scss/_variables.scss`) takes Retired's muted tint and
its contrast-checked inks: an unfinished spell is a fact about it, not a warning.

## Only a private spell is marked

A private spell's card carries a Private badge, and a spell shared with the coven carries
none, for the same reason: the coven is the default (M10.13). The service lists a private
spell to its author alone (M10.6), so the badge is seen only by the one person it is about,
and tells them no one else in the coven sees it. It is the word "Private", so it does not
rely on colour. `.badge--private` takes Draft's muted tint and inks, and sits after Draft
when a spell is both.

## The link

Given an `href`, the title is a `PendingLink` with a `LinkHint`, as IngredientCard's name
is; the grimoire list passes each spell's recipe page (MB.6, `recipeHref`). Without one the
title is plain text, and the card keeps the default cursor, since a press does nothing. The card
has no drawer behind it, since nothing opens from it.

The link covers the whole card, as IngredientCard's does: the title's `<a>` stretches an
empty `::after` over the article, so a press anywhere opens the recipe. While the link holds
focus, the focus ring is drawn round the card on the article's own `::after`, which comes after
the burn layers and so is not covered by the burnt corner. The intent, the chips' plain items, the made count and the
foot (the gaps between the actions and beside the last-edit line) pass the pointer through to it; the foot's four actions, the
last-edit line and the category chips' +N button sit above it and keep their own press, hover and focus. The foot passes the
pointer through with `pointer-events: none`, which its children inherit, so the actions row and the last-edit line each take
it back with `pointer-events: auto`; without that, the last-edit line's tip opened on focus only, never on hover.

## The Edit pencil

Given an `editHref`, the card draws an `EditLink` (an icon link, named "Edit <title>") in the
card's foot, at the right of the `specimen__actions` row, as IngredientCard draws its Edit pencil (M13.10). The row reuses IngredientCard's classes and size rules (`.spell-card .specimen__actions` is in the same selector lists), so the icons match in the grid, compact and phone layouts. The grimoire tab works the address
out and passes it only for a role that may update a spell (`rolePermits(role, { spell:
['update'] })`), so a viewer's cards have none. It keeps the tab's filter, page and tab in
the address, so closing the dialog returns to the list as it was.

## Record a Working, Edit and the More menu

The foot's actions, after the Quick Look eye, are the spell page's own parts, so each has one implementation: Record a Working (the green cauldron, `SpellCard/record-working.tsx`, opening the same form the spell page's `RecordWorkingButton` opens), the Edit pencil (text colour) and `SpellMoreMenu` (`SpellRecipe/more-menu.tsx`) holding Duplicate and Delete Spell (destructive). The card passes its own `id`, `visibility` and name, and `canPrint={false}`: Print is the spell page's alone. The menu draws nothing when neither Duplicate nor Delete Spell is allowed. The buttons sit in the foot, outside the title link, so no interactive element nests in another. Each needs a query client, which the workshop does not provide, so the card has no story with them.

The grimoire tab builds `recordWorking` for a complete spell when the role may record a working and read members (the spell page's rule) and `more` when the role may create or delete a spell (`rolePermits`: owner and member, never viewer). The list does not hold what the dialog needs, and reads none of it: the button opens the dialog at once, and the dialog reads the spell's steps and the coven's members in one `RecordWorkingSetup` query through `/api/graphql` (`spell(workspaceId, id).steps` and `workspace(id).members`), so a list nobody records from costs no roster read and no steps batch. While the query runs the dialog holds a `form` skeleton and one Loading status, as [`loading.md`](../loading.md) sets out; a refused or failed read is one error Notice in the dialog. It reads the first 100 members, which the members box offers; a member the viewer cannot name is "A former member", and a linked step with no name to read is "Unavailable Ingredient", as on the spell page. `deletedHref` is the tab's address with its filter and page kept and `deleted=<name>` added.

## The Quick Look eye

Given a `lookHref`, the card draws a `QuickLookLink` (an eye icon link, named "Quick Look <title>")
at the bottom left of the foot, in `specimen__actions-start`, as IngredientCard draws its eye (M13.21), opening the `look` modal place
(`SPELL_LOOK_PLACE`) so it is independent of the spell builder's dialog. The grimoire tab passes
it for every role, since a viewer may read the spell; it keeps the tab's filter, page and tab in
the address, and closing returns there with focus back on the eye. What the modal shows is
`SpellLookDialog` (claude-docs/components/spell-recipe.md, "Quick Look").

## Styling

The layout is the Foundations specimen (`.specimen` in `_primitives.scss`). The card is
IngredientCard's sibling (the owner's request, 2026-10-28): the same surface, shadow, radius,
padding, title size, medium badges and category chips. The Draft and Private badges are drawn by `SpellMarks` ([spell-marks.md](spell-marks.md)) and sit under
the title as an ingredient card's marks sit under its name, the last-edit line is in the foot,
the intent stops at three lines with an ellipsis (`-webkit-line-clamp`, the unprefixed `line-clamp` beside it
as an enhancement), and the made count shares the last-edit line: `.spell-card__foot-line` is a wrapping flex row
in `$last-edit-ink` at caption size, `space(5)` below the chips, with an `aria-hidden` dot between the two,
and the hover is the same tint and lifted shadow plus the smoulder below, with no drawer.
Tokens only. The rules the two cards share come from `IngredientCard/_specimen-card.scss`:
`specimen-card()` gives the title link stretched over the card, the pointer on a card whose
title links, the title block, the badge row, the medium badge size and the plain chips passing
a click through. It is included with `$ring: false`, as this card draws its focus ring on the
article's own `::after`, which paints over the burnt corner where the link's overlay would not.

## Compact

Under a list's `data-density="compact"`, unless a stored Regular choice sits on `<html>`
(`data-card-density`, [card-density-switch.md](card-density-switch.md)), `_compact.scss`
includes IngredientCard's shared `specimen-card-compact()`: padding `space(3) space(4)`, gap `space(2)`, the
title at h4's size, small badges, overline chips and a tighter foot, and the intent a step smaller. The card takes no
density prop, so the look can switch before React runs.

## The smouldering edge

On hover, or with focus inside the card, the card's bottom edge burns, as parchment
smouldering from its bottom-right corner (found in the owner's review of M10.11, picked
from a set of hover options). The card's face also takes IngredientCard's hover tint and
lifted shadow, and nothing else: nothing moves the card.

What the effect is, in `_smoulder.scss`. Its colours, lengths, durations and the rim's flicker frames are `$burn-*` tokens at the end of
`src/scss/_variables.scss`; the partial forwards the ones SpellPreview reads, and keeps `$candle` and `$ember` as its names for
`$burn-candle` and `$burn-ember`.

- **A true hole.** The burnt part is gone, through the card's face and its shadow both, so
  the page itself shows through it. The card's face and shadow are not on the `article` but
  on a layer of their own, `.spell-card__face`: the face is the wide spread shadow of a
  hole-shaped box, so it is everything but the hole, and the card's shadow is a
  `drop-shadow()` of that, so it follows the burnt edge and shrinks with the burn instead of
  staying a rectangle. The hole runs along the bottom edge, hanging 0.5rem past the card and
  1rem deep in all, so along the bottom it stays inside the card's padding. At the corner it
  bites deeper and curves about 1.25rem up the right edge (an elliptical corner radius,
  `$burn-corner-radius`), where no text runs.
- **An ember line, a char rim and a char line.** A thin bright line (`$burn-candle`, the dark theme's warning ochre,
  and `$burn-ember`, its secondary red) runs round the burn front, with a dark char rim (`--burn-char`) outside it,
  and outside that a thin soft near-black line (`--burn-char-line`) where the paper is
  charred but not yet alight. Both char colours are tokens per theme, taken from the
  theme's darkest ink, never pure black. One SVG filter, `#spell-card-burn` from
  `SpellCardFilters`, tears the hole in the face and the rim alike, so their ragged edges
  meet exactly.
- **One glow.** A single soft warm glow sits behind the face: it shows through the hole and
  spills onto the table below the card as one continuous layer, so there is no dark row
  between the glow inside the hole and the glow off the card. It runs `$burn-glow-lead` (1.5rem) past the ember
  front, at opacity 0.4 under a 1.25rem blur, kept below the ember line's brightness (the
  owner, 2026-10-28). Faint embers glow in the burnt part, brightest along the ember line and
  fading towards the corner.
- **Nothing warm sits under text.** With its rim and the tearing, the hole stays inside the
  card's padding along the bottom, and climbs higher only at the corner, where no text runs.
- **Timing.** The burn creeps along the edge for 1.3s, and the glow grows with it, then holds
  while the ember glows unevenly for three rounds (`$burn-flickers`), the glow and the embers breathing at their own
  paces for three rounds too, and each then holds its last frame, so a card left under the pointer or holding the focus
  settles rather than flickering for as long as it is hovered. On
  leaving, the burn fades while the hole, the face's shadow and the glow shrink back to the
  corner, so a quick return burns on from where they had shrunk to.
- **Reduced motion** shows the finished burn at once, still. **Touch** gets no hover at all:
  the rules sit inside `@media (hover: hover)`, so a tap does not leave a card burning.

The layers are three `aria-hidden` spans in the `article`, so the card's name is still its
title alone: the glow and the face before the content, and the burn's rim after it. They
stack by the order of the markup, with `position: relative` on each child and no `z-index`
anywhere. A `z-index` on a layer behind the card would need a stacking context round the
card, and one on the card itself would trap the category chips' tips beneath the next card.

Nothing transforms the card or any ancestor of it: a transformed ancestor becomes the
containing block of the category chips' `position: fixed` tip bubbles.

Light theme: the page is `$parchment` (#efe9da) and the card `$parchment-raised`
(#f9f5ea), lifted to #fcfaf4 on hover, a contrast of 1.11 and 1.16 against the page. That
difference is the app's own tokens. The burnt part is the page itself. Below the hole, the
warm glow on parchment, together with the card's shadow, is slightly darker than the page,
as any warm tint on parchment is. On the hovered card the intent measures 6.95:1 (light)
and 7.99:1 (dark), the title 15.56:1 and 12.20:1.

### The burn filter

`SpellCardFilters` renders the filter once per page beside the list of cards (`GrimoireList`), not once per card: an id must be unique and one filter serves every card. Without it the burn front is a smooth curve. The filter uses coarse noise to displace the hole and its ember and char bands. The noise is still, since a burn line does not wriggle.

## Stories

`Grimoire / Spell Card` (`index.stories.tsx`): `States`, a grid of Complete, As Listed (the
title link, the made count, the last edit and the foot's Quick Look eye, Record a Working, Edit
pencil and More menu, as the grimoire lists a card to a member who may use them), Viewer, As
Listed (the link, the eye and the lines, with no Record, Edit or More), Draft, Private, Private
Draft, Untitled, No Intent, No Categories, Made Once, Made Several Times, Edited, Heading Level 3,
Long Title, Held (the finished hovered look, drawn with no pointer), Hover It (a card at rest to
hover), Compact and Compact Private Draft (each under `data-density="compact"`).

Every cell with a last edit opens the line's tip on hover. The More menu's items are the bare
verbs Duplicate and Delete; the card has no Print. The foot's buttons open their dialogs, but
nothing they write is answered in this story; Record a Working's own story answers its writes.
