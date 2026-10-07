# Pager

`src/components/Pager/` — a paged list's Prev and Next (M5.6), on the
`.pager` primitive ([`styling.md`](../styling.md), "Buttons"). CategoryList
and UserList are its first two owners. Every list pages through the M3.6
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
  CategoryList passes it, and UserList does not count its rows yet.
- **Named "Prev" and "Next"**, the chevrons `aria-hidden` beside them in
  `.pager__mark` spans.
- **`soft` is the list's choice.** CategoryList's page guards itself on
  every render, so a soft navigation is enough, and opening its modal works
  the same way. UserList keeps plain anchors, whose full load also runs the
  admin layout's guard again, as AdminNav does.
- **A `nav` named "Pages"**, holding a bare `ul` of the two ends.

## Styling

Entirely the `.pager` primitive: a centred, wrapping row of two full-size
`.btn--quiet` buttons, with chevrons at 1.5em. `index.scss` holds nothing of
its own.

## Testing

`tests/components/Pager/index.test.tsx`. Each list's own test checks that the
list passes its pages through.
