# Skeleton

`src/components/Skeleton/` — the grey outline of a page part that is on its
way (M12.33). It was the tab panel's skeleton (MB.115) and the route modal's
(M9.18); `TabPanelLoading` and `ModalLoading` are now thin users of it.

## Props

`SkeletonProps` (`types.ts`).

| Prop      | What it is                                                                                                                                                                                                                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`   | `table`, `cards`, `form`, `page`, `contents` or `line`                                                                                                                                                                                                                                                                                                                             |
| `filter`  | Optional, `table` and `cards` only: a filter row above the list                                                                                                                                                                                                                                                                                                                    |
| `title`   | Optional, `table` and `cards` only: the page's heading row above everything else, a heading bar (`skeleton__title`) laid out by `.page-header`                                                                                                                                                                                                                                     |
| `tabs`    | Optional, with `title`: a tab track between the heading and the action, for a page with a tab row (`skeleton__tabs`)                                                                                                                                                                                                                                                               |
| `menu`    | Optional, `page` only: a side menu beside the page (`skeleton__menu`), laid out by the page's own `.page-with-nav` and `.page-nav`, so it sits as the real menu does                                                                                                                                                                                                               |
| `head`    | Optional, `page` and `contents`: `eyebrow` draws an eyebrow bar above the title, `title` a title alone with no line. Each bar takes the real head's height (an h1's size, a two-line lede), so what is beneath does not jump on arrival                                                                                                                                            |
| `entry`   | Optional, with `menu`: the content fills the wide column beside the menu, in the entry's own `.ingredient-entry--with-nav` grid (`entry-nav-grid`), not the narrow `.page-with-nav`. Its content is the entry's own Details and Forms layout (text beside a side column of headed lists, `entry-section` and `entry-side`), bare bars with no card surface; `count` does not apply |
| `action`  | Optional, with `title`: a button-sized block at the heading's end, for a page with an Add                                                                                                                                                                                                                                                                                          |
| `density` | Optional, for `cards`: `compact` draws the compact cards the coven lists open at, unless a stored Regular choice sits on `<html>`                                                                                                                                                                                                                                                  |
| `count`   | Optional: how many rows, cards, fields, blocks or lines (6, 6, 4, 3 and 1 otherwise); not for a `page` with a `menu`, whose sections are fixed                                                                                                                                                                                                                                     |

## Contracts

- **A `page` draws the side menu when its frame is `with-nav` (the coven home, the narrow column) or `entry` (an ingredient's page, the wide column: a Compendium entry in the `main` region, a coven's own entry in the `coven` region)**: the menu column beside the title, the lede and the sections. It is built only from the existing pieces. Below the head the sections are bare bars with no card surface, as the real pages have none: the coven home (`head: eyebrow`) draws Contents (a heading and two linked entries each with a line), Your Membership and Delete This Coven (a heading and a button) in `.page-frame__section`; the account (`head: title`) draws four `.page-frame__section.panel` panels of a heading, a line, a field and a button. The `skeleton__block` card survives only on a `page` with no menu.

- **An `entry` frame also draws the entry’s parts**, in the order the page lays them: Details (a heading, three text bars, the side column’s blocks), a Stock part (a heading and three placeholder jars on a plank, sized from the jar shelf’s tokens), then the forms. See [`ingredient-entry.md`](ingredient-entry.md), “Layout”.

- **Exactly one `<output>`, "Loading"**, visually hidden, so a screen reader
  hears one announcement whatever the shape. The drawn shapes are
  `aria-hidden`.
- **It leaves by fading**: the shell's bodies keep the last skeleton over the arrived page for 200ms, and it fades out ([`SkeletonFade`](skeleton-fade.md)). The skeleton itself knows nothing of it; its own fade-in is switched off in the overlay.
- **It shows at once**, with the short `$motion-short` fade (`arrived`): the
  press has already taken the old content away, and holding the skeleton back
  would leave a blank panel. Only the spinner waits for `$loading-delay`.
- **Shimmer through `skeleton-shape`**, which uses `loading-motion`: a band
  of `$shimmer-duration` (1.4s), or under reduced motion the shared
  `loading-pulse` of `$pulse-duration` (2s).
- It is a size container, so the table's rows turn to cards under the width
  the real table stacks at.
- **The `cards` shape stands in for a card list**: the public Compendium and the admin Compendium draw it at the
  regular density; the coven's Ingredients list (`CovenCards`) and the grimoire (`GrimoireList`) draw it compact.
  Inside an element that says `data-density="compact"`, unless a stored Regular choice sits on `<html>`
  (`data-card-density="regular"`), the column, gap and padding follow the compact cards
  (`IngredientCard/_compact.scss`), so the list does not jump when it arrives. The two coven lists put that
  attribute on a wrapper round their search, which covers the skeleton inside the list. The skeletons drawn
  outside it pass `density: 'compact'`, which the skeleton writes on its own root: a navigation's, from the
  section's target (`covenTarget` in `src/lib/coven-path.ts`), and a tab switch's, from the pressed tab (the
  grimoire's two tabs).

## Styling

`index.scss`, built from the tokens and the shared mixins:

- Every bar is a `span` inside `.skeleton__shapes`, drawn by the `skeleton-shape` mixin (`_mixins.scss`): the quiet
  fill, the band and the reduced-motion pulse.
- The block classes name the part each bar stands in for: `skeleton__header`, `__title`, `__tabs` and `__action` for
  the heading row; `__filter`, `__field` and `__count` for the filter row; `__head`, `__row` and `__pager` for the
  table; `__cards` and `__card` for the cards; `__intro`, `__eyebrow`, `__lede`, `__menu` and the `__entry-*`
  classes for the pages.
- The cards' column is `$ingredient-card-min`, or `$ingredient-card-min-compact` under the compact selector (see
  Contracts). The table turns to cards under `$table-stack-width`, through the `skeleton` size container.
- `.skeleton-frame` is the class `MainBody` adds to a `main` wait, which draws it from the top rather than centred.

## SwapPanel

`swap-panel.tsx` lives here too: it swaps a panel for the skeleton while a
transition runs (`ListFrame`, `TabbedPage`).

## Stories

`Feedback / Skeleton`: `States`, with a control that chooses Table, Table With Filter, Table With Title And Filter, Table With Three Rows, Cards, Cards With Filter, Cards With Title And Filter, Cards With Eight, Compact Cards (under an ancestor that says `data-density="compact"`), Form, Page, Page With Menu, Page With Eyebrow Head, Page With Title Head, Tabbed Page, Contents, Contents With Eyebrow Head, Entry With Menu, Swap Panel Pending, Line and Lines With Count. Line is one bar the height of a line of text, for a sentence
that loads in place (the substitute summary's); Lines With Count is three of them, as `count={3}` stacks
them for Record a Working's completion list.

## Testing

`tests/components/Skeleton/index.test.tsx`: each shape renders exactly one
status. The heading row is drawn only when `title` is asked for, and the action only
with a heading.
