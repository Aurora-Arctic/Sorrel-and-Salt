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

## The link

Given an `href`, the title is a `PendingLink` with a `LinkHint`, as IngredientCard's name
is; the grimoire list passes each spell's recipe page (MB.6, `recipeHref`). Without one the
title is plain text. The card has no drawer behind it, since nothing opens from it.

## Styling

The layout is the Foundations specimen (`.specimen` in `_primitives.scss`). `index.scss`
adds IngredientCard's surface and padding, and sets the title at h3's size, as an
ingredient card's name. Tokens only.
