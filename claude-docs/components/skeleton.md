# Skeleton

`src/components/Skeleton/` draws the two smallest pieces of a page part that is on its way: a line of text and a control-sized box. `ModalLoading` is a thin user of it. Props are in `types.ts`.

A page-sized skeleton is not a shape of it: each page has a `skeleton.tsx` beside it, built from the page's own components and registered in `src/app/skeletons.ts` ([`loading.md`](../loading.md), "How a skeleton is chosen"). The list frames' skeletons are in `src/components/ListFrame/skeleton.tsx` ([`list-frame.md`](list-frame.md)), the card ones in `IngredientCard/skeleton.tsx` and `SpellCard/skeleton.tsx`, and the admin nav's in `AdminNav/skeleton.tsx`.

## Props

| Prop    | What it is                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `shape` | `line` (a line of text each, for a sentence or a short list that loads in place) or `block` (a control-sized box each, a field) |
| `count` | Optional: how many lines or blocks it draws. Default 1                                                                          |
| `quiet` | Optional: leaves out the "Loading" status, for a skeleton drawn inside a shell body that already carries the one                |

## Contracts

- **Exactly one `<output>`, "Loading"**, visually hidden, so a screen reader hears one announcement whatever is drawn. The drawn shapes are `aria-hidden`. A page skeleton built from several `Skeleton`s passes `quiet` to all of them and carries the one status itself, in the shell body that draws it.
- **A body skeleton carries no status; its host wraps it in `LoadingStatus`** (`Skeleton/loading-status.tsx`), which renders the hidden "Loading" beside it. `SwapPanel` and the refused-opens table in `AdminCards/attempts.tsx` do.
- **It shows at once**, with the short `$motion-short` fade (`arrived`): the press has already taken the old content away, and holding the skeleton back would leave a blank panel. Only the spinner waits for `$loading-delay`. It leaves by fading ([Skeleton fade](#skeleton-fade)); its own fade-in is off in the overlay.
- **Shimmer through `skeleton-shape`**, which uses `loading-motion`: a band of `$shimmer-duration` (1.4s), or under reduced motion the shared `loading-pulse` of `$pulse-duration` (2s).
- **A page skeleton sits where its page does.** It draws the page's own frame ([`page-column.md`](page-column.md), [`page-frame.md`](page-frame.md), [`page-with-nav.md`](page-with-nav.md)) and its real heading, filter and list components in a pending state, so nothing moves when the page arrives. `tests/e2e/grimoire-skeleton.spec.ts` measures the filter row's top in the wait and on the loaded page; `tests/e2e/skeleton-layout.spec.ts` measures every registered page ([`loading.md`](../loading.md), "The layout spec").
- **A card skeleton is one block.** `IngredientCardSkeleton` and `SpellCardSkeleton` draw the card's own frame filled by a single shimmer (`card-skeleton-fill`, `_mixins.scss`), with no bars, at the height of the tallest typical card of its list, in each density. The height is a per-kind token, `$card-skeleton-heights` in `_variables.scss` (`cupboard`, `compendium`, `spell`, `spell-draft`), and the host names the kind: `IngredientCardSkeleton kind` and `ListSkeleton card` (with `draft` for the taller draft spell card). Re-measure the tokens when a card gains or loses a row.
- **The cards follow the density.** A card list's skeleton sits inside the element that says `data-density="compact"` where the loaded list does, unless a stored Regular choice sits on `<html>` (`data-card-density="regular"`), so the column, gap and padding follow the compact cards (`IngredientCard/_compact.scss`) and the list does not jump when it arrives.

## Styling

`index.scss` draws every bar as a `span` inside `.skeleton__shapes`, through the `skeleton-shape` mixin (`_mixins.scss`): the quiet fill, the band and the reduced-motion pulse. `.skeleton-frame` is the class `MainBody` adds to a `main` wait, which draws it from the top rather than centred.

## SkeletonText

`text.tsx` draws real text as bars: a `span.skeleton-run` whose text is transparent over the shared bar fill (`skeleton-fill`, `_mixins.scss`). A page skeleton wraps the words of a part it draws from the page's own component ([`coven-home.md`](coven-home.md) does, in `pending`), so the bars take the width and wrapping of the real words and each wrapped line fragment paints its own bar. The text stays in the page's markup, so the host that draws it (the page skeleton) is the one that keeps it from being read aloud and carries the single "Loading" status. It takes no props beyond its children.

## SwapPanel and PanelSkeleton

`swap-panel.tsx` (`SwapPanel`) swaps a panel for the skeleton while a transition runs (`ListFrame`, `TabbedPage`). `panel.tsx` holds `PanelSkeleton`, a panel section with its heading and lede bars and then its fields as blocks.

## Skeleton fade

When a wait ends, the shell's bodies (`MainBody`, `SectionBody`) keep the last skeleton over the arrived page and it fades out over 200ms (`$arrive-duration`, the time `arrived` fades content in) while the page shows through. The skeleton fades rather than the page fading in because wrapping the arriving page in a box to run `arrived` would put a box round it that the section layouts' flex columns would feel. It is a client part, since the timer is the browser's. The same keyframe (`fade-in`) runs backwards. The parts are in `src/components/SkeletonFade/`.

- **Parts.** `useLeavingSkeleton(shown)` takes the skeleton while a wait is on and `null` when not, and returns the skeleton to keep for 200ms after the wait ends. `skeletonFadeHost(leaving)` is the class of the box the overlay is placed against (`overflow: clip` only while fading). `SkeletonOverlay` is the kept skeleton, out of layout and on the page's own ground. `heldPage(waiting, className?)` gives the page's box, while waiting, the `skeleton-held` class (`visibility: hidden`), `inert` and `aria-hidden`. `SkeletonCover` is the skeleton during the wait: a `skeleton-cover` box holding a pin (`.skeleton-cover__pin`) that sticks at `var(--sticky-top, 0)`, the top of the window under the bar (the shell sets `--sticky-top`; `PublicFrame` sets `0px`). `skeletonCoverHost(waiting)` is the class of the box holding the page and cover (`position: relative`); while waiting it is a one-cell grid with both in the same cell, so a skeleton taller than the old page pushes the footer down rather than painting over it. `MainBody` puts it on its host; `SectionBody` on a box around its frame.
- **The page is held, not swapped.** During a wait the old page stays mounted, hidden, at its full height, with the skeleton over it, so the document keeps its height through the wait: a shorter skeleton in its place would shorten the document below the reader's scroll position and the browser would clamp the scroll. `visibility: hidden` keeps the layout; `inert` and `aria-hidden` take the page out of reach of keyboard, pointer and screen reader. `display: none` and React's `<Activity>` collapse the height, which is the bug. The page is a child of the same element in both states, so React never remounts it, and a section frame keeps the page as its direct children, so its flex column and gap are untouched.
- **The window scrolls to the top as the skeleton shows.** `useLeavingSkeleton`, which both hosts call, scrolls the window to the top instantly, once per wait, when a host starts drawing a destination's skeleton; a navigation that draws no host skeleton (a pager, a filter, a sort) and a route modal do not scroll ([`loading.md`](../loading.md), "Frames, context rows and the scroll"). Back still returns to the reader's place ([Back after a skeleton](#back-after-a-skeleton)).
- **Out of layout and out of the way.** The overlay is absolute, so it adds no height; the host clips it while it fades, so a skeleton taller than the arrived page cannot lengthen the document. It takes no pointer events and unmounts when the fade is done, so it never covers a focused control after it.
- **One heading, one status.** During the wait the one `h1` is the skeleton's own `PageHeader` heading. The overlay is `aria-hidden`; the arrived page has its own heading and landmark.
- **A new wait mid-fade** takes the skeleton back at once; the old timer is cleared.
- **No skeleton, no fade.** A navigation that draws no skeleton (a refresh, a same-address navigation, an unregistered address) leaves the page standing and nothing fades.
- **Reduced motion** shows the new content at once: the overlay is `display: none`.

### Back after a skeleton

The browser saves the scroll position into a history entry when Next pushes the next address, and Next pushes after the skeleton has shown. By then the hook has scrolled the window to the top, so the browser's own record of the page left is 0, and Back would open it at the top. `useLeavingSkeleton` therefore keeps the position itself, in `src/components/SkeletonFade/back-scroll.ts`:

- **Saved before the scroll.** As a skeleton shows, the hook writes the current `scrollY` into the page's own history entry with `history.replaceState`, keeping every key Next stores there, and only then scrolls to the top. A wait that ends on the same page (a refresh, a cancelled navigation) removes the key again.
- **Restored once the page has drawn.** On Back or Forward, Next keeps custom keys in the entry and draws the page in a transition after `popstate`. The restore waits, a frame at a time and for at most 600 frames, until Next writes the entry again (a new `history.state` object), which it does as it commits the page, then scrolls once to the saved position and removes the key. Next itself does not scroll on a traversal, so nothing scrolls after it.
- **One listener for the page's life.** The `popstate` listener is added the first time a host mounts and is never removed: a Back that changes layout (a curator page left for `/privacy`, say) swaps the hosts, and a listener tied to a host's lifetime is not attached when that `popstate` fires.

`tests/e2e/skeleton-back-scroll.spec.ts` proves it from far down the compendium and from the curator compendium list, at desktop and phone widths.

## Tests and stories

`tests/components/Skeleton/index.test.tsx`: each shape renders exactly one status, every bar stays out of the accessibility tree, and `quiet` leaves out the status. Stories: `Feedback / Skeleton` (`States`, with a control that chooses Line, Lines With Count, Block, Blocks With Count and Swap Panel Pending) and `src/components/SkeletonFade/index.stories.tsx` ("Feedback / Skeleton Fade").
