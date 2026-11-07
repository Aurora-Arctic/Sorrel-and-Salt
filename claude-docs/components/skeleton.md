# Skeleton

`src/components/Skeleton/` — the grey outline of a page part that is on its
way (M12.33). It was the tab panel's skeleton (MB.115) and the route modal's
(M9.18); `TabPanelLoading` and `ModalLoading` are now thin users of it.

## Props

`SkeletonProps` (`types.ts`).

| Prop        | What it is                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`     | `table`, `cards`, `form`, `page`, `contents`, `recipe`, `detail`, `document` or `line`                                                                                                                                                                                                                                                                                             |
| `filter`    | Optional, `table` and `cards` only: a filter row above the list                                                                                                                                                                                                                                                                                                                    |
| `title`     | Optional, `table` and `cards` only: the page's heading row above everything else, a heading bar (`skeleton__title`) laid out by `.page-header`                                                                                                                                                                                                                                     |
| `tabs`      | Optional, with `title`: a tab track between the heading and the action, for a page with a tab row (`skeleton__tabs`)                                                                                                                                                                                                                                                               |
| `tabsBelow` | Optional, with `tabs`: the track stands on a line of its own beneath the heading and is as wide as six pills, as `TabbedPage`'s `tabsBelow` lays them (`skeleton__header--tabs-below`)                                                                                                                                                                                             |
| `columns`   | Optional, `table` only: how many columns the head and each row draw, where the page's table has more than the default three (`--skeleton-columns`)                                                                                                                                                                                                                                 |
| `fields`    | Optional, `table` only: how many controls the filter row draws, where the page's filter has more than the default two                                                                                                                                                                                                                                                              |
| `side`      | Optional, `detail` only: the side column of settings beside the main column, drawn for a keeper and left out for a curator                                                                                                                                                                                                                                                         |
| `menu`      | Optional, `page` only: a side menu beside the page (`skeleton__menu`), laid out by the page's own `.page-with-nav` and `.page-nav`, so it sits as the real menu does                                                                                                                                                                                                               |
| `head`      | Optional, `page` and `contents`: `eyebrow` draws an eyebrow bar above the title, `title` a title alone with no line. Each bar takes the real head's height (an h1's size, a two-line lede), so what is beneath does not jump on arrival                                                                                                                                            |
| `entry`     | Optional, with `menu`: the content fills the wide column beside the menu, in the entry's own `.ingredient-entry--with-nav` grid (`entry-nav-grid`), not the narrow `.page-with-nav`. Its content is the entry's own Details and Forms layout (text beside a side column of headed lists, `entry-section` and `entry-side`), bare bars with no card surface; `count` does not apply |
| `action`    | Optional, with `title`: a button-sized block at the heading's end, for a page with an Add                                                                                                                                                                                                                                                                                          |
| `density`   | Optional, for `cards`: `compact` draws the compact cards the coven lists open at, unless a stored Regular choice sits on `<html>`                                                                                                                                                                                                                                                  |
| `card`      | Optional, for `cards`: `spell` draws the Grimoire's spell-card placeholder (title, edited line, action row) in place of the ingredient card's                                                                                                                                                                                                                                      |
| `count`     | Optional: how many rows, cards, fields, blocks or lines (6, 6, 4, 3 and 1 otherwise); not for a `page` with a `menu`, whose sections are fixed                                                                                                                                                                                                                                     |

## Contracts

- **A `page` draws the side menu when its frame is `with-nav` (the coven home, the narrow column) or `entry` (an ingredient's page, the wide column: a Compendium entry in the `main` region, a coven's own entry in the `coven` region)**: the menu column beside the title, the lede and the sections. It is built only from the existing pieces. Below the head the sections are bare bars with no card surface, as the real pages have none: the coven home (`head: eyebrow`) draws Contents (a heading and two linked entries each with a line), Your Membership and Delete This Coven (a heading and a button) in `.page-frame__section`; the account (`head: title`) draws four `.page-frame__section.panel` panels of a heading, a line, a field and a button. The `skeleton__block` card survives only on a `page` with no menu.

- **An `entry` frame also draws the entry’s parts**, in the order the page lays them: Details (a heading, three text bars, the side column’s blocks), a Stock part (a heading and three placeholder jars on a plank, sized from the jar shelf’s tokens), then the forms. See [`ingredient-entry.md`](ingredient-entry.md), “Layout”.

- **`requests` draws the account's Support Requests tab** inside the tab layout, so the tabs stay put: the head line (a short muted-line bar at the left, a button-sized box at the right, the small button's width at the compact control height (2rem)), then three rows (`count`) of the list's own shape, each a subject bar over a meta line of a badge-sized pill and three short bars, at the row's padding (`space(3)` by `space(4)`) and `space(3)` apart. The tab sets it with `shape: 'requests'` in `ACCOUNT_TABS`; the page has no `loading.tsx` of its own.
- **The `document` shape stands in for a site document's editor** (`DocumentEditor`) in the editor's own column (`.document-editor-column`, so it is as wide as the real page): a title bar, a lede line, two button-sized blocks at the start of a row, then a box 24rem tall, the text box's minimum height. With `title`, `tabs` and `tabsBelow` it draws the page's heading and its tab row on a line beneath first. Each of the four documents' tabs sets `shape: 'document'` in `ADMIN_PAGES.documents`, and `adminTarget('/keepers/documents/privacy')` draws the whole page the same way.
- **The `detail` shape stands in for an opened support request** in the route modal's body, in the `support-detail` grid the real detail uses: the facts, the Thread and the reply in the main column, and with `side` the settings column. `SupportRequests` passes it to `RouteModal` as `loadingBody`. The admin Support list is a `table` with `title`, `tabs`, `tabsBelow`, `filter`, `fields: 3` and `columns: 9` (`adminTarget('/keepers/support')`, and the view tabs' own `columns` and `fields` for a pressed tab); it does not use `requests`, which is the account's tab.
- **Exactly one `<output>`, "Loading"**, visually hidden, so a screen reader
  hears one announcement whatever the shape. The drawn shapes are
  `aria-hidden`.
- **It leaves by fading**: the shell's bodies keep the last skeleton over the arrived page for 200ms, and it fades out ([`SkeletonFade`](skeleton.md#skeleton-fade)). The skeleton itself knows nothing of it; its own fade-in is switched off in the overlay.
- **It shows at once**, with the short `$motion-short` fade (`arrived`): the
  press has already taken the old content away, and holding the skeleton back
  would leave a blank panel. Only the spinner waits for `$loading-delay`.
- **Shimmer through `skeleton-shape`**, which uses `loading-motion`: a band
  of `$shimmer-duration` (1.4s), or under reduced motion the shared
  `loading-pulse` of `$pulse-duration` (2s).
- It is a size container, so the table's rows turn to cards under the width
  the real table stacks at.
- **The `recipe` shape stands in for a spell's own page** (`covenTarget` returns it for an id beneath `grimoire`, bar `drafts`): the back link, the Edited line, the title with its row of action icons, the Workings menu in the left column, then the main and side columns, in the recipe's own grid (`entry-nav-grid`, `entry-section`, `entry-side`). From a phone's width down the title bar is two lines, the menu takes four rows and the side column stands over the main one, as the page stacks them. The lead and facts of a spell are not drawn, as a spell may have neither.
- **The filter row sits where the loaded page's does, at every width.** The heading row has no bottom margin in the skeleton, because the column's gap already spaces it from the filter row. Under the page header's narrow width the heading bar takes a line of its own, the action follows it and the tab track goes last at full width, as the pages reflow. `tests/e2e/grimoire-skeleton.spec.ts` measures the row's top in the wait and on the loaded page, at 1280 and 375, for the Grimoire (both tabs), coven Ingredients, the Compendium and the admin lists. A list head with an eyebrow and a lede (`head: 'eyebrow'`, the public Compendium) draws them above the heading row, the lede on three lines on a phone. The Grimoire draws the New Spell block for an observer too, who has none.
- **A compact `cards` filter row ends with the Compact switch**, a label bar over a track bar (beside it under the forms' column, where the Filters button then shares the second line). The Ingredients and Grimoire lists both draw it.
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

## Skeleton fade

When a wait ends, the shell's bodies do not drop the skeleton at once. They keep the last one over the page that has arrived, and it fades away for 200ms (`$arrive-duration`, the same time `arrived` fades content in) while the page shows through. Used by `MainBody` and `SectionBody`; the owner asked for the crossfade on 2026-10-19 (M12.33).

### Parts

| Part                            | What it does                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useLeavingSkeleton(shown)`     | Pass the skeleton while a wait is on and `null` when it is not. Returns the skeleton to keep for 200ms after the wait ends, then `null`                                                                                                                                                                                                                                        |
| `skeletonFadeHost(leaving)`     | The class of the box the overlay is placed against: `position: relative`, and `overflow: clip` only while it fades                                                                                                                                                                                                                                                             |
| `SkeletonOverlay`               | The kept skeleton: `aria-hidden`, `pointer-events: none`, `position: absolute` at the host's top-left, out of layout, on the page's own ground                                                                                                                                                                                                                                 |
| `heldPage(waiting, className?)` | Props for the box the page stays in: while waiting, the `skeleton-held` class (`visibility: hidden`), `inert` and `aria-hidden`                                                                                                                                                                                                                                                |
| `SkeletonCover`                 | The skeleton during the wait: a `skeleton-cover` box holding a pin that sticks at `var(--sticky-top, 0)`, the top of the window under the bar                                                                                                                                                                                                                                  |
| `skeletonCoverHost(waiting)`    | The class of the box holding the page and the cover (`position: relative`). While waiting it is a one-cell grid with the held page and the cover in the same cell, so it is as tall as the taller of the two: a skeleton taller than the old page pushes the footer down rather than painting over it. `MainBody` puts it on its host; `SectionBody` on a box around its frame |

