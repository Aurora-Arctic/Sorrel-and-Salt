# Skeleton

`src/components/Skeleton/` — the grey outline of a page part that is on its
way (M12.33). It was the tab panel's skeleton (MB.115) and the route modal's
(M9.18); `TabPanelLoading` and `ModalLoading` are now thin users of it.

## Props

`SkeletonProps` (`types.ts`).

| Prop     | What it is                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`  | `table`, `cards`, `form`, `page`, `contents` or `line`                                                                                                               |
| `filter` | Optional, `table` and `cards` only: a filter row above the list                                                                                                      |
| `title`  | Optional, `table` and `cards` only: the page's heading row above everything else, a heading bar (`skeleton__title`) laid out by `.page-header`                       |
| `tabs`   | Optional, with `title`: a tab track between the heading and the action, for a page with a tab row (`skeleton__tabs`)                                                 |
| `menu`   | Optional, `page` only: a side menu beside the page (`skeleton__menu`), laid out by the page's own `.page-with-nav` and `.page-nav`, so it sits as the real menu does |
| `action` | Optional, with `title`: a button-sized block at the heading's end, for a page with an Add                                                                            |
| `count`  | Optional: how many rows, cards, fields or blocks (6, 6, 4 and 3 otherwise)                                                                                           |

## Contracts

- **Exactly one `<output>`, "Loading"**, visually hidden, so a screen reader
  hears one announcement whatever the shape. The drawn shapes are
  `aria-hidden`.
- **It shows at once**, with the short `$motion-short` fade (`arrived`): the
  press has already taken the old content away, and holding the skeleton back
  would leave a blank panel. Only the spinner waits for `$loading-delay`.
- **Shimmer through `skeleton-shape`**, which uses `loading-motion`: a band
  of `$shimmer-duration` (1.4s), or under reduced motion the shared
  `loading-pulse` of `$pulse-duration` (2s).
- It is a size container, so the table's rows turn to cards under the width
  the real table stacks at.

## SwapPanel

`swap-panel.tsx` lives here too: it swaps a panel for the skeleton while a
transition runs (`ListFrame`, `TabbedPage`).

## Stories

`Feedback / Loading / Skeleton`: `Table`, `TableWithFilter`, `TableWithTitleAndFilter`, `Cards`, `CardsWithFilter`, `CardsWithTitleAndFilter`,
`Form`, `Page` and `Line`. `line` is one bar the height of a line of text, for a sentence
that loads in place (the substitute summary's); it ignores `count`.

## Testing

`tests/components/Skeleton/index.test.tsx`: each shape renders exactly one
status. The heading row is drawn only when `title` is asked for, and the action only
with a heading.
