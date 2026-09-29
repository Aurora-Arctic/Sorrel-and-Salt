# Page numbers on the compendium, and where the typeahead comes from

## Context

During MB.104 the owner asked two questions: what it would take to show page numbers on the compendium, and whether the compendium's response carries all the usual data for a paginated response.

**The response.** `compendium` returns the full Relay set: `edges { cursor node }` and `pageInfo { hasNextPage hasPreviousPage startCursor endCursor }`. It lacks three extras that many APIs add beyond the specification:

- **`totalCount`.** No count exists anywhere in the codebase.
- **A `nodes` shortcut.** The owner declined it. It saves one level of nesting and nothing else. The search score lives on the edge, not the node, so a search view would still need `edges`. It would also need the same pricing override `edges` carries, or the cost limit would count the page twice.
- **An exact `hasPreviousPage` on a forward walk.** Pothos reports it as "an `after` cursor was given" rather than looking. `hasNextPage` on a backward walk is the mirror image. The specification permits both, and neither matters to a pager.

**Why page numbers are not free.** The number of pages is `ceil(totalCount / size)`, which needs only a count. The page number is the hard part. The compendium is keyset-paged, and DESIGN.md §7 says a cursor is "never an offset". A page therefore knows where it is in the sort order but not how many rows come before it.

## Decisions

**"Page X of Y", with First, Prev, Next and Last links.** This is MB.105. The connection gains two fields:

- `totalCount`: the rows the list holds under its filter.
- `startIndex`: how many of those rows come before this page's first edge. It is counted with the page's own row comparison, so it is derived from a key and never used to seek.

Two alternatives were weighed and not taken:

- **A count alone** ("287 ingredients · 12 pages") never says which page is showing.
- **Numbered jump links** ("1 2 3 … 12") need the cursor that opens every page. That means ranking every matching row on every request. It ties the pager to one page size, grows the payload with the list, and adds a second way of navigating the list for DESIGN.md to explain alongside the cursor rule. It also buys less than it seems: MB.84's sitemap lists every entry page directly, so no entry depends on a crawler walking the list. Jump links remain additive later, built on `startIndex`.

**The search box's typeahead is the first page of the ranked search.** The owner wanted the typeahead to return the top 25 and not paginate.

- **Considered and rejected: a separate query.** A plain `[Ingredient!]!` field, capped by the API, was weighed. It would have needed a `t.typeahead` helper, an exception to CLAUDE.md rule 8 and to the pagination guard, and a follow-up task moving the four autofill queries over to match.
- **What that would buy:** an API that cannot be paged.
- **Why that is not needed:** `compendium(search:, first: 25)` already returns the 25 best matches once MB.104 ranks them. "Top 25, not paginated" is then the dropdown's behaviour: it follows no cursor.
- **Two properties come for free:**
  - `pageInfo.hasNextPage` says when to offer "See all results".
  - The dropdown is always exactly what "See all" opens on, because it is the same statement.
- **Where it is recorded:** M8.10, amended in place. Rule 8, the pagination guard and the autofill queries are unchanged.

## Order

MB.105 sits in Wave 8 as `M8.5 · MB.104 · MB.105 · M8.8`.

- **It follows MB.104.** The count and the `startIndex` bound reuse MB.104's multi-part keyset and its search join, and the `count` option sits beside MB.104's edge fields in `pagedConnection`.
- **It precedes M5.5.** `/admin/compendium` is the first list to read `compendium`.
- **It precedes M8.6.** The cache then wraps the count along with the page, rather than a later task retrofitting a second cached read.
- **It lands well before M8.18,** which renders the pager in Wave 12.

## MB.105's mechanism

**The count option.**

- `pagedConnection` gains an optional `count`. It is emitted as `totalCount: Int!` and `startIndex: Int` through the Relay plugin's connection options.
- Both fields share one memoised call per connection, so selecting both runs one query and selecting neither runs none. The typeahead selects neither.

**The count statement.**

- It is one statement: `count(*)` beside `count(*) filter (where <row> < <first edge's key>)`.
- It is built by a count mode on `selectFrom` over the page's own `where` and search join, with no order and no limit, and adds no new `.select(`.
- The keyset is built once and shared by the page and the count, so the two cannot drift.
- On a search the count runs under the page's word-similarity threshold of 0.5. Read at the server's 0.6, it would count fewer rows than the pages hold.

**Pricing.** It is priced as `pageInfo` is, at the page size.

**The client's formula**, recorded in graphql.md when MB.105 lands:

- The page is `floor(startIndex / size) + 1`.
- The number of pages is `max(1, ceil(totalCount / size))`.
- **Last asks for `last: totalCount % size || size`.** With 287 rows, `last: 25` would return rows 263 to 287. That page's `startIndex` is 262, so it would read as page 11 of 12. Asking for the remainder instead ends on the same page Next walks to.
