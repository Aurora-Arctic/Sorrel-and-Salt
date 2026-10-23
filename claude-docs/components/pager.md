# Pager

`src/components/Pager/` — a paged list's Prev and Next (M5.6), on the
`.pager` primitive ([`styling.md`](../styling.md), "Buttons"). The category
list and UserList were its first two owners, the forms' list its third and
the celestial bodies' list its fourth; the grouped and flat lists are now one,
[`GroupedValueList`](grouped-value-list.md) (MB.132, MB.115). Every list pages through the M3.6
cursor helper (rule 8), so every list that shows its pages shows them here.

## Props

`PagerProps` (`types.ts`):

| Prop           | What it is                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| `previousHref` | The page before this one; Prev is disabled without it                            |
| `nextHref`     | The page after this one; Next is disabled without it                             |
| `position`     | `{ page, pages }`, shown between the ends as "Page 2 of 3"; none when uncounted  |
| `soft`         | `next/link`'s soft navigation; a plain anchor's full load when left out or false |

## Contracts

- **An end with no page is disabled, not hidden** (the owner's call). On the
  first page Prev is off, and on the last page Next is. Prev stays first and
  Next second, so neither moves from one page to the next.
- **A list of one page has no pager**, since both ends would be off.
- **A disabled end is a link with no address**: an `<a>` with
  `role="link"`, `aria-disabled="true"` and no `href`. An anchor takes no
  `disabled`, and `.btn` draws `aria-disabled` as off: dashed and faded.
  Nothing can follow it, and it still reads as the pager's Prev or Next.
- **"Page X of Y" sits between the ends** when the list is counted, in the
  muted ink, as text rather than a control. The owner reads it as DESIGN.md §7
  computes it for the compendium: page `floor(countBefore / size) + 1` of
  `max(1, ceil(totalCount / size))`, counted from the page's first row.
  GroupedValueList, CompendiumList, GroupList, PrivilegeLedger,
  AdminInvitations and UserList pass
  it, each page computing it through `resolveNumberedPage`
  (`src/lib/pagination.ts`, MB.132).
- **Named "Prev" and "Next"**, the chevrons `aria-hidden` beside them in
  `.pager__mark` spans.
- **`soft` is the list's choice.** GroupedValueList's pages guard themselves on
  every render, so a soft navigation is enough, and opening its modal works
  the same way. UserList, PrivilegeLedger and AdminInvitations keep plain anchors for their pagers, whose full load also runs the
  admin layout's guard again, as AdminNav does; their filters are soft, since every page under `/admin` runs the guard itself.
- **The end followed puts the list's loading state up** (the owner's call
  at MB.115's review, replacing MB.178's spinner in the end's chevron): the
  pager renders inside its list's [`ListFrame`](list-frame.md), and a
  plain left click opens the end's page through it, as the filter does, so
  the list's body, this pager included, is the tabs' skeleton and the filter
  row is off until the page renders. A soft end is `next/link`, so Next
  still prefetches its page, and it pushes without Next's scroll to the page
  top, bringing the start of the list into view instead (the frame's `page`
  kind); a plain end is a bare anchor. How each
  navigates, and how Back after a full load avoids a skeleton, is the
  frame's ([`list-frame.md`](list-frame.md#contracts)). A
  modified or middle click opens the page elsewhere and leaves the list as
  it is. The live end is `pager-link.tsx`'s one client component; the
  disabled end stays a server render, sharing `end-content.tsx` with it.
  `useListNavigation` throws outside a `ListFrame`, so a pager is never
  drawn without one.
- **A `nav` named "Pages"**, holding a bare `ul` of the two ends.

## Styling

Entirely the `.pager` primitive: a centred row of two full-size
`.btn--quiet` buttons, with chevrons at twice the label. It stays on one
line at every width (the owner's call at MB.115's review): on a pager
narrower than `$pager-tight-width`, 23rem, the ends' padding narrows and
"Page X of Y" loses the room either side of it, which holds Prev, the
position and Next together down to a 320px screen. Each chevron sits in
`.pager__mark`, a box a label's em wide, so either guillemet leaves its
button the same size. `index.scss` holds nothing of its own.

## Stories

[`index.stories.tsx`](../../src/components/Pager/index.stories.tsx), `Layout /
Pager`, each in a `ListFrame`, which holds the navigation a pager reads:
`States`, a grid of First Page, with Next only; Middle Page, with both and the position
`2 of 3`; and Last Page, with Prev only.

## Testing

`tests/components/Pager/index.test.tsx` owns paging for every list: both ends
linked, the end with no page disabled in place, the position between them,
nothing for a lone page, and an end followed: a status in place of the list
and the pager until a soft end's page arrives, through
`tests/support/navigating.tsx`, which holds a mocked `push` pending as the
App Router does until its `arrives` settles; a plain end's full load until
a `pageshow` from the cache; and a modified click leaving the list be. Each
renders the pager in a `ListFrame` beneath a table. A list's own test
asserts only the hrefs it builds.
