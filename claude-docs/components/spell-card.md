# SpellCard

`src/components/SpellCard/` draws one spell in the grimoire's list. It is presentational, as [ingredient-card.md](ingredient-card.md) is: it takes props and works nothing out from the data, and it has no drawer. Props are in `types.ts`.

## Contracts

- **Its name.** The `article` is named by its title heading (`aria-labelledby`), so a test or a screen reader finds a spell by `getByRole('article', { name: 'Hearth Warding Jar' })`. The list leaves its items unnamed, so the title is heard once. A null or blank title lists as `UNTITLED_SPELL`, since a draft may have none.
- **Categories are the assigned ones**, never the derived ones (DESIGN.md §5).
- **Only a draft and only a private spell are marked.** Complete and shared are the defaults, and marking them says nothing. `SpellMarks` draws both under the title ([entry-marks.md](entry-marks.md), "Spell marks"). The service lists a private spell to its author alone, so the Private badge is seen only by the person it is about. It is a word, so it does not rely on colour. Draft takes Retired's muted tint, because an unfinished spell is a fact about it, not a warning; Private takes Draft's.
- **The foot line.** `workingCount` above zero adds "Made once" or "Made 3 times" after the last-edit line ([last-edit.md](last-edit.md)); it counts the complete workings the viewer can see, from the count loader. Zero or none says nothing.

### The link

- Without an `href` the title is plain text and the card keeps the default cursor, since a press does nothing.
- **The link covers the whole card.** The title's `<a>` stretches an empty `::after` over the article, as an ingredient card's does. The top row stays unpositioned so the overlay is placed against the article, and the title's words are their own positioned span inside the link so they paint over the face. The intent, the plain chips, the badges, the made count and the foot's gaps pass the pointer through to the link. The foot's actions, the last-edit line and the category chips' +N button sit above it and keep their own press, hover and focus.
- The foot sets `pointer-events: none`, which its children inherit, so the actions row and the last-edit line take the pointer back with `auto`. Without that, the last-edit line's tip opened on focus only, never on hover.
- The focus ring is drawn round the card on the article's own `::after`, which comes after the burn layers and so paints over the burnt corner; the link's overlay, earlier in the markup, would not. So `specimen-card()` is included with `$ring: false`.
- The foot's actions sit outside the title link, so no interactive element nests in another.

### The foot's actions

Each is drawn only when the caller hands in what it needs. The page decides who gets what, and the service is the guard.

- **Edit pencil.** `editHref` goes to a role that may update a spell, so an observer's cards have none. It keeps the tab's filter, page and tab in the address, so closing the dialog returns to the list as it was.
- **Quick Look eye.** `lookHref` goes to every role, since an observer may read the spell. It opens the `look` modal place (`SPELL_LOOK_PLACE`), apart from the spell builder's dialog, and closing returns focus to the eye. The modal is `SpellLookDialog` ([spell-recipe.md](spell-recipe.md), "The Quick Look modal").
- **Record a Working and More** are the spell page's own parts, so each has one implementation: `SpellMoreMenu` (`SpellRecipe/more-menu.tsx`) holds Duplicate and Delete Spell, and the card passes `canPrint={false}` because Print is the spell page's alone. The menu draws nothing when neither is allowed. Each needs a query client, which the workshop does not provide, so the card has no story with them.
  - `recordWorking` goes to a complete spell when the role may record a working and read members (the spell page's rule). `more` goes when the role may create or delete a spell: steward and practitioner, never observer. `deletedHref` is the tab's address with its filter and page kept and `deleted=<name>` added.
  - The list does not hold what the dialog needs. The button opens the dialog at once, and the dialog reads the spell's steps in one `RecordWorkingSetup` query through `/api/graphql`, so a list nobody records from costs no steps batch. Its participant box searches the members as the user types ([record-working.md](record-working.md)). While the query runs the dialog holds a `form` skeleton and one Loading status ([loading.md](../loading.md)); a failed read is one error Notice.

## Styling

The card is IngredientCard's sibling: the same surface, radius, padding, title size, badges and chips, from `IngredientCard/_specimen-card.scss`, plus the smoulder below. The face and shadow are on a layer of their own, not the `article`, so the burn can cut through both.

## Compact

Under a list's `data-density="compact"`, unless a stored Regular choice sits on `<html>` (`data-card-density`, [card-density-switch.md](card-density-switch.md)), `_compact.scss` includes IngredientCard's shared `specimen-card-compact()` and sets the intent a step smaller. The card takes no density prop, so the look can switch before React runs.

## The smouldering edge

On hover, or with focus inside, the card's bottom-right corner burns like smouldering parchment. The face takes IngredientCard's hover tint and lifted shadow, and nothing moves. The rules sit inside `@media (hover: hover)`, so a tap on a phone does not leave a card burning. Reduced motion shows the finished burn at once, still. The `$burn-*` tokens at the end of `src/scss/_variables.scss` hold the colours, lengths and timings.

- **A true hole.** The burnt part is gone through the card's face and its shadow, so the page shows through. The face is the wide spread shadow of a hole-shaped box, so it is everything but the hole, and the card's shadow is a `drop-shadow()` of that, so it follows the burnt edge instead of staying a rectangle.
- **Nothing warm sits under text.** The hole stays inside the card's padding along the bottom, and climbs higher only at the corner, where no text runs.
- **One glow.** A single warm glow sits behind the face and spills onto the table as one continuous layer, so there is no dark row between the glow in the hole and the glow off the card. It stays below the ember line's brightness.
- **One filter.** `#spell-card-burn` tears the hole in the face and the rim alike, so their ragged edges meet exactly. Both char colours are per-theme tokens taken from the theme's darkest ink, never pure black.
- **Settling.** The ember, glow and embers each flicker for `$burn-flickers` rounds and hold their last frame, so a card left under the pointer or holding the focus settles rather than flickering. On leaving, the burn fades while the hole, shadow and glow shrink back to the corner, so a quick return burns on from where they had shrunk to. The glow's pulse runs through the filter's `opacity()`, not the `opacity` property, which stays free to transition: an animation that stops does not transition, and the glow would vanish at once on leave.
- **Layers and stacking.** Three `aria-hidden` spans sit in the `article`, so the card's name is still its title alone: the glow and the face before the content, the burn's rim after it. They stack by markup order, with `position: relative` on each child and no `z-index` anywhere. A `z-index` on the card would trap the category chips' tips beneath the next card, and one on a layer behind it would need a stacking context round the card.
- **Nothing transforms the card or any ancestor**, because a transformed ancestor becomes the containing block of the chips' `position: fixed` tip bubbles.
- **Contrast.** Light theme: the page is `$parchment` (#efe9da) and the card `$parchment-raised` (#f9f5ea), lifted to #fcfaf4 on hover, a contrast of 1.11 and 1.16 against the page. Those are the app's own tokens. On the hovered card the intent measures 6.95:1 (light) and 7.99:1 (dark), the title 15.56:1 and 12.20:1.

### The burn filter

`SpellCardFilters` renders the filter once per page beside the list of cards (`GrimoireList`), not once per card: an id must be unique and one filter serves every card. Without it, or where `filter: url()` does not apply, the burn front is a smooth curve. The noise is coarse and still, since a burn line does not wriggle.

## Used by

`GrimoireList` ([grimoire-list.md](grimoire-list.md)).

## Stories

`Grimoire / Spell Card` (`index.stories.tsx`). Record a Working's own story answers its writes; the card's story answers none.
