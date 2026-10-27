# SpellCard

`src/components/SpellCard/` draws one spell in the grimoire's list (M10.11, story 56). It
shows four things:

- the spell's title, or "Untitled Spell" when it has none (`UNTITLED_SPELL`), since a draft
  may have no title;
- its intent, the member's own sentence saying what the spell is for;
- a status badge, Draft or Complete;
- the categories its author assigned it, as `CategoryChips`.

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
| `level`      | The title's heading level, 2 by default                                                       |

## Its name

The `article` is named by its title heading through `aria-labelledby`. The grimoire list
names each list item the same way, pointing at the same id (`spellTitleId`), so a test or a
screen reader finds a spell by `getByRole('listitem', { name: 'Hearth Warding Jar' })`.

## Draft and Complete

The acceptance criterion asks for the two statuses to be visually distinct, so each has a
badge palette of its own in `$badge-palettes` (`src/scss/_variables.scss`). Both reuse inks
that are already contrast-checked, so neither adds a colour:

- `draft` takes Retired's muted tint: an unfinished spell is a fact about it, not a warning.
- `complete` takes Local's tinted accent inks.

The two then differ in colour as well as in the word.

## No link yet

The card is not a link. The spell's own page is MB.6, and the card gains its link there,
through `PendingLink` as IngredientCard's name does. Until then the title is plain text, and
the card has no drawer behind it, since nothing opens from it.

## Styling

The layout is the Foundations specimen (`.specimen` in `_primitives.scss`). `index.scss`
adds IngredientCard's surface and padding, and sets the title at h3's size, as an
ingredient card's name. Tokens only.
