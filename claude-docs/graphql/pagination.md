## Pagination

Every list query paginates through one helper (CLAUDE.md rule 8): cursor-based,
25 rows by default, and never more than 100. A client asking for more gets 100,
with no error, whether it wrote `first: 1000` or `first: $n`. Each later task
that adds a list query adopts it in its own PR, and the guard below makes
forgetting fail in that PR.

```ts
builder.queryField('compendium', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: { query: t.arg.string({ required: false }) },
    resolve: (_root, { query }, page) => listCompendium({ query }, page),
  }),
);
```

The field is a Relay connection. `@pothos/plugin-relay` builds the
`<Parent><Field>Connection` and `…Edge` types and a shared `PageInfo`, and adds
`first`, `after`, `last` and `before`. Edges and nodes are non-null. The plugin's
`Node` interface, global ids and `node`/`nodes` queries are switched off, so
an id is still the row's own uuid. Its offset-based helpers
(`resolveOffsetConnection`, `resolveArrayConnection`) are not used.

It runs in three layers, so the transport, the service and the repository
each keep to their own rules:

- **`src/lib/pagination.ts`** is pure. It holds the two numbers and
  `resolvePage`, which decodes the cursors and clamps the size with
  `@pothos/core`'s `parseCursorConnectionArgs`. It then asks for one row more
  than the page, because the extra row says whether another page follows, and
  builds `edges` and `pageInfo` from the answer. The `Cursor`, the
  `PageRequest` a finder is asked for and the page shapes are in
  `src/lib/types.ts`, which imports nothing, so a service names them without
  importing any runtime code.
- **`t.pagedConnection`** in `src/graphql/pagination.ts` is added to every
  field builder, the same way the Relay plugin adds `t.connection`.
  `builder.ts` imports it for that side effect. Its `resolve` receives a
  decoded, clamped `PageRequest`, never the client's `first` or `after`, so
  no resolver can skip the maximum or read a cursor as an offset.
  `edgeFields` declares fields on the edge beside `cursor` and `node`, each
  resolved from what the finder carried on its entry — `resolvePage` copies
  everything an entry holds but its cursor onto the edge. The compendium's
  `score` is the one so far. `count` adds `totalCount` and `countBefore` to
  the connection (below).
- **`findPage` and `findPageInWorkspace`** in the repository run the keyset
  query, and `findPageCount` counts a `findPage` list
  (claude-docs/db/keyset-pages.md, "Keyset pages").

**A cursor is the sort key and the id, never an offset**: base64url of
`{"k": [<part>, …], "i": <id>}`, one part per sort part. An offset moves when
a row is inserted or deleted ahead of the reader, and a key does not. Each part
is the text Postgres prints for the value. A `timestamptz` read into a JS `Date` keeps milliseconds and
loses microseconds, and a cursor built from it would replay every row in that
millisecond. A malformed cursor, or one whose key will not cast to the sort
column's type, or has a different number of parts from the list's sort, is
`InvalidCursor` from `src/lib/errors.ts`. `t.pagedConnection`
turns that into an `Invalid cursor` GraphQL error. It is never treated as "from
the start", which would return a page the client did not ask for.

**Page numbers: `totalCount` and `countBefore`** (MB.105). A connection
declared with `count` carries two more fields beside `edges` and `pageInfo`:

```graphql
type QueryCompendiumConnection {
  edges: [QueryCompendiumConnectionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int! # the rows the list holds under the field's arguments
  countBefore: Int # how many of them come before this page's first edge; null on an empty page
}
```

- **The client derives "Page X of Y".** For a page of `size` rows, the page
  is `floor(countBefore / size) + 1` and the number of pages is
  `max(1, ceil(totalCount / size))`. The admin pages, which read services
  rather than the connection, do it once in `resolveNumberedPage`
  (`src/lib/pagination.ts`), which reads a page through `resolvePage` and
  counts it from its first row (MB.132). "Showing 11–20 of 26" is
  `countBefore + 1` to `countBefore + edges.length` of `totalCount`.
- **A count, so it has no base to guess.** The first page's `countBefore` is
  0 because no rows come before it. The name is not `startIndex`: Google's
  JSON style guide defines `startIndex` as one-based and OpenSearch counts it
  from 1 by default, and a client reading ours that way would label every
  range one short.
- **Last asks for `last: totalCount % size || size`**, not `last: size`.
  With 287 rows at 25, `last: 25` returns the final 25 rows, which have 262
  rows before them, so it would read as page 11 of 12. `last: 12` has 275
  before it and reads as page 12, the same page Next walks to. First is `first: size`, Prev
  `last: size, before: startCursor` and Next `first: size, after: endCursor`.
- **A position, never an offset.** `countBefore` is counted from the page's
  first key and is never used to find a page, so the cursor rule above
  stands. A row inserted ahead of the reader mid-walk shifts the label by
  one; the pages it walks are unchanged.
- **No numbered jump links.** Jumping to page 7 needs the cursor that opens
  it, which means ranking every match on every request, and it ties the pager
  to one page size ([`mb.105-plan.md`](../design-decisions/mb.105-plan.md)).
- **One count per connection, and only when asked for.** The `count` option
  is a resolver of its own, `(parent, args, start, context)`, handed the
  page's first cursor decoded, or none on an empty page. The connection
  object carries it memoised, so selecting both fields runs one count and
  selecting neither runs none. The compendium's typeahead (M8.10) is the first
  page of the same search and selects neither.
- **Priced as `pageInfo` is**: each field is one under the connection, at the
  page size, whatever the count reads.

**Depth.** A connection costs two levels, `edges` and `node`, on top of its
field. A root connection holding one nested connection therefore uses all
seven levels: `{ a { edges { node { b { edges { node { name } } } } } } }`. A
list nested on an object stays a bare list, as DESIGN.md §7 sketches, and is
bounded by its parent.

**Cost** is priced at the page each connection will fetch
(["Protections"](protections.md)).

**The guard.** `tests/guards/pagination.test.ts` fails:

- a `Query` field that returns a bare list;
- a `*Connection` field without `first` and `after`;
- a `.connection(` call anywhere in `src/` except `src/graphql/pagination.ts`,
  untracked files included.

It also proves that the first two checks can fail, by running them against a
throwaway schema.

The tests: `tests/lib/pagination.test.ts` covers the numbers, the clamp and the
cursor codec. `tests/graphql/pagination.test.ts` covers the field over the
transport and its pricing, the count fields included. `tests/db/pagination.test.ts` covers the keyset
walk.
