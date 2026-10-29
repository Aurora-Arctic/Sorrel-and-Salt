# ListFrame

`src/components/ListFrame/` — a paged list's root, the `.list-frame`
primitive ([`styling.md`](../styling.md), "Form fields"), and the one record
of whether another page of the list is on its way. Its filter
([`FilterForm`](filter-form.md)) and its pager ([`Pager`](pager.md)) both
navigate through it, so while the new page reads the list shows the same
loading state a tabbed page's tabs do ([`tabbed-page.md`](tabbed-page.md)),
on the owner's call at MB.115's review: "Filters should trigger the same type
of loading state as tabs." GroupedValueList, CompendiumList, GroupList,
UserList, PrivilegeLedger and AdminInvitations each sit in one.

## Parts

`index.tsx`, a client file:

| Export                  | What it is                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ListFrame` (default)   | The root `div.list-frame`, with the list's own class beside it, holding the navigation                         |
| `ListBody`              | The list under the filter, the table or empty state and the pager, or the skeleton for them                    |
| `useListNavigation`     | `{ pending, searching, target, go(href, kind) }` for the filter and the pager; it throws outside a `ListFrame` |
| `ListNavigationContext` | The context itself, exported for the workshop, whose stub router goes nowhere                                  |

`ListFrameProps` and `ListBodyProps` are in `types.ts`, with `ListNavigation`
and `ListNavigationKind` (`soft`, `page` or `full`).

A list renders `<ListFrame className="user-list">`, its filter, then
`<ListBody>` round the table or empty state and the `Pager`. The list
components stay server components: the frame and the body are client
parts, and the table passes through them from the server.

## Contracts

- **One navigation for filter, clear and pager.** `go(href, kind)` opens
  another page of the list and does nothing while one is pending, so a second
  press cannot send a second request. `kind` is the caller's. A filter's is
  always `soft`, through FilterForm's `useApplyFilter`, on every list,
  the three that once filtered by a full load too, since every page under
  `/admin` runs the guard itself (`src/app/(shell)/admin/layout.tsx`; MB.115, the
  owner's call). A pager's `soft` says which its ends take: `page` for a soft
  end, `full` for a plain one.
  - `soft` pushes the address through `usePendingNavigation`
    (`src/lib/navigation/`), which runs the router call inside a React
    transition. Next runs its navigation inside the caller's transition, so
    `pending` stays true until the new page has rendered. The same navigation
    puts up the page bar ([`../loading.md`](../loading.md)). `searching` is
    true only while a `soft` navigation is pending, which only a filter makes,
    so the search sentence types for a new search and not for a pager press.
    `target` is the address that navigation is opening, while it is pending: the
    page still shown is the previous search, so the sentence is built from the
    term and facets `target` carries, read through the same parameter table
    the page uses, not from the filter on screen.
  - `page` is a pager end's soft navigation. It pushes with `{ scroll: false }`,
    so Next does not scroll to the page top (on `/admin/compendium` that
    brings the Admin section menu back into view), and once the transition
    ends it brings the start of `.list-frame__body` to the top of the visible
    area, only if that start is above the line now. The line is the root's
    `scroll-padding-top`, which the search row sets so a scrolled-to element
    lands under the stuck row. The scroll is a plain `scrollIntoView({ block:
'start' })`, so the site's smooth scrolling and its reduced-motion rule
    apply; a list start already in view scrolls nothing. While the page is
    pending the skeleton's wrapper takes a `min-height` of the body's height
    at the press (`heldHeight` on the navigation, through `SwapPanel`'s
    `loadingMinHeight`), because a skeleton far shorter than a page of cards
    would shrink the document and make the browser pull the scroll position
    up. The new page renders without it, so a short last page is not padded.
    Filters and tab panels hold nothing. The filter's
    `soft` keeps Next's own scroll.
  - `full` is `window.location.assign`, a whole page load, a plain pager
    end's, which runs the admin layout's guard again. It has no transition to wait on, so a flag
    holds `pending` from the press until the browser unloads the page: the
    browser keeps painting the old page, skeleton and all, until the new
    one's first paint. A `pageshow` from the back-forward cache (the browser
    restoring a page it kept whole) drops the flag, so Back does not land on
    a skeleton.
- **While a page is on its way** the body shows the tabs' own skeleton,
  `TabPanelLoading` (a thin user of [`Skeleton`](skeleton.md)) with no filter row,
  since the real filter row stays: a table's heading, six banded rows and a
  pager (or, with `shape="cards"`, six card shapes in the
  [`IngredientCardList`](ingredient-card-list.md) grid), cards at a phone's width, one visually hidden `<output>` its one
  status. The filter row greys out and is off
  ([`filter-form.md`](filter-form.md)).
- **When the new page renders** the body shows it, keyed afresh so it fades
  in over 200ms, as a tab's new content does: `ListBody` and the tabbed
  page's `TabPanel` both swap through `SwapPanel` (`Skeleton/swap-panel.tsx`). A list the server drew,
  before any press, carries no `data-arrived` and shows at once.
- **Only the filter and the pager trigger it.** A row's Edit and the page's
  Add (`?edit=`, `?new`) are `next/link` soft navigations of their own and
  leave the list in place (a plain press opens the modal at once, with a skeleton of its own, M9.18); typing in a field navigates nowhere. A direct
  request renders the whole page on the server, as before, with no skeleton.
- **A provider above is kept.** As `TabSwitchProvider` does, a
  `ListNavigationContext` already above the frame, the workshop's, is used
  rather than shadowed, so a story can hold a list on its way.

## Styling

In `_primitives.scss` beside `.list-frame`, under `body`, so the app's
weights hold: `.list-frame__body` is a column `space(5)` apart, as the frame
is, its empty-state paragraph with no margin; `[data-arrived]` runs the
200ms fade, none under `prefers-reduced-motion: reduce`. The skeleton's
shapes, shimmer and 150ms fade are the shared [`Skeleton`](skeleton.md)'s
(`Skeleton/index.scss`), which `TabPanelLoading` uses, so the shapes are drawn
wherever a list renders, in a tabbed page or not. Under reduced motion the
shimmer becomes the loading standard's slow opacity pulse, not a still shape.

## Stories

[`index.stories.tsx`](../../src/components/ListFrame/index.stories.tsx),
`Layout / List Frame`: `States`, with a control that chooses Default (a small table and its pager), Pending (the same with a page on its way) and Pending Cards (the card skeleton). A whole list on its way, filter
row and all, inside its tabbed page, is GroupedValueList's
`CategoriesPending`
([`grouped-value-list.md`](grouped-value-list.md)).

## Testing

`tests/components/ListFrame/index.test.tsx` owns the `page` kind's scroll: the
push carrying `{ scroll: false }` where the filter's does not. Bringing the
body into view after the transition, only when its top is above the padding
line, needs layout, which happy-dom has none of. Beyond that, no file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 6): the soft filter's skeleton, greyed row, refused second
press and the list's return are `CompendiumList`'s, and a pager press of
either kind, the full load's Back from the cache included, `Pager`'s, each
rendering the pager in a `ListFrame`. `tests/support/navigating.tsx` holds a
mocked `push` pending as the App Router does, and its `arrives` promise lets
a test settle it.

## Navigation modes

A list moves to another of its pages in one of three ways. `soft` is a client-side navigation inside a transition. `page` is a soft one for a pager end, which keeps the reader at the list instead of scrolling to the page top. `full` is a whole page load, which runs the admin layout's guard again (see `pager.md`).

## The navigation provider

The provider holds the navigation the filter, the pager and the body share. A soft navigation runs inside its transition, so `pending` stays true until Next has rendered the new page. A full load has no transition: a flag holds `pending` from the press until the browser unloads the page, and a `pageshow` from the back-forward cache drops it, so Back does not land on a skeleton. A provider already above, the workshop's, is kept rather than shadowed.
