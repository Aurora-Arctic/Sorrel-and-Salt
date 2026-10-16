## The compendium read (M8.5)

The compendium is the public surface (MB.80), so its reads take no proof and
no session. Three services in `ingredients`' `services/compendium.ts` and one
in `vocabulary`'s `services/ingredient-form-values.ts` sit over four
finders, the three that read the compendium tier named on
[the tier seam](../modules.md#the-tier-seam).

**`findCompendiumPage(filter, page)`** is one keyset page of the compendium
under an `IngredientFilter`, every part optional and absent meaning no filter.
A search pages best match first, `(score DESC, position, name, id)`, the
position being where the entry's best field holds the typed text, and a list
without one pages `(name, id)`; each entry carries a `score`, its rank, null
on the second:

- **`query`** is word similarity, case- and accent-folded, against the display
  name, the formal name, a live folk name, or the form or description of a
  live variant (MB.218):
  `unaccent_immutable($query) <% unaccent_immutable(column)`, true when the query
  is at least **0.5** word-similar to some run of the text. That forgives a
  transposed pair (`mugwrot` is exactly 0.5 to Mugwort), matches a
  two-letter prefix as it is typed (`mu`, 0.67), and reads across
  punctuation (`devils shoestring`, 0.8), where pg_trgm's own 0.6 misses the
  typo. A query of punctuation alone has no trigrams and matches nothing.
  pg_trgm's GIN answers `<%` when the text side is the index's own
  expression, which is what `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm` (migration 0027) and
  `ingredient_variants_unaccent_trgm` (0061) are for, and
  `unaccent_immutable` (0026) is the `IMMUTABLE` wrapper an expression index
  needs; `compendium-search-query.test.ts` proves by `EXPLAIN` that the
  statement the finder sends reaches all three (below), and
  `ingredients-unaccent.test.ts` keeps the two indexes' expressions, the
  wrapper's volatility and the fold (MB.184, MB.226). The matches are a `UNION ALL`, the
  shape ["Fuzzy matching"](fuzzy-matching.md) argues for over an `OR` beside
  the scope, of five arms, one per field: the entry's label, its formal name,
  its folk names, its variants' forms and its variants' descriptions. Each arm
  scores what it matched as the word similarity, or 1
  where the field holds the query verbatim, times the field's weight (the
  next bullet). A word in a form matches every entry
  holding that form, so a bare "oil" ranks each entry with an oil variant at
  0.6, below any entry whose own name holds the word; the form filter (M8.13)
  is the precise tool for that question, and the search is not.
