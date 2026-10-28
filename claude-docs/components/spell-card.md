# SpellCard

`src/components/SpellCard/` draws one spell in the grimoire's list (M10.11, story 56). It
shows five things:

- the spell's title, or "Untitled Spell" when it has none (`UNTITLED_SPELL`), since a draft
  may have no title;
- its intent, the member's own sentence saying what the spell is for;
- a Draft badge, on a draft only;
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

- **A hole.** The burnt part is gone, so it shows the page's own colour, `$surface-page`,
  the same as the table round the card. It is a quarter ellipse anchored at the corner,
  hanging 0.5rem past the card's edge and under 1rem deep, so it stays inside the card's
  padding and never reaches text.
- **An ember line and a char rim.** A thin bright line (`$ochre-bright`, `$wax-warm`) runs
  round the burn front, with a dark char rim (`--burn-char`, a token per theme) outside it.
  An SVG filter, `#spell-card-burn` from `SpellCardFilters`, tears the front ragged.
- **A quiet glow.** Faint embers glow in the burnt part itself, strongest along the ember
  line and fading towards the corner, and a little warmth spills onto the table below the
  card, behind it. Both are kept low so the ember line is the bright part (the owner,
  2026-10-28).
- **Timing.** The burn creeps along the edge for 2.6s, and the glow grows with it. On
  leaving, the burn fades while the hole and the glow shrink back to the corner, so a quick
  return burns on from where they had shrunk to.
- **Reduced motion** shows the finished burn at once, still. **Touch** gets no hover at all:
  the rules sit inside `@media (hover: hover)`, so a tap does not leave a card burning.

The layers are two `aria-hidden` spans at the end of the `article`, so the card's name is
still its title alone. They sit in the stacking context of the list round them
([grimoire-list.md](grimoire-list.md), "Styling"), which is why the card itself takes no
`z-index`: one would make the card a stacking context and paint the glow over its face.

Nothing transforms the card or any ancestor of it: a transformed ancestor becomes the
containing block of the category chips' `position: fixed` tip bubbles.

Light theme: the page is `$parchment` (#efe9da) and the card `$parchment-raised`
(#f9f5ea), lifted to #fcfaf4 on hover, a contrast of 1.11 and 1.16 against the page. That
difference is the app's own tokens. The burnt fill is exactly the page colour. On the
hovered card the intent measures 6.95:1 (light) and 7.99:1 (dark), the title 15.56:1 and
12.20:1.

The Workshop's `Hover` story holds the effect lit on one card and leaves a second to hover.