### The page is held, not swapped

During a wait the old page stays mounted, hidden, at its full height, and the skeleton is laid over it (MB.271). Swapping the page for the skeleton made the document shorter than the place the reader had scrolled to, so the browser pulled the scroll position up, and Chrome then saved that shortened position into the history entry when Next pushed the new address: Back returned to the wrong place. Held, the page keeps the document's height until the new page arrives.

- **Hidden, not removed.** `visibility: hidden` keeps the page's layout; `inert` and `aria-hidden` take it out of reach of the keyboard, the pointer and a screen reader, so nobody acts on the old page in the wait. `display: none` would collapse the height, which is the bug, and React's `<Activity>` hides with `display: none` too.
- **The page keeps its box.** The page is a child of the same element in both states, so React never remounts it, and a section frame keeps the page as its direct children, so its flex column and gap are untouched.
- **Pinned to the window.** The cover spans the whole page, and the box holding both is at least as tall as the skeleton, so its sticky pin shows the skeleton at the top of the window, under the bar, wherever the page was scrolled to. The shell sets `--sticky-top`; `PublicFrame` sets it to `0px`.

### Rules

- **Out of layout and out of the way.** The overlay is absolute, so it adds no height; the host clips it while it fades, so a skeleton taller than the arrived page cannot lengthen the document. It takes no pointer events and unmounts when the fade is done, so it never covers a focused control after it.
- **One heading, one status.** The overlay carries no hidden `h1` and is `aria-hidden`; the arrived page has its own heading and landmark. The hidden `h1` exists only while the wait is on.
- **A new wait mid-fade** takes the skeleton back at once; the old timer is cleared.
- **No skeleton, no fade.** A navigation with no skeleton target (a refresh) leaves the page standing and nothing fades: the page was never replaced.
- **The page is not wrapped to fade in.** Its fade-in is the overlay fading out over it, on the page's ground: wrapping the arriving page in a box to run `arrived` on it would put a box round it that the section layouts' flex columns would feel. The same keyframe (`fade-in`) runs backwards.
- **Reduced motion** follows `arrived`: it shows the new content at once, so the overlay is `display: none` and nothing fades.

### Holding the page during a wait

While a wait is on, the page stays mounted at its full height but unseen (`visibility`) and out of reach (`inert`, `aria-hidden`), while `SkeletonCover` stands over it. `visibility` is used because it keeps the page's box, where `display: none` or React's `<Activity>` would collapse it. The page is not taken away because the browser saves the scroll position into the history entry when the navigation writes it, after the skeleton is up. A page swapped for a shorter skeleton would clamp the scroll first, and Back would return to the clamped position. The element is the same whether waiting or not, so React keeps the page mounted.

### The fade out

When a wait ends, the bodies (`MainBody`, `SectionBody`) do not drop the skeleton at once. They keep the last one over the page that has arrived, and it fades away while the page shows through. This is a client part, since the timer is the browser's. The skeleton fades rather than the page fading in, because wrapping the arriving page would put a box round it that the section layouts' flex columns would feel. The overlay is out of layout and unmounts when it has gone.

### Stories

`src/components/SkeletonFade/index.stories.tsx`, titled "Feedback / Skeleton Fade": `Default`. A press of its button starts a wait and a second press ends it, and the skeleton fades for 200ms over the page that arrived.
