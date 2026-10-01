## Keyset pages (M3.6)

A list that can grow is read one page at a time (CLAUDE.md rule 8). The finder
is `findPage(table, sort, page, where?)`, or
`findPageInWorkspace(membership, table, sort, page, where?)` for a
workspace-scoped table. `sort` is a list of parts, each ascending. Each finder
ANDs the same soft-delete and workspace predicates as `findMany` and
`findManyInWorkspace`, and adds a keyset bound:

```sql
where … and (a, b, id) > (cast($a as <a's type>), cast($b as <b's type>), cast($id as uuid))
order by a, b, id
limit $limit  -- the page plus one
```

- **`page` is a `PageRequest` from `src/lib/types.ts`**, already decoded and
  clamped by `resolvePage` (claude-docs/graphql/pagination.md, "Pagination").
  `after` bounds from below and `before` from above. `inverted`, when walking
  backwards with `last`, reverses the `ORDER BY` only, and `resolvePage` puts
  the rows back in order.
- **A part is a column, or an expression with the type it is read as**
  (`SortPart`: `leaves.name`, or `{ expression, type: 'real' }`). An expression
  is read as `cast(expression as type)` in the order, the bound and the key
  alike, so the declared type is the one compared: `length(name)::real / 3` is
  `double precision`, and ordered raw against a `real` cursor it would replay
  rows. A descending part is written negated, so one row comparison serves.
  The compendium search's `[-score, name]` is the first computed key. The
  duplicate lookup's is the same shape over trigram similarity (MB.11), and
  M8.14's `(lower(name), canonical_key)` is the next.
- **Each row comes back with its cursor.** The key is selected as an array of
  each part cast to text, and compared by casting each back to its part's
  type (`getSQLType()` for a column), so Postgres compares a `timestamptz` to
  the microsecond. A key read through a JS `Date` would lose the microseconds
  and replay rows.
- **A cursor whose key has the wrong number of parts is `InvalidCursor`**,
  thrown by `pageBounds` before any read: it is a position in some other
  list.
- **A page may join one relation and carry values onto its entries.**
  `Keyset.join` is a parenthesised, aliased statement and its `on`, which a
  sort part or the `where` may read; `Keyset.carry` names values selected
  beside the row, which `resolvePage` puts on the edge. The compendium search
  joins its scored matches and carries the score this way, and the duplicate
  lookup carries its correlated score (MB.11).
- **A carried value is selected one `sql` layer deeper than it is written.**
  In a select with no join, Drizzle renders a column written directly in a
  selected expression without its table name (`buildSelection`'s
  `isSingleTable`). So the duplicate score's folk-name subquery,
  `… where folk.ingredient_id = ingredients.id`, would render as
  `where "ingredient_id" = "id"` and compare the folk-name table with itself.
  Only an expression's own top-level columns are unqualified, so the wrapper
  keeps every name, but it also drops a `mapWith`. A carried value is
  therefore read as the driver returns it. `ORDER BY` and `WHERE` are not
  built that way, which is why the order was right while the selected score
  was not.
- **The id breaks ties**, so rows sharing a sort key still sit in one total
  order, and a page boundary between two of them loses neither. Every table
  these finders take has an `id` (`Identified`), which rules out the two
  hard-deleted join tables; `spell_ingredients` has one, and its `spell_id`
  is what refuses it.
- **A sort column must be `NOT NULL`**, by type. A NULL makes the row
  comparison NULL, and that row would fall out of every page. An expression's
  nullness is not in its type, so a nullable one is the caller's bug.
- **A cursor that will not cast** (SQLSTATE class 22) throws `InvalidCursor`.
  The cursor is the only client text in a page query, so a data exception
  there can only come from it.
- The query goes through the private `selectFrom`, which has an overload that
  adds the key column, the order and the limit. The one-builder invariant of
  `soft-delete-finder-guard.test.ts` therefore holds. `findPageInWorkspace` is
  one of that guard's `SCOPED_FINDERS`.

**A keyset list can be counted as well as paged** (MB.105), for a
connection's `totalCount` and `countBefore` (claude-docs/graphql/pagination.md,
"Pagination"). `selectFrom`'s count mode takes a `KeysetCount` — the list's
`KeyOrder` and a `start` cursor, the page's first row — and sends one
statement:

```sql
select count(*), count(*) filter (where (a, b, id) < (cast($a as …), cast($b as …), cast($id as uuid)))
from … [join …] where …   -- no order, no limit
```

- **`KeyOrder` is what a page and its count share**: the sort parts, the id,
  the join and the two threshold flags, `wordMatch` and `similarityMatch`.
  `Keyset` is a `KeyOrder` plus the page's `request` and `carry`. A finder
  builds its `KeyOrder` once, in one function, and hands it to both reads, so
  the count cannot drift from the pages it numbers.
- **The `where` is the page's without `pageBounds`.** The second count uses
  the same row comparison a `before` bound does, built by the same two helpers
  (`rowKey`, `cursorKey`), so "before the first row" means what the page's
  order means. With no `start` — an empty page — the second number is null.
- **It runs under the key's threshold.** Both reads go through `readKeyed`,
  so a `wordMatch` count sets 0.5 in its own transaction as the page does.
- **A position, not an offset.** The count labels a page and never seeks one,
  so a cursor stays a key.

A spell's page, the counterpart of `findManySpells` under the visibility rule,
is added by the grimoire task that first needs it, as its own finder, like
the other spell finders.

A page over rows no one table holds writes its own bounds under the same
rules: `findVocabularySuggestions` and `findCommonNameSuggestions` key a
statement by `[tier, fold]` and a tie-break
(["The member's autofill"](member-autofill.md)). That page is read under the
similarity thresholds, whose branch maps no data exception to `InvalidCursor`,
so `readSuggestionPage` checks the key's two parts and the tier itself before
building the bound.

`tests/db/pagination.test.ts` walks probe tables through `resolvePage` and the
real finders:

- every row once and in order, at page size 25 and at 7, with 7 placing page
  boundaries between tied keys;
- stability when rows are inserted before and after the cursor and
  soft-deleted mid-walk, including the row the cursor names;
- a backward walk;
- nine timestamps a microsecond apart;
- a compound, computed key — a negated `real` fraction, then the name — with
  ties on either part, forwards and backwards, and the key as Postgres prints it;
- workspace scoping, with the other workspace's rows present;
- the cursor refusals: a key that will not cast, an id that is not one, and a
  key with the wrong number of parts.
