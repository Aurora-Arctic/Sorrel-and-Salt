# Pager

`src/components/Pager/` — a paged list's Prev and Next, on the
`.pager` primitive ([`styling.md`](../styling.md), "Buttons"). Every list pages through the M3.6
cursor helper (rule 8), so every list that shows its pages shows them here. `soft` chooses
`next/link`’s soft navigation; left out or false, an end is a plain anchor with a full load.

## Contracts

- **An end with no page is disabled, not hidden**, so Prev stays first and Next second and neither
  moves from one page to the next. **A list of one page has no pager**, since both ends would be off.
- **A disabled end is a link with no address**: an `<a>` with
  `role="link"`, `aria-disabled="true"` and no `href`. An anchor takes no
  `disabled`, and `.btn` draws `aria-disabled` as off: dashed and faded.
  Nothing can follow it, and it still reads as the pager's Prev or Next.
- **"Page X of Y" sits between the ends** when the list is counted (`position` is none when it is
  not), as text rather than a control. DESIGN.md §7
  computes it for the compendium: page `floor(countBefore / size) + 1` of
  `max(1, ceil(totalCount / size))`, counted from the page's first row.
  GroupedValueList, CompendiumList, GroupList, PrivilegeLedger,
  AdminInvitations and UserList pass
  it, each page computing it through `resolveNumberedPage`
  (`src/lib/pagination.ts`).
- **`soft` is the list's choice.** GroupedValueList's pages guard themselves on
  every render, so a soft navigation is enough, and opening its modal works
  the same way. UserList, PrivilegeLedger and AdminInvitations keep plain anchors for their pagers, whose full load also runs the
  admin layout's guard again, as AdminNav does; their filters are soft, since every page under `/keepers` runs the guard itself.
- **The end followed puts the list's loading state up** (the end carries no spinner): the
  pager renders inside its list's [`ListFrame`](list-frame.md), and a
  plain left click opens the end's page through it, as the filter does, so
  the list's body, this pager included, is the tabs' skeleton and the filter
  row is off until the page renders. A soft end is `next/link`, so Next
  still prefetches its page, and it pushes without Next's scroll to the page
  top, bringing the start of the list into view instead (the frame's `page`
  kind). How each navigates, and how Back after a full load avoids a skeleton, is the
  frame's ([`list-frame.md`](list-frame.md#contracts)). A
  modified or middle click opens the page elsewhere and leaves the list as
  it is. The live end is `pager-link.tsx`'s one client component; the
  disabled end stays a server render, sharing `end-content.tsx` with it.
  `useListNavigation` throws outside a `ListFrame`, so a pager is never
  drawn without one.
- **A `nav` named "Pages"**, holding a bare `ul` of the two ends; the chevrons are `aria-hidden`.

On a pager narrower than `$pager-tight-width` (23rem) the ends' padding narrows and "Page X of Y" loses the room either side of it, which holds Prev, the position and Next together on one line down to a 320px screen.

Stories put each in a `ListFrame`, which holds the navigation a pager reads. The test owns paging for every list through `tests/support/navigating.tsx` (it holds a mocked `push` pending as the App Router does until its `arrives` settles); a list’s own test asserts only the hrefs it builds.
