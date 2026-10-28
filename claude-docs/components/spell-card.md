# SpellCard

`src/components/SpellCard/` draws one spell in the grimoire's list (M10.11, story 56). It
shows six things:

- the spell's title, or "Untitled Spell" when it has none (`UNTITLED_SPELL`), since a draft
  may have no title;
- its intent, the member's own sentence saying what the spell is for;
- a Draft badge, on a draft only;
- a Private badge, on a private spell only (M10.13);
- the categories its author assigned it, as `CategoryChips`;
- who last edited it and when, as `LastEdit` ([last-edit.md](last-edit.md)), in the card's
  foot as an ingredient card's is, when the caller hands in an edit (the owner, 2026-10-27).

The card is presentational: it takes props and works nothing out from the data, as
[ingredient-card.md](ingredient-card.md) is.

## Props

| Prop         | What it is                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------- |
| `id`         | The spell's id. It names the title heading, `spellTitleId(id)`                                |
| `title`      | The title, or null. Null or blank lists as "Untitled Spell"                                   |
| `intent`     | The intent, or null. Without one the card draws no paragraph                                  |
| `status`     | `draft` or `complete`                                                                         |
| `visibility` | `private` or `workspace`: who can see it                                                      |
| `categories` | The assigned categories, each with its group's colours. Never the derived ones (DESIGN.md §5) |
| `lastEdit`   | Who last edited it and when, `{ by, at }`, worked out by the caller. None draws no line       |
| `level`      | The title's heading level, 2 by default                                                       |

## Its name

The `article` is named by its title heading through `aria-labelledby`. The grimoire list
names each list item the same way, pointing at the same id (`spellTitleId`), so a test or a
screen reader finds a spell by `getByRole('listitem', { name: 'Hearth Warding Jar' })`.

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

## No link yet

The card is not a link. The spell's own page is MB.6, and the card gains its link there,
through `PendingLink` as IngredientCard's name does. Until then the title is plain text, and
the card has no drawer behind it, since nothing opens from it.

## Styling

The layout is the Foundations specimen (`.specimen` in `_primitives.scss`). `index.scss`
adds IngredientCard's surface and padding, and sets the title at h3's size, as an
ingredient card's name. Tokens only.

## The smouldering edge

On hover, or with focus inside the card, the card's bottom edge burns, as parchment
smouldering from its bottom-right corner (found in the owner's review of M10.11, picked
from a set of hover options). The card's face also takes IngredientCard's hover tint and
lifted shadow, and nothing else: nothing moves the card.

What the effect is, in `_smoulder.scss`:

- **A true hole.** The burnt part is gone, through the card's face and its shadow both, so
  the page itself shows through it. The card's face and shadow are not on the `article` but
  on a layer of their own, `.spell-card__face`: the face is the wide spread shadow of a
  hole-shaped box, so it is everything but the hole, and the card's shadow is a
  `drop-shadow()` of that, so it follows the burnt edge and shrinks with the burn instead of
  staying a rectangle. The hole runs along the bottom edge, hanging 0.5rem past the card and
  1rem deep in all, so along the bottom it stays inside the card's padding. At the corner it
  bites deeper and curves about 1.25rem up the right edge (an elliptical corner radius,
  `$burn-corner-radius`), where no text runs.
- **An ember line, a char rim and a char line.** A thin bright line (`$ochre-bright`,
  `$wax-warm`) runs round the burn front, with a dark char rim (`--burn-char`) outside it,
  and outside that a thin soft near-black line (`--burn-char-line`) where the paper is
  charred but not yet alight. Both char colours are tokens per theme, taken from the
  theme's darkest ink, never pure black. One SVG filter, `#spell-card-burn` from
  `SpellCardFilters`, tears the hole in the face and the rim alike, so their ragged edges
  meet exactly.
- **One glow.** A single soft warm glow sits behind the face: it shows through the hole and
  spills onto the table below the card as one continuous layer, so there is no dark row
  between the glow inside the hole and the glow off the card. It runs 1.5rem past the ember
  front, at opacity 0.4 under a 1.25rem blur, kept below the ember line's brightness (the
  owner, 2026-10-28).
- **Timing.** The burn creeps along the edge for 1.3s, and the glow grows with it. On
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

The Workshop's `Hover` story holds the effect lit on one card and leaves a second to hover.
