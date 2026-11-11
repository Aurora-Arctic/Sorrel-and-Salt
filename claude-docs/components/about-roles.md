# AboutRoles

`src/components/AboutRoles/` draws the About Us page's three site roles (the owner, the keepers, and the curators) as cards. Each card is a list item holding a heading and a sentence on what the role does.

## Contracts

- **Presentational.** It takes `roles` (`types.ts`) and works nothing out. The wording is in `src/app/(public)/about/placeholders.tsx`.
- **The markup is `AboutCards`'s** (`src/components/AboutCards`), which this and the other About row both render through; this component passes its row's class and its cards.
- **It is reached through a placeholder.** `documents/about.md` holds a paragraph that is exactly `{aboutRoles}` under "Who Runs It". A version published before the placeholder existed has bullets there and renders as prose ([`document-page.md`](document-page.md)).
- **The card wording is not versioned.** A keeper edits the prose around the cards, not the cards.
- **Headings are `h3`**; the cards add no jump menu entries.

## Styling

`$fill-quiet` for a quieter ground than [`about-pillars.md`](about-pillars.md)'s cards, `radius('surface')` and `space()`. It does not take `card--quiet`, which draws an edge these cards leave out. The cards stack one beneath another at every screen width, at the full width of the body column, left-aligned in it, with `space(7)` above and below the group and `space(5)` between the cards. Each paragraph keeps the reading measure. An optional `icon` prop (an element from `IconTip/icons.tsx`; the page uses `SigilIcon`, `KeyIcon` and `AnnotateIcon`) shows left of the heading at `$icon-size-large` in the muted ink, in a wrapper hidden from a screen reader.
