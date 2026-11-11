# AboutPillars

`src/components/AboutPillars/` draws the About Us page's four parts (the Compendium, Ingredients, the Grimoire, and the Coven) as a grid of cards, two across and two down. Each card is a list item holding the part's name as a small label, a heading saying what it answers ("What Exists", "What You Have", "What You Make"), and one sentence.

## Contracts

- **Presentational.** It takes `pillars` (`types.ts`) and works nothing out. The wording is in `src/app/(public)/about/placeholders.tsx`, not in the component.
- **The markup is `AboutCards`'s** (`src/components/AboutCards`), which this and the other About row both render through; this component passes its row's class and its cards.
- **It is reached through a placeholder.** `documents/about.md` holds a paragraph that is exactly `{aboutPillars}` under "What Sorrel & Salt Is", and the About routes hand `DocumentPage` this component for that name. A version published before the placeholder existed has bullets there instead and renders as prose ([`document-page.md`](document-page.md)).
- **The card wording is not versioned.** A keeper edits the prose around the cards, not the cards.
- **Headings are `h3`**, since the section's `h2` comes from the markdown. The jump menu is read from the markdown, so the cards add no entries.

## Styling

- **The card is the quiet card primitive** (`card--quiet`, [`styling.md`](../styling.md)) for its padding, edge, radius and ground. The primitive lights up under a pointer; these cards are not controls, so `index.scss` holds their wash at rest, pointed at and focused.
- **Each card wears one hue**, the `accent` prop (`accent`, `clay`, `sloe` or `woad`), set as the `--pillar` custom property from the `data-accent` attribute, as a notice sets its bar. The hue draws the 3px top rule (`$rule-heavy`), the kicker and the icon. The wash and edge are `chip-wash()`, and the card text goes back to `$text-primary`. `$clay`, `$sloe` and `$woad` are the only hues added for this; the wax is for danger and the ochre for warnings. Their contrast is held by `tests/scss/tokens.test.ts`.
- **The icon** is an optional `icon` prop (an element from `IconTip/icons.tsx`), shown right of the kicker at `$icon-size-large` in a wrapper hidden from a screen reader. The page uses `BookIcon`, `StockIcon`, `CauldronIcon` and `CovenIcon`.
- **The row has no box of its own**: no padding, ground or outline. It is the whole body column, left-aligned in it, with `space(7)` above and below the group and `space(5)` between the cards. The cards sit two across from the same width up, and stack one beneath another below it, where two across would be too narrow for their sentences. Each paragraph keeps the reading measure.
- **No list markers**: `list-reset` clears them, and the document body's list marker rule does not reach the cards.