- **The score is the row's best weighted word similarity** across the
  arms, and it is the search's order, its rank. Each field the search reads
  carries a weight, `SEARCH_WEIGHTS` beside `searchMatch` in
  `src/db/repository/ingredients.ts` (MB.115):

  | Field                        | Weight | Why                                                              |
  | ---------------------------- | ------ | ---------------------------------------------------------------- |
  | The label, `name`            | 1      | What the entry is called, the name a reader looks for            |
  | The formal name              | 0.9    | The entry's identity (MB.215), so just under its own label       |
  | A live folk name             | 0.8    | Still a name of this entry, though another entry can share it    |
  | A live variant's form        | 0.6    | A form word, Oil or Resin, is shared by every entry in that form |
  | A live variant's description | 0.2    | Prose, which names other things in passing                       |

  The weights fix a tie the unweighted score broke alphabetically. Searching
  "storax" matched both Storax, by its label, and Sweet Gum, whose folk name
  _American Storax_ and resin's description ("liquid storax") both hold the
  word whole, so both scored 1, tied, with only the name between them. Weighted, Storax is
  first at 1 and Sweet Gum below at 0.8. Every field has its own weight rather
  than the label alone taking a boost, because a boost on the label would
  still leave the formal name, a folk name, a form and a description tied
  with each other. The weight lowers the rank and never the match: a field
  matches at 0.5 or better, as above, so a form matching at 0.5 ranks at 0.3.

  **A field holding the typed text verbatim scores in full, 1, before its
  weight**, wherever the text falls in a word. Without that, the weights
  could put a lighter field above the label. `word_similarity` scores the
  query against whole words, by the share of the query's trigrams (its
  three-letter runs, padded with spaces at a word's edges) a run of the text
  holds. A fragment inside a longer word loses the trigrams that mark a
  word's start: "wood" in _Sandalwood_ shares 3 of its 5, `woo`, `ood` and
  `od␣`, so it scores 0.6, while the same letters as a word of their own,
  Cinnamon's folk name _Sweet Wood_, score 1. Weighted, the folk name ranked
  at 0.8 above Sandalwood's label at 0.6. With the rule, Sandalwood's label
  scores 1 and ranks first. The test is case- and accent-insensitive, as the
  similarity is: both sides go through `unaccent_immutable` and `lower`,
  and `strpos` finds the query in the text as plain text, so a `%` or `_`
  typed into the search needs no escaping, as it would in an `ilike`
  pattern. It is `foldedWordMatch`'s `contains`, beside its `matches` and
  `similarity`, in `src/db/repository/predicates.ts`. The rule changes the
  rank and never the match: the `where` is unchanged, so a fragment that
  does not reach 0.5 against the text is still not found, and the trigram
  indexes still answer the search. The reference picker's search scores its
  three fields the same way, without weights ([References](references.md)).

  **Among equal scores, the entry whose field holds the typed text earliest
  ranks first.** Searching "wood", the labels Wood Ash, Agarwood, Wormwood,
  Sandalwood and Red Sandalwood each hold the word verbatim, so each scores
  1, and by name alone Agarwood led and Wood Ash came fourth. So each arm
  also reports its field's position: the character the query starts at,
  found by the same folded `strpos` the containment rule uses
  (`foldedWordMatch`'s `position`). Wood Ash holds "wood" at 1, Agarwood and
  Wormwood at 5, Sandalwood at 7 and Red Sandalwood at 11, so they rank in
  that order, and the name breaks only the tie position leaves, Agarwood
  before Wormwood. A field that matched without holding the query — a near
  spelling, `mugwrot` against Mugwort — has no such character, and takes
  the largest `integer`, 2147483647, so it follows every verbatim hit at its
  score. It is a number rather than null because a null part makes the
  keyset's row comparison null, and the row would fall out of every page.

  The position is the field's that set the score. An entry whose label holds
  the query at 9 and whose folk name holds it at 1 ranks at 9, because the
  label is what ranked it; the folk name scored lower. That is why each field
  is an arm of its own, since an arm reading two fields would report one
  position for two scores, and why the fold takes
  `(array_agg(position order by score desc, position))[1]` — the best arm's
  position, the earliest among arms tied on score — rather than
  `min(position)`, which would take the folk name's 1 from an arm that
  ranked lower.

  Each arm reads one field, and selects
  `greatest(word_similarity(query, text), case when strpos(lower(text), lower(query)) > 0 then 1 end) * weight`
  and the field's position, each side folded through `unaccent_immutable`,
  beside the id it matched — the similarity being the value the GIN recheck
  has just computed to test `<%`; `greatest` skips the null of a
  containment test that failed. The arm's `where` is that field's own `<%`,
  so a field that did not match never reaches the rank. When a form and its
  description shared an arm, that took a `case` around each field: without
  it, a description matching at 1 beside a form at 0.45, short of the match,
  would have ranked at 0.27 by the form rather than 0.2 by the description
  that found it. The union is folded by `group by id` to `max(score)` and
  the best arm's position, and joined to `ingredients` as `matched`. So the
  score and the position are plain columns, read by the order, the page
  bound and the edge alike, once per matched row, and an entry two of whose
  forms match is still one row. The alternative, a `greatest(…)` over the
  fields with a correlated subquery for the folk names, is a `SubPlan` that a page
  bound evaluates against every compendium row. `compendium-search-query.test.ts`
  runs `EXPLAIN` on the statement the finder sends, over ~20,000 entries and
  as many folk names and variants seeded once per file, under
  `enable_seqscan = off`: the first page and the page after a cursor both
  start from `ingredients_unaccent_trgm`, `ingredient_folk_names_unaccent_trgm`
  and `ingredient_variants_unaccent_trgm`, with no `SubPlan` and no sequential
  scan. When it was written the ranked page
  ran in about 7 ms against the unranked shape's 5 ms; the test that printed
  those timings asserted only that they were positive, and went with MB.184.

- **A keyset, not a capped top-N or pg_trgm's `<<->`.** A top-N would leave
  every match past the cap unreachable and give a search a different shape
  from a browse, against rule 8. `<<->` is a nearest-neighbour order: it needs
  a GiST index where these are GIN, orders by one text where the score is the
  best of five, and cannot resume after a cursor. The key is
  `[-score, position, name]` plus the id — the score negated so one ascending
  row comparison bounds it, and `real`,
  as `word_similarity` returns it, because a `real` prints shortest-exact and
  its cursor text casts back to the same value (`1 - score` would promote to
  `double precision`). Each weight goes into the statement as a parameter
  cast `::real`, and a verbatim hit's 1 as `1::real`, for the same reason: `real` times a bare number is `double
precision`, and while the keyset casts its sort back to `real`, the score
  carried onto the edge is not cast. The position is an `integer`, and never
  carried: the edge's `score` is the rank alone. A browse's cursor has one
  part and a search's three, so
  neither is a position in the other, and each is `InvalidCursor` there.
- **The 0.5 is set by `selectFrom`, as every threshold is.** The finder marks
  its keyset `wordMatch` when there is a query, and `selectFrom` then reads the
  page in a transaction that sets `pg_trgm.word_similarity_threshold` with
  `set_config(…, true)` first — the similarity branch's shape, on the keyset
  branch. `tests/db/repository/ingredients.test.ts` proves it by the rows
  found: a typo scoring exactly 0.5, below pg_trgm's own 0.6, is matched.
- **`categoryIds`** is AND: one correlated `existsIn(ingredient_categories, …)`
  per id, so an entry must carry every one. OR is M8.12's argument to add. A
  pair counts on the entry itself, `variant_id IS NULL`, or on a live form: a
  form's pair carries the `ingredient_id` too (MB.217), so the arm matches the
  union, and since the table is hard-deleted a soft-deleted form's pairs stay
  behind, so the arm reads the form's liveness through a nested `EXISTS`.
- **Within one kind of filter, any value matches; across kinds, every kind
  must** (M11.22). The four list filters below, `forms`, `celestialBodies`,
  `zodiacSigns` and `deityIds`, each find an entry holding _any one_ of the
  values listed, and the filters a caller sets together all have to hold.
  So `{ forms: ['Oil', 'Resin'], celestialBodies: ['Venus'] }` lists the
  entries that come as an oil or a resin _and_ hold Venus. In each list a
  blank value is skipped, and an empty or all-blank list is no filter.
  Categories are the exception, kept as all-of (above).
- **`forms`** matches an entry holding a live variant whose form is any of
  those listed (MB.222, M11.22): a correlated `EXISTS` over
  `ingredient_variants`, a subquery run for each entry, comparing
  `lower(btrim(…))` on both sides, the fold `ingredient_variants_form_unique`
  holds. An entry with two of the listed forms is still one row, so the count
  agrees with the page. `forms` and `formId` each read any of the entry's live
  forms on their own: an entry with a variant picked as Root and another typed
  as Herb answers `formId` Root with `forms` `['herb']`.
- **`formId`** matches an entry holding a live variant that picked the
  curated form, by the variant's `form_id` (MB.167, MB.220): a correlated
  `EXISTS` over `ingredient_variants`, read through
  `ingredient_variants_form_id_idx`, so any of an entry's forms holds it.
  How a form's delete finds the entries holding it (M5.6a). The repository's
  filter alone: the public `compendium` query takes no such argument.
- **`nomenclature`** (M5.5) is equality on the column, so `unknown` lists the
  formal names still to look up: the admin's to-do list beside
  `withoutReferences`' (["References"](references.md)).
- **`celestialBodies`** and **`zodiacSigns`** match an entry whose own list
  holds any of the values given, compared entry by entry under the
  suggestions' fold, `lower(btrim(…))` on both sides through `listFolds`
  (M11.22). Each value is its own `IN` over the folded list, ORed, rather than
  Postgres's array overlap `&&`, which would compare the raw spellings. A
  celestial body's or a sign's delete and rename pass a one-item list to find
  the entries holding it (MB.95). Unindexed: the list is short and read an
  entry at a time.
- **`deityIds`** matches an entry holding a live link to any of the curated
  deities listed, by `ingredient_deities.deity_id` (MB.167, M11.22): a
  correlated `EXISTS`, answered by `ingredient_deities_deity_id_idx`, so an
  entry linking two of them is one row. A deity's delete passes a one-item
  list to find the entries holding it (MB.132).
- **`toxic`** reads M11.21's two yes/no flags together (M11.22). `toxic`
  lists an entry whose own `ingredients.toxic` is on, or that has a live
  variant whose `ingredient_variants.toxic` is on; `not_toxic` lists the
  rest; absent is any. A soft-deleted (retired) variant's flag counts for
  nothing either way, since the variant side is an `existsIn`, which skips
  deleted rows: an entry whose only toxic form was retired reads as not
  toxic. `not_toxic` is the same test negated, so the two settings always
  split the list between them. The filter is the one place the two flags are
  read together, and only to choose which entries to list: what a single
  form reports about itself is still its own flag alone (DESIGN.md §5, "The
  toxic flag is the one exception").

Names order under the database's own collation (`en_US.utf8` in the image).
M8.14's `(lower(name), identity_key, id)` declares its parts on the same
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
the rows its pages list. `tests/db/repository/ingredients.test.ts` counts a
search whose every match scores between 0.5 and 0.6.

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

**`findIngredientFormValues(filter, page)`** is one keyset page of the curated
form vocabulary in `(name, id)` order: the live forms whose group is live too,
which is what curated means to `findVocabularySuggestions` as well, with the
group's `deleted_at` read by `existsIn`, narrowed by an
`IngredientFormValueFilter` as the categories are by theirs, and
**`findIngredientFormValueCount(filter, start)`** counts them under the same
filter and key. **`findCategoryPage(filter, page)`** (M5.6) reads the
categories the same way, a live category under a live group, behind the
public `categories` query, narrowed by MB.178's `CategoryFilter`, and
**`findCategoryCount(filter, start)`** counts them under the same filter and
key, as `findCompendiumCount` counts the compendium.

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

**MB.215: the read reaches an entry's forms.** Once each form is a row of `ingredient_variants` (DESIGN.md §5), MB.218 adds the variants to the `query` match's `UNION ALL`, over each live variant's accent-folded form and description through `foldedWordMatch` — one arm for both then, an arm for each since MB.115's position rule — keyed on the variant's ingredient, so the existing `max(score) … group by id` still folds an entry with two matching forms into one row; the variant table's trigram index serves it, and `compendium-search-query.test.ts`'s plan loop gains the arm. A bare "oil" then ranks every entry with an oil variant at 1.0, and the form filter is the precise tool for that question. Since MB.115 the arm carries the form's weight, 0.6, and the description's, 0.2, so an oil ranks at 0.6, below a label holding the word. MB.220 makes `formId` an `EXISTS` over live variants, so a form's delete finds every entry holding a variant that picked it, and MB.222 did the same for `form`, folded on both sides, so the row's own `form` column is read by nothing. A variant's category pair also carries its `ingredient_id`, so `categoryIds` matches the union of an entry's categories and its forms'; MB.220 holds it to the live forms', since a dropped form's pairs outlive it. Under the same union rule an entry counts as sourced, for `withoutReferences`, if it or one of its live variants cites a reference. M8.14's sort becomes `(lower(name), identity_key, id)`, and `findIngredientSuggestions` reaches the new arm through `compendiumList`.

## The ingredient picker's search (MB.138)

**`findIngredientSuggestions(membership, query, page, form?)`** is what a coven's
substitute picker reads, behind `ingredientSuggestions`
([`graphql/schema.md`](../graphql/schema.md)) and the `ingredients` service
`suggestIngredients`. It offers exactly what a coven's substitute may link
(DESIGN.md §5, `ingredient_substitutes`): live entries of the compendium and
of the proof's workspace, never another, so it is on
[the tier seam](../modules.md#the-tier-seam).

- **It is `findCompendiumPage` under a wider scope.** It takes the same
  private `compendiumList({ query })`, so the match is the compendium
  search's: word similarity at 0.5 against the label, the formal name, the
  live folk names and the live variants' forms and descriptions, accent-folded, best match first, under the compendium's weights, with a blank query
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
  over the same ~20,000 rows and asserts it; that the scope holds is
  `ingredient-suggestions.test.ts`'s, by the rows it answers.
- **A coven's own entry hides the compendium entry it names (M8.3).** One
  predicate, `notHiddenByLocal(membership)`, is a `NOT EXISTS` over the
  coven's live rows (DESIGN.md §5), so a hidden entry never leaves the
  database. A compendium row is hidden when a live local row has the same
  `identity_key`, whatever forms either holds, or, only when that local row
  declares no formal name, the same label with case folded. So one
  unidentified local "Cat's Claw" hides all five compendium rows of that
  name, while a local naming another species hides none. A coven's own rows
  always pass. M9.4's `workspaceIngredients` applies the same predicate.
- **A `form` ranks, and filters nothing.** A non-blank `form` puts a rank
  first in the sort: 0 for an entry holding a live variant of that form
  (folded), 1 for one holding a form of the same curated group (a variant
  matched to a live `ingredient_forms` row by `form_id` or by folded
  name), 2 for the rest. The rank is part of the key, so the cursor and
  the count stay consistent.
