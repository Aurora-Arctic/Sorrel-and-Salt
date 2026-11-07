# Skeleton

`src/components/Skeleton/` — the grey outline of a page part that is on its way (M12.33). It was the tab panel's skeleton (MB.115) and the route modal's (M9.18); `ModalLoading` is a thin user of it.

Since M11.9 `Skeleton` is only the two smallest pieces, a line of text and a control-sized box. A page-sized skeleton is not a shape of it: each page has a `skeleton.tsx` beside it, built from the page's own components and registered in `src/app/skeletons.ts` ([`loading.md`](../loading.md), "How a skeleton is chosen"). The list frames' skeletons are in `src/components/ListFrame/skeleton.tsx` ([`list-frame.md`](list-frame.md)), the card ones in `IngredientCard/skeleton.tsx` and `SpellCard/skeleton.tsx`, and the admin nav's in `AdminNav/skeleton.tsx`.

## Props

`SkeletonProps` (`types.ts`).

| Prop    | What it is                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `shape` | `line` (a line of text each, for a sentence or a short list that loads in place) or `block` (a control-sized box each, a field) |
| `count` | Optional: how many lines or blocks it draws. Default 1                                                                          |
| `quiet` | Optional: leaves out the "Loading" status, for a skeleton drawn inside a shell body that already carries the one                |

## Contracts

- **Exactly one `<output>`, "Loading"**, visually hidden, so a screen reader hears one announcement whatever is drawn. The drawn shapes are `aria-hidden`. A page skeleton built from several `Skeleton`s passes `quiet` to all of them and carries the one status itself, in the shell body that draws it.
- **A body skeleton carries no status; its host wraps it in `LoadingStatus`** (`Skeleton/loading-status.tsx`), which renders the hidden "Loading" beside it. `SwapPanel` and the refused-opens table in `AdminCards/attempts.tsx` do.
- **It leaves by fading**: the shell's bodies keep the last skeleton over the arrived page for 200ms, and it fades out ([`SkeletonFade`](skeleton-fade.md)). The skeleton itself knows nothing of it; its own fade-in is switched off in the overlay.
- **It shows at once**, with the short `$motion-short` fade (`arrived`): the press has already taken the old content away, and holding the skeleton back would leave a blank panel. Only the spinner waits for `$loading-delay`.
- **Shimmer through `skeleton-shape`**, which uses `loading-motion`: a band of `$shimmer-duration` (1.4s), or under reduced motion the shared `loading-pulse` of `$pulse-duration` (2s).
- **A page skeleton sits where its page does.** It draws the page's own frame ([`page-column.md`](page-column.md), [`page-frame.md`](page-frame.md), [`page-with-nav.md`](page-with-nav.md)) and its real heading, filter and list components in a pending state, so nothing moves when the page arrives. `tests/e2e/grimoire-skeleton.spec.ts` measures the filter row's top in the wait and on the loaded page.
- **A card skeleton is one block.** `IngredientCardSkeleton` and `SpellCardSkeleton` draw the card's own frame filled by a single shimmer (`card-skeleton-fill`, `_mixins.scss`), with no bars, at the height of a typical card in each density.
- **The cards follow the density.** A card list's skeleton sits inside the element that says `data-density="compact"` where the loaded list does, unless a stored Regular choice sits on `<html>` (`data-card-density="regular"`), so the column, gap and padding follow the compact cards (`IngredientCard/_compact.scss`) and the list does not jump when it arrives.

## Styling

`index.scss`, built from the tokens and the shared mixins:

- Every bar is a `span` inside `.skeleton__shapes`, drawn by the `skeleton-shape` mixin (`_mixins.scss`): the quiet fill, the band and the reduced-motion pulse.
- `.skeleton-frame` is the class `MainBody` adds to a `main` wait, which draws it from the top rather than centred.

## SwapPanel

`swap-panel.tsx` lives here too: it swaps a panel for the skeleton while a transition runs (`ListFrame`, `TabbedPage`). `panel.tsx` holds `PanelSkeleton`, a panel section with its heading and lede bars and then its fields as blocks.

## Stories

`Feedback / Skeleton`: `States`, with a control that chooses Line, Lines With Count, Block, Blocks With Count and Swap Panel Pending. Line is one bar the height of a line of text, for a sentence that loads in place (the substitute summary's); Lines With Count is three of them, as `count={3}` stacks them for Record a Working's completion list.

## Testing

`tests/components/Skeleton/index.test.tsx`: each shape renders exactly one status, every bar stays out of the accessibility tree, and `quiet` leaves out the status.
