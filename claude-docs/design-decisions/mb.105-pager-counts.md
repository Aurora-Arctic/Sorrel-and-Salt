# MB.105 — The pager counts, and the typeahead is the first page of a search

**Status:** decided. The mechanism lives in `claude-docs/graphql/pagination.md` and `claude-docs/db/keyset-pages.md`.

## Decision

A paged connection gains `totalCount` (rows under the filter) and `countBefore` (rows before this page's first edge, 0 on the first page). `countBefore` uses the page's own row comparison; it is derived from a key and never used to seek, because a cursor is never an offset. The pager reads "Page X of Y" with First, Previous, Next and Last links.

The search box's typeahead is `compendium(query:, first: 25)`: the first page of the ranked search, not paginated by the dropdown, which follows no cursor. `pageInfo.hasNextPage` says when to offer "See all results", and the dropdown is always exactly what "See all" opens on.

## Rules out

- `startIndex`: a client may read it as one-based. The field is named as a count, `countBefore`.
- A `nodes` shortcut: it saves one nesting level, the search score lives on the edge so a search view still needs `edges`, and it would need the same pricing override or the cost limit counts the page twice.
- An exact `hasPreviousPage` on a forward walk (and the mirror case): the specification permits Pothos's "a cursor was given" answer and no pager needs more.
- A count alone ("287 ingredients · 12 pages"): it never says which page is showing.
- Numbered jump links: they need the cursor opening every page, which ranks every matching row on every request, ties the pager to one page size and adds a second way to navigate. They remain possible later on top of `countBefore`.
- A separate typeahead query, a plain `[Ingredient!]!` field capped by the API: it needs a `t.typeahead` helper, an exception to the pagination rule and guard, and a follow-up moving the autofill queries over, to buy an API that cannot be paged.
