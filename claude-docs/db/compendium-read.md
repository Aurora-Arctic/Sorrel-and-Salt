## The compendium read (M8.5)

The compendium is the public surface (MB.80), so its reads take no proof and
no session. Three services in `ingredients`' `services/compendium.ts` and one
in `vocabulary`'s `services/ingredient-form-values.ts` sit over four
finders, the three that read the compendium tier named on
[the tier seam](../modules.md#the-tier-seam).

**`findCompendiumPage(filter, page)`** is one keyset page of the compendium
under an `IngredientFilter`, every part optional and absent meaning no filter.
A search pages best match first, `(score DESC, name, id)`, and a list without
one pages `(name, id)`; each entry carries a `score`, null on the second:

- **`query`** is word similarity, case- and accent-folded, against the display
  name, the formal name or a live folk name:
  `unaccent_immutable($query) <% unaccent_immutable(column)`, true when the query
  is at least **0.5** word-similar to some run of the text. That forgives a
  transposed pair (`mugwrot` is exactly 0.5 to Mugwort), matches a
  two-letter prefix as it is typed (`mu`, 0.67), and reads across
  punctuation (`devils shoestring`, 0.8), where pg_trgm's own 0.6 misses the
  typo. A query of punctuation alone has no trigrams and matches nothing.
  pg_trgm's GIN answers `<%` when the text side is the index's own
  expression, which is what `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm` (migration 0027) are for, and
  `unaccent_immutable` (0026) is the `IMMUTABLE` wrapper an expression index
  needs; `ingredients-unaccent.test.ts` proves by `EXPLAIN` that each
  predicate reaches its index. The three matches are a `UNION ALL`, the
  shape ["Fuzzy matching"](fuzzy-matching.md) argues for over an `OR` beside
  the scope.
- **The score is the row's best word similarity** across the three, and it is
  the search's order. Each `UNION ALL` arm selects
  `word_similarity(query, text)` beside the id it matched — the value the GIN
  recheck has just computed to test `<%` — and the union is folded to
  `max(score) … group by id` and joined to `ingredients` as `matched`. So the
  score is a plain column, read by the order, the page bound and the edge
  alike, once per matched row. The alternative, a `greatest(…)` over the three
  with a correlated subquery for the folk names, is a `SubPlan` that a page
  bound evaluates against every compendium row. `compendium-search-query.test.ts`
  runs `EXPLAIN ANALYZE` on the statement the finder sends, over ~20,000
  entries and as many folk names under `enable_seqscan = off`: the first page
  and the page after a cursor both start from `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm`, with no `SubPlan` and no sequential
  scan, and the test prints the ranked and unranked timings — about 7 ms and
  5 ms when it was written.
- **A keyset, not a capped top-N or pg_trgm's `<<->`.** A top-N would leave
  every match past the cap unreachable and give a search a different shape
  from a browse, against rule 8. `<<->` is a nearest-neighbour order: it needs
  a GiST index where these are GIN, orders by one text where the score is the
  best of three, and cannot resume after a cursor. The key is `[-score, name]`
  plus the id — negated so one ascending row comparison bounds it, and `real`,
  as `word_similarity` returns it, because a `real` prints shortest-exact and
  its cursor text casts back to the same value (`1 - score` would promote to
  `double precision`). A browse's cursor has one part and a search's two, so
  neither is a position in the other, and each is `InvalidCursor` there.
- **The 0.5 is set by `selectFrom`, as every threshold is.** The finder marks
  its keyset `wordMatch` when there is a query, and `selectFrom` then reads the
  page in a transaction that sets `pg_trgm.word_similarity_threshold` with
  `set_config(…, true)` first — the similarity branch's shape, on the keyset
  branch. `compendium-search-query.test.ts` reads the statements sent: the
  setting before the match, and no transaction for a page with no query.
- **`categoryIds`** is AND: one correlated `existsIn(ingredient_categories, …)`
  per id, so an entry must carry every one. OR is M8.12's argument to add.
- **`form`** compares `lower(btrim(…))` on both sides, the fold
  `canonical_key` uses.

Names order under the database's own collation (`en_US.utf8` in the image).
M8.14's `(lower(name), canonical_key, id)` declares its parts on the same
keyset mechanism (["Keyset pages"](keyset-pages.md)). Moving a cursor's sort
is harmless, since a cursor lives only as long as the page it came from.

**`findCompendiumCount(filter, start)`** (MB.105) numbers those pages: how
many entries the filter holds, and how many precede `start`, a page's first
row — the count mode of ["Keyset pages"](keyset-pages.md). It and
`findCompendiumPage` each
state the tier and the soft-delete filter, since the tier seam and the
soft-delete guard read each exported finder, and both take the filter's arms
and the key from one private `compendiumList(filter)`, so the count reads
exactly the rows the pages hold. On a search that means the join and the 0.5:
counted at the server's 0.6, `mugwrot` (0.5 to Mugwort) would count none of
the rows its pages list. `compendium-search-query.test.ts` reads the one
statement sent, after the setting, with no order and no limit.

**The service treats a query shorter than two characters as absent**
(`MIN_QUERY_LENGTH` in `validation/compendium-filter.ts`, counted in composed
code points). One letter shares a trigram with half the compendium at 0.5, so
it would filter and rank by noise; below the minimum the list is a browse,
unfiltered and unranked. The finder takes whatever it is handed, one
character included.

**`findOneIngredient(memberships, id)`** is one live row in the compendium or
in a coven one of the proofs names, in the shape of `findManyOfIngredients`. No
proofs reads the compendium alone, which is how a signed-out request reads it,
and a coven's row asked for without its proof is `undefined`, the same answer
as an id that names nothing.

**`findIngredientFormValues(page)`** is one keyset page of the curated form
vocabulary in `(name, id)` order: the live forms whose group is live too, which
is what curated means to `findVocabularySuggestions` as well, with the group's
`deleted_at` read by `existsIn`. **`findCategoryPage(page)`** (M5.6) reads the
categories the same way, a live category under a live group, behind the
public `categories` query, and **`findCategoryCount(start)`** counts them
under the same filter and key, as `findCompendiumCount` counts the
compendium.

**The services parse ids first.** `listCompendium` and `countCompendium` run
their filter through `CompendiumFilter` (Zod, in `validation/compendium-filter.ts`) and
`getIngredient` checks its id the same way, and the reason is `selectFrom`'s
keyset branch: it maps every SQLSTATE class-22 error to `InvalidCursor`, on the
premise that the cursor is the only client text a page query carries. A
category id compared to a `uuid` column is client text too, so a malformed one
is refused before the query or it would come back as "Invalid cursor". The
check is `z.guid()`, not `z.uuid()`: Postgres's `uuid` takes any version and
variant, and the seed's hand-written ids are not RFC-shaped. `getIngredient`
takes an optional `workspaceId`; with one it asks
`assertMembership(…, { ingredient: ['read'] })` — a signed-out caller, a site
admin and a non-member get `Forbidden` — and reads both tiers, without one it
reads the compendium alone, and a miss is `NotFound` either way.

## The ingredient picker's search (MB.138)

**`findIngredientSuggestions(membership, query, page)`** is what a coven's
substitute picker reads, behind `ingredientSuggestions`
([`graphql/schema.md`](../graphql/schema.md)) and the `ingredients` service
`suggestIngredients`. It offers exactly what a coven's substitute may link
(DESIGN.md §5, `ingredient_substitutes`): live entries of the compendium and
of the proof's workspace, never another, so it is on
[the tier seam](../modules.md#the-tier-seam).

- **It is `findCompendiumPage` under a wider scope.** It takes the same
  private `compendiumList({ query })`, so the match is the compendium
  search's: word similarity at 0.5 against the label, the formal name and the
  live folk names, accent-folded, best match first, with a blank query
  listing by `(name, id)`. The service parses the query through
  `CompendiumFilter`, so a query under `MIN_QUERY_LENGTH` is a blank one here
  too. Only the tier predicate differs: `workspace_id IS NULL OR
workspace_id = <the proof's>`.
- **Not `findSimilarIngredients`.** That one answers whether a whole name is
  nearly one already there, by `%` at 0.4, and a typed fragment is far under
  it: `mu` is 0.22 similar to Mugwort and 0.67 word-similar. Not
  `findCommonNameSuggestions` either, which answers with strings, while a pick
  writes an ingredient's id.
- **The plan is the compendium search's.** The scope is read on
  `ingredients` after the match has joined, so the statement still starts
  from both expression indexes. `compendium-search-query.test.ts` runs it
  over the same ~20,000 rows and asserts it, and asserts the threshold is set
  before the match and the proof's workspace is in the statement.
- **No local-beats-compendium suppression yet.** A coven entry and the
  compendium entry it shadows are both offered until M8.3 builds the
  suppression, which applies here as it does to every workspace result.
