## The compendium read

The compendium is the public surface, so its reads take no proof and no session.
Services in `ingredients`' `services/compendium.ts`, `services/ingredient-facets.ts`
(`compendiumFacets`) and `vocabulary`'s `services/ingredient-form-values.ts` sit
over finders that read the compendium tier named on
[the tier seam](../modules.md#the-tier-seam). Each parses its filter through
`CompendiumFilter` (Zod, `validation/compendium-filter.ts`).

**`findCompendiumPage(filter, page)`** is one keyset page of the compendium under an
`IngredientFilter`, every part optional and absent meaning no filter. A search pages
best match first, `(score DESC, position, name, id)`; a list without one pages
`(name, id)`. Each entry carries a `score`, null on a browse. Names order under the
database's own collation (`en_US.utf8` in the image). A cursor lives only as long as
the page it came from, so changing a sort is harmless
(["Keyset pages"](keyset-pages.md)).

- **`query`** is word similarity, case- and accent-folded, against the display name,
  the formal name, a live folk name, and the form or description of a live variant:
  `unaccent_immutable($query) <% unaccent_immutable(column)`, true when the query is
  at least **0.5** word-similar to some run of the text. That forgives a transposed
  pair (`mugwrot` is exactly 0.5 to Mugwort), matches a two-letter prefix as it is
  typed (`mu`, 0.67) and reads across punctuation, where pg_trgm's own 0.6 misses
  the typo. A query of punctuation alone has no trigrams and matches nothing. A word
  in a form matches every entry holding that form, so a bare "oil" ranks each entry
  with an oil variant at 0.6, below any entry whose own name holds the word; the form
  filter is the precise tool for that question. The ranking is under "Search ranking".
- **A keyset, not a capped top-N or pg_trgm's `<<->`.** A top-N leaves every match
  past the cap unreachable and gives a search a different shape from a browse
  (rule 8). `<<->` is a nearest-neighbour order: it needs a GiST index where these
  are GIN, orders by one text where the score is the best of several, and cannot
  resume after a cursor. A browse's cursor has one part and a search's three, so
  neither is a position in the other, and each is `InvalidCursor` there.
- **The 0.5 is set by `selectFrom`, as every threshold is.** The finder marks its
  keyset `wordMatch` when there is a query, and `selectFrom` then reads the page in
  a transaction that first sets `pg_trgm.word_similarity_threshold` with
  `set_config(…, true)`. `tests/db/repository/ingredients.test.ts` proves it by the
  rows found: a typo scoring exactly 0.5 is matched.
- **The other filters** (`categoryIds`, `forms`, `formId`, `nomenclature`,
  `celestialBodies`, `zodiacSigns`, `deityIds`, `toxic`, `reviewed`, the switches and
  the sorts) are under "Filter arms" and "The sourcing sort". **Within one kind of
  filter any value matches; across kinds every kind must.** `forms`,
  `celestialBodies`, `zodiacSigns` and `deityIds` each find an entry holding _any
  one_ of the values listed, and the kinds a caller sets together all have to hold:
  `{ forms: ['Oil', 'Resin'], celestialBodies: ['Venus'] }` lists entries that come
  as an oil or a resin _and_ hold Venus. A blank value is skipped, and an empty or
  all-blank list is no filter. Categories are the exception, all-of by default.
- **`reviewed`** is a curator's review mark: `true` lists entries whose
  `curator_reviewed_at` is set, `false` those where it is null, absent both. The
  finder takes it from anyone; `compendiumFilterFor`
  (`services/compendium-filter.ts`) refuses a `reviewed` filter with `Forbidden` for
  anyone who does not curate, so the public page, a coven and a signed-out caller
  cannot learn which entries a curator has checked. The public page drops
  `?reviewed=` from its address before it reads, and a coven's parameter table has
  no `reviewed`.

**The review date is on the row; the reviewer never is.** A curator's mark is shown
to everyone as a date, so `curator_reviewed_at` rides on the cached compendium read
and is the same for every viewer (CLAUDE.md, rule 6). The reviewer's id is not:
every finder over `ingredients` selects `readColumns(ingredients)` from
`src/db/repository/unread-columns.ts`, which leaves out `curator_reviewed_by`, and
the row types leave it out too (`UnreadIngredientColumn`). The mutation
`setCompendiumEntryReviewed` calls `expireCompendium()`, so a change shows at once.
The keeper's switch reads the mark with **`findCompendiumReview(curator, id)`**
through `readCompendiumReview(session, id)`, which throws `Forbidden` for anyone who
does not curate. The Reviewed filter and its counts stay curator-only.

**`findCompendiumCount(filter, start)`** numbers those pages: how many entries the
filter holds, and how many precede `start`, a page's first row (the count mode of
["Keyset pages"](keyset-pages.md)). It and `findCompendiumPage` each state the tier
and the soft-delete filter, since the tier seam and the soft-delete guard read each
exported finder, and both take the filter's arms and the key from one private
`compendiumList(filter)`, so the count reads exactly the rows the pages hold. On a
search that means the join and the 0.5: counted at the server's 0.6, `mugwrot`
would count none of the rows its pages list.
`tests/db/repository/ingredients.test.ts` counts a search whose every match scores
between 0.5 and 0.6.

**The service treats a query shorter than two characters as absent**
(`MIN_QUERY_LENGTH`, counted in composed code points). One letter shares a trigram
with half the compendium at 0.5, so it would filter and rank by noise; below the
minimum the list is a browse. The finder takes whatever it is handed.

**`findOneIngredient(memberships, id)`** is one live row in the compendium or in a
coven one of the proofs names, in the shape of `findManyOfIngredients`. No proofs
reads the compendium alone, which is how a signed-out request reads it, and a
coven's row asked for without its proof is `undefined`, the same answer as an id
that names nothing.

**`findIngredientFormValues(filter, page)`** is one keyset page of the curated form
vocabulary in `(name, id)` order: the live forms whose group is live too, which is
what "curated" means to `findVocabularySuggestions` as well, with the group's
`deleted_at` read by `existsIn`, narrowed by an `IngredientFormValueFilter`.
**`findIngredientFormValueCount(filter, start)`** counts them under the same filter
and key. **`findCategoryPage(filter, page)`** reads the categories the same way, a
live category under a live group, behind the public `categories` query, narrowed
by `CategoryFilter`, and **`findCategoryCount(filter, start)`** counts them.

**The services parse ids first.** `listCompendium` and `countCompendium` run their
filter through `CompendiumFilter` and `getIngredient` checks its id the same way,
because `selectFrom`'s keyset branch maps every SQLSTATE class-22 error to
`InvalidCursor`, on the premise that the cursor is the only client text a page
query carries. A category id compared to a `uuid` column is client text too, so a
malformed one is refused before the query or it would come back as "Invalid
cursor". The check is `z.guid()`, not `z.uuid()`: Postgres's `uuid` takes any
version and variant, and the seed's hand-written ids are not RFC-shaped.
`getIngredient` takes an optional `workspaceId`; with one it asks
`assertMembership(…, { ingredient: ['read'] })` (a signed-out caller, a site admin
and a non-member get `Forbidden`) and reads both tiers; without one it reads the
compendium alone. A miss is `NotFound` either way.

**An entry's forms are reached by the read.** Each form is a row of
`ingredient_variants` (DESIGN.md §5). The `query` match has an arm for a live
variant's accent-folded form and one for its description, keyed on the variant's
ingredient, so the `max(score) … group by id` still folds an entry with two
matching forms into one row; the variant table's trigram index serves it.
`formId` and `forms` are `EXISTS` over live variants, so a form's delete finds every
entry holding a variant that picked it, and the variant row's own `form` column is
read by nothing. A variant's category pair carries its `ingredient_id`, so
`categoryIds` matches the union of an entry's categories and its live forms'
(a dropped form's pairs outlive it). Under the same union rule an entry counts as
sourced, for `withoutReferences`, if it or one of its live variants cites a
reference. The sort is `(lower(name), identity_key, id)`.

### Search ranking

One ranking serves the compendium, a coven's ingredients and the grimoire.

- **`weightedSearch`** (`src/db/repository/weighted-search.ts`) is a best-match
  search over several text fields, returned as a relation to join onto the listed
  table, with each row's rank and where its best field holds the query. It is one
  `UNION ALL` arm per field (the shape ["Fuzzy matching"](fuzzy-matching.md) argues
  for over an `OR` beside the scope), so each arm's `where` is that field's own `<%`
  match, which an index can answer, and the position an arm reports belongs to the
  field it scored. An arm selects
  `greatest(word_similarity(query, text), case when strpos(lower(text), lower(query)) > 0 then 1 end) * weight`
  and the field's position, each side folded through `unaccent_immutable`
  (`greatest` skips the null of a containment test that failed). The union is
  folded by `group by id` to `max(score)` and the best arm's position, and joined to
  `ingredients` as `matched`, so the score and position are plain columns, read by
  the order, the page bound and the edge alike, once per matched row, and an entry
  two of whose fields match is still one row. A `greatest(…)` over the fields with a
  correlated subquery for the folk names would be a `SubPlan` evaluated against
  every compendium row. The threshold is the keyset read's, so the order using it
  must say `wordMatch`. `query` is trimmed and never blank.
- **The compendium's arms** are the entry's label, its formal name, its live folk
  names, its live variants' forms and its live variants' descriptions, plus a sixth
  under a coven's proof (below). `searchMatch` builds them. The grimoire builds its
  own from the same function: two arms over a coven's spells, the title weighted 1
  and the intent 0.5, keyed `[-rank, position]` and then the order the reader chose.
  The reference picker's search scores its three fields the same way, without
  weights ([References](references.md)).
- **Indexes.** `ingredients_unaccent_trgm`, `ingredient_folk_names_unaccent_trgm`
  (migration 0027) and `ingredient_variants_unaccent_trgm` (0061) are GIN indexes
  on the folded expression, and `unaccent_immutable` (0026) is the `IMMUTABLE`
  wrapper an expression index needs. pg_trgm's GIN answers `<%` only when the text
  side is the index's own expression. `compendium-search-query.test.ts` runs
  `EXPLAIN` on the statement the finder sends, over ~20,000 entries and as many folk
  names and variants, under `enable_seqscan = off`: the first page and the page
  after a cursor both start from all three indexes, with no `SubPlan` and no
  sequential scan. `ingredients-unaccent.test.ts` keeps the indexes' expressions,
  the wrapper's volatility and the fold.
- **`SEARCH_WEIGHTS`** (beside `searchMatch` in `src/db/repository/ingredients.ts`)
  gives every field its own weight:

  | Field                        | Weight | Why                                                              |
  | ---------------------------- | ------ | ---------------------------------------------------------------- |
  | The label, `name`            | 1      | What the entry is called, the name a reader looks for            |
  | The formal name              | 0.9    | The entry's identity (MB.215), so just under its own label       |
  | A live folk name             | 0.8    | Still a name of this entry, though another entry can share it    |
  | A live variant's form        | 0.6    | A form word, Oil or Resin, is shared by every entry in that form |
  | A live variant's description | 0.2    | Prose, which names other things in passing                       |

  Every field has its own weight rather than the label alone taking a boost, since a
  boost on the label would leave a formal name, a folk name, a form and a description
  tied with each other, and a word in a variant's prose would rank with the entry's
  own formal name. The weight lowers the rank and never the match: a field matches
  at 0.5 or better, so a form matching at 0.5 ranks at 0.3. A field only scores where
  it matched itself, so a weak hit in a heavier field never outranks the field that
  matched.

- **A field holding the typed text verbatim scores 1, before its weight**, wherever
  the text falls in a word. `word_similarity` scores the query against whole words,
  by the share of the query's trigrams (three-letter runs, padded with spaces at a
  word's edges) a run of the text holds, so a fragment inside a longer word loses
  the trigrams that mark a word's start: "wood" in _Sandalwood_ scores 0.6, while
  Cinnamon's folk name _Sweet Wood_ scores 1, and weighted the folk name (0.8) would
  outrank Sandalwood's label (0.6). The containment rule scores Sandalwood's label 1
  and ranks it first. The rule changes the rank and never the match: the `where` is
  unchanged, so a fragment that does not reach 0.5 is still not found, and the
  trigram indexes still answer the search.
- **`foldedWordMatch(query)`** (`src/db/repository/predicates.ts`) supplies the
  pieces. `matches` is word similarity (`<%`) and `similarity` its score, each side
  folded through `unaccent_immutable` so the expression indexes answer it.
  `contains` holds where the text holds the query verbatim, folded the same way and
  lower-cased, because `<%` ignores case. `position` is the character where that
  verbatim match starts, or `NOWHERE`. They use `strpos` rather than `ilike` because
  `strpos` reads the query as plain text, where a pattern would need `%`, `_` and
  `\` escaped.
- **Among equal scores, the entry whose field holds the typed text earliest ranks
  first.** Searching "wood", Wood Ash (position 1), Agarwood and Wormwood (5),
  Sandalwood (7) and Red Sandalwood (11) all score 1 and rank in that order; the
  name breaks only the tie position leaves. A field that matched without holding the
  query (a near spelling) has no such character and takes the largest `integer`,
  2147483647, so it follows every verbatim hit at its score. It is a number rather
  than null because a null part makes the keyset's row comparison null, and the row
  would fall out of every page.
- **The position is the field's that set the score.** An entry whose label holds the
  query at 9 and whose folk name holds it at 1 ranks at 9, because the label ranked
  it. That is why each field is an arm of its own (an arm reading two fields would
  report one position for two scores), and why the fold takes
  `(array_agg(position order by score desc, position))[1]`, the earliest position
  among arms tied on score, rather than `min(position)`.
- **The key** is `[-score, position, name]` plus the id: the score negated so one
  ascending row comparison bounds it, and `real`, as `word_similarity` returns it,
  because a `real` prints shortest-exact and its cursor text casts back to the same
  value (`1 - score` would promote to `double precision`). Each weight goes into the
  statement as a parameter cast `::real`, and a verbatim hit's 1 as `1::real`, since
  `real` times a bare number is `double precision` and the score carried onto the
  edge is not cast. The position is an `integer` and never carried: the edge's
  `score` is the rank alone. A browse keys `[name]`.
- **`compendiumList`** builds the arms and the key with the search's join in one
  place, so the count reads the rows the pages hold in the order they hold them.
- **Under a coven's proof the rank is the score alone, whatever the kind.** The
  coven's list (`findWorkspaceIngredientPage`) and the substitute picker pass
  `compendiumList` the proof, and three things change. The match gains a sixth
  arm, the label the coven's cupboard row gives a compendium entry, weighted as the
  name is, so a relabelled entry is found by that label and by the compendium's own
  name and ranks at the better of the two. The statement left-joins the coven's
  cupboard row, so the name part of the key is `coalesce(label, name)`, and the
  cursor is built from the same expression. And nothing else enters the key: there
  is no part for the entry's kind, so a coven's own entry and a compendium entry of
  the same name and match tie on score and position and sort side by side by name,
  then id. The `source` filter narrows the list by kind but never lifts one kind
  above the other.

### Filter arms

Each filter kind is a predicate built once and shared by the page, the count and the
facets, so they cannot disagree.

- **`categoryArms`.** Under `all` (the default) it is one correlated `EXISTS` per id,
  so an entry must carry every one. Under `categoryMode: 'any'` it is a single
  `EXISTS` over the list, which also keeps an entry holding two of them from being
  found twice. An empty list is no filter in either mode. The category may be filed
  on the entry itself (`variant_id IS NULL`) or on a live form. A variant's pair
  names the ingredient too, so the union comes free, but the table is hard-deleted
  and its pairs outlive a soft-deleted variant, so the variant's liveness is read
  here (and by `pairIsLive`, which takes the pair's column so an aliased read can ask
  too). The category itself must be live, through `pointsLive`.
- **`stated`** drops blank values from a list filter, so `['', 'Mars']` filters by
  Mars and `[' ']` by nothing; the fold stays in SQL, beside the column's own.
- **`forms`** matches an entry holding a live variant whose form is any of those
  listed: a correlated `EXISTS` over `ingredient_variants`, comparing
  `lower(btrim(…))` on both sides, the fold `ingredient_variants_form_unique` holds.
  An entry with two of the listed forms is still one row, so the count agrees with
  the page. `forms` and `formId` each read any of the entry's live forms on their
  own: an entry with a variant picked as Root and another typed as Herb answers
  `formId` Root with `forms` `['herb']`.
- **`formId`** matches an entry holding a live variant that picked the curated form,
  by the variant's `form_id`: a correlated `EXISTS` read through
  `ingredient_variants_form_id_idx`. A curated form's delete uses it to find the
  entries holding it. It is the repository's filter alone: the public `compendium`
  query takes no such argument.
- **`nomenclature`** is equality on the column, so `unknown` lists the formal names
  still to look up: the keeper's to-do list beside `withoutReferences`
  (["References"](references.md)).
- **`celestialBodies` and `zodiacSigns`** match an entry whose own list, or a live
  variant's, holds any of the values given (`listArm` through `listOrVariantHolds`;
  a soft-deleted variant's list counts for nothing). Each is compared entry by entry
  under the suggestions' fold, `lower(btrim(…))` on both sides through `listFolds`.
  Each value is its own `IN` over the folded list, ORed, rather than Postgres's
  array overlap `&&`, which would compare the raw spellings. A celestial body's or a
  sign's delete and rename pass a one-item list to find the entries holding it.
  Unindexed: the list is short and read an entry at a time.
- **`elementArm`** is an array overlap on the entry's own list and a correlated
  `EXISTS` on a live variant's, so an entry is one row however many of its forms hold
  an element and a retired form's counts for nothing. Elements are a closed set, so
  nothing is folded.
- **`deityArm`** matches an entry holding a live link to any of the curated deities
  listed, by `ingredient_deities.deity_id`: a correlated `EXISTS` answered by
  `ingredient_deities_deity_id_idx`, so an entry linking two is one row. A deity's
  delete passes a one-item list to find the entries holding it. The deity filter
  also matches a name through an `EXISTS` over the deity's live other names, so a
  folk name finds the deity.
- **`pointsLive`** requires the curated row a link names to be live and its group
  (its tradition, for a deity) live too, which is what the facets' join reads, so a
  value the facets count at nothing lists nothing. A curator cannot delete a row a
  compendium entry links, but a coven's own entry keeps its link through the delete,
  so without the check the coven's list would show that entry under a value its
  facet counts at 0. A deleted deity or category matches nothing.
- **`toxicArm`** is toxic when the entry's own `ingredients.toxic` is on or a live
  variant's `ingredient_variants.toxic` is on. `not_toxic` is the negation of the
  same predicate, so the two settings always split the list between them; absent is
  any. A retired variant's flag counts for nothing: an entry whose only toxic form
  was retired reads as not toxic. This is the one place the two flags are read
  together, and only to choose which entries to list: what a single form reports
  about itself is its own flag alone (DESIGN.md §5, "The toxic flag is the one
  exception").
- **`reviewArm`** reads `curator_reviewed_at`, which a CHECK keeps set exactly when
  `curator_reviewed_by` is. `findCompendiumReview` returns that time as epoch
  milliseconds, as a column inside an aggregate loses Drizzle's date mapping and a
  `Date` holds no finer anyway.
- **`citesNowhere`** (the No Refs switch) is the keeper's to-do list: an entry that
  cites no live reference, on itself or a live form. An entry whose only source is
  on its oil is sourced (the union rule), and one whose only reference was
  soft-deleted counts as citing nothing. **`hasNoForm`** (No Form) lists entries
  nobody can stock or put in a spell yet; a soft-deleted variant is none, through
  `existsIn`.

### The sourcing sort

`filter.sort = 'sourcing_score'` orders the compendium list by each entry's sourcing
score, lowest first, then by name, then by id. `filter.sort = 'name'` orders it by
name, then id, even under a search, which otherwise lists by best match.
`filter.order = 'desc'` reverses either sort, the whole key at once, so ties run name
Z to A; it means nothing without a sort. The cursor helper
(`src/db/repository/select.ts`) takes the direction as `descending` on the list
order, and flips the comparison each page resumes from and the count of rows before
the cursor to match.

The score is `sourcingScoreExpression` in `src/db/repository/sourcing-score.ts`: one
correlated SQL expression over the listed row that adds up the same facts as the
pure `sourcingScore` function, reading every weight from
`src/modules/ingredients/schema/sourcing-weights.ts`, so the two cannot drift apart
without a test noticing. It counts only live links to live compendium works, on the
entry or on its live forms. The cursor helper pages on the expression like any other
sort key, and the count uses the same order, so "Page X of Y" stays right. A search
still narrows the list to the entries it matches; under the sort they come in score
order, not best match. A coven's cupboard read ignores the score sort.

The admin list also shows the score. `filter.withSourcingScore` makes
`findCompendiumPage` select `sourcingScoreExpression` beside each row, in the same
query, and hand it back on the row's edge as `sourcingScore`; without it no score is
computed.

The score sort and the carried score are a curator's: `compendiumFilterFor` refuses
either with `Forbidden` for a signed-out request or anyone not a curator or keeper,
as it does the Reviewed filter, because the cache is keyed by the parsed filter. The
name sort is open to anyone. `tests/db/repository/sourcing-score.test.ts` checks the
order and each row's sort key against the pure function over eight fixture entries,
that each direction is the reverse of the other, paging two rows at a time across a
boundary in each of the four orders, that the carried score equals
`readSourcingScore`, and that a practitioner, an observer, a non-member and a
signed-out read are refused the score where the unguarded repository call returns it.

### Facet counts

**`findCompendiumFacets(filter)`** (`src/db/repository/ingredient-facets.ts`) answers
"how many entries would I see if I picked this value?" for every value of every
search filter, so the filter panel can show a number beside each choice. It returns
a `CompendiumFacets`: seven lists of `{ value, count }` (forms, deities, categories,
zodiac signs, celestial bodies, elements and toxic), the No Refs and No Form counts,
and `reviewed`: how many entries are reviewed and how many need review, counted under
the rest of the filter with its own setting left out. The service
`compendiumFacets(filter, viewer)` returns `reviewed` as null for a viewer who does
not curate (`withReview` false sends no statement for the Reviewed counts). A coven's
list has no such switches, so `findWorkspaceIngredientFacets` returns plain
`IngredientFacets`. `nomenclature` gets no count.

- **A value's count is what the list would hold with that value as the only choice of
  its kind**, the rest of the filter unchanged: with `forms: ['Oil']` and
  `toxic: 'toxic'` chosen, Resin's count is how many toxic entries come as a resin,
  not how many come as both. `tests/db/repository/ingredient-facets.test.ts` checks
  each count against `findCompendiumCount` under eight filters.
- **Categories under `categoryMode: all` are the exception.** There an entry needs
  every chosen category, so each category is counted together with the ones already
  chosen. Under `any` the categories are counted like every other kind.
- **The fixed vocabularies come back whole, zeros included.** Every live curated
  zodiac sign and celestial body, by `position` with nulls last (a curator's addition
  has none, so follows the seeded ones), then by name; every element in
  `INGREDIENT_ELEMENTS`' order; and `toxic` then `not_toxic`.
- **The open-ended kinds list only what counts.** Forms, deities and categories list
  each value some entry carries, plus every chosen value at zero if nothing carries
  it, so a choice never vanishes from the panel. They sort alphabetically under the
  natural-language collation `"en-US-x-icu"`, never by count
  (`claude-docs/design-decisions/m12.52-facet-sort-order.md`): a category by group
  name then name, a deity by tradition name then name, both in the query itself.
  Forms sort by the same rule in JavaScript with `Intl.Collator('en-US')`, since a
  form's spelling is only known after its group is read. Deities and categories are
  named by id.
- **A form is spelled as its curated row** when a live curated form folds to the same
  text, else as most of its counted variants spell it, ties alphabetically. Forms are
  grouped by the same case- and space-folding the `forms` filter matches with, so
  `Oil` and `oil` are one form.
- **`withoutReferences` and `withoutForms`** count entries that cite no live
  reference (or have no live variant) under the rest of the filter, with the filter's
  own setting for that switch forced on, so the number is the same whether the
  switch is on or off. Both come from one read: it lists the entries with both
  switches off and counts each arm (`citesNowhere`, `hasNoForm`) beside the other
  switch's own setting, so a switch that is on narrows the other's count as it
  narrows the list.
- **Nothing soft-deleted counts**: not a deleted entry, variant, deity link or
  category pair, and not a deleted deity, category, sign or body.

**How it reads.** Each kind is one grouped query (`GROUP BY`), built through
`selectFrom`'s aggregate form and the list's own conditions from `compendiumList`, so
a count cannot match differently from the list it sits beside. They run at once with
`Promise.all`: eight queries for the compendium (the seven kinds and the two switch
counts) and eleven for a coven (the seven kinds, the two Source counts, the In Stock
count and the Low Stock Only count), whatever the filter. With a search, each runs in
its own transaction that sets the 0.5 threshold, as the list does. Signs and bodies
use a right join from the vocabulary table, with the entries' conditions in the join
(an entry's own list or a live variant's, through `listOrVariantHolds`), so a sign no
entry lists still comes back at zero. Elements and toxic need no join: one query
counts every setting at once with `count(*) filter (where …)`.

### Vocabulary finders

"Curated" means a live row under a live group or tradition, for the form page
(`findIngredientFormValues`) and for the autofill suggestions alike. The autofill
itself is in claude-docs/db/member-autofill.md.

A curated form's rename is refused when it would leave a compendium entry with two
live forms of one name: the check counts entries with a variant that picked the form
and another variant whose form already folds to the new name, before the write and
again after the unique index refuses one.

### Tier-scoped reads

Ingredient child tables (`ingredient_folk_names`, `ingredient_categories`,
`ingredient_variants` and the rest) carry no `workspace_id`, so they are read under
the parent's tier.

- `findManyOfIngredients` reads what the ingredient owns, and `findManyOfVariants`
  what one form owns, each through a correlated `EXISTS` over a live parent in the
  compendium or in a coven one of `memberships` proves. No proofs reads the
  compendium alone. A caller naming another coven's id gets no rows, rather than a
  filter applied after the fetch (rule 7).
- `heldBy` widens that by one case: a retired compendium entry whose cupboard row in
  that coven is live is read too, and so is a live form of it, so the coven can start
  a new jar of an entry it still holds. Without it only the live tiers are read.
- `findReadableVariant` and `findReadableVariants` return a live variant while its
  ingredient is live and in a readable tier, so another coven's form is no form at
  all. The plural takes many ids and omits any that is not readable, so the caller
  compares lengths.
- `findDeitiesOfIngredients` pairs each live deity link with the curated deity it
  names while that deity is live under a live tradition. A typed name, or a deity
  since retired, reads as the name the row holds with a null deity. It is unordered;
  a caller sorts by `position`.
- `findSubstitutesIncludingSoftDeleted` is the substitute escape hatch (see
  "Soft-delete filtering" in [soft-delete.md](soft-delete.md)). It skips the linked
  ingredient's filter and no other. The substitute's own tombstone filters, its
  parent must be live and readable, and the link must point where the parent's
  readers may look, the compendium or the parent's own coven, so a row written past
  the service's tier rule shows nothing. The linked ingredient is a left join under
  an alias, since the parent's correlated subquery reads `ingredients` itself.

### The coven list scope

`workspaceListScopeIncludingSoftDeleted` is what a coven's ingredient list reads: the
coven's own live entries plus the compendium entries a live cupboard row of the coven
names, as one keyed `EXISTS` on the row's `(workspace_id, ingredient_id)` unique. The
second arm admits a compendium entry a curator has retired, so it stays listed until
the coven removes it (claude-docs/db/workspace-compendium-entries.md, "When the
compendium retires the entry").

- The scope carries the tombstone filters itself, the own entry's here and the
  cupboard row's in `existsIn`, so its readers page it without one, and
  `inCompendium` keeps a coven's own deleted entry off the second arm. The page and
  the facets read the same scope, so they hold the same rows.
- A name match hides nothing: a jar does not decide membership, and an own entry
  sharing a compendium entry's name leaves both listed (DESIGN.md §5).
- The coven-only `source`, `inStock` and `lowStockOnly` settings are read here, not in
  `compendiumList`, which the compendium's page and count share and where a coven's
  jars mean nothing.
- `holdsJarInStock` and `holdsJarLowOrOut` use a plain live-variant `EXISTS`, as the
  row is already the readable ingredient. A jar with no quantity is held unweighed:
  `inStock` is an `OR` with null, because `<> 0` alone reads null as unknown and
  would drop it, and `lowStockOnly` never matches it. The rule is `stockState`'s in
  `src/components/StockBadge/stock-state.ts`, and `tests/support/jar-states.ts` is
  the list both are tested against.
- `listColumns` reads `coalesce(cupboard row's, entry's)` under a coven's proof, so
  an override sorts, filters and counts where the coven put it, and an empty list it
  cleared matches nothing (`coalesce` takes `[]` as a value, as `applyCupboardEntry`'s
  `??` does). The join matches the proof's live row for a live compendium entry, so a
  coven's own entry reads its own columns. Without a proof each is the entry's
  column. It is raw SQL because `coalesce` has no builder.
- `heldInAnyOf` and `heldInNoneOf` (In My Covens, Not In) go through `existsIn`, which
  ANDs the cupboard row's tombstone filter, so a removed row does not hold the entry.
  A coven's own entries never match, as the compendium lists none.

### Ingredient suggestions

**`findIngredientSuggestions(membership, query, page, form?)`** is what a coven's
substitute picker reads, behind `ingredientSuggestions`
([`graphql/schema.md`](../graphql/schema.md)) and the `ingredients` service
`suggestIngredients`. It offers exactly what a coven's substitute may link (DESIGN.md
§5, `ingredient_substitutes`): live entries of the compendium and of the proof's
workspace, never another, so it is on [the tier seam](../modules.md#the-tier-seam).

- **It is `findCompendiumPage` under a wider scope.** It takes the same private
  `compendiumList({ query }, membership)` as the coven's list, so the match is the
  compendium search's: the same arms and weights, best match first, with a blank
  query listing by `(coalesce(label, name), id)`. The service parses the query
  through `CompendiumFilter`, so a query under `MIN_QUERY_LENGTH` is a blank one
  here too. The scope is read on `ingredients` after the match has joined, so the
  statement still starts from the expression indexes. `compendium-search-query.test.ts`
  asserts the plan over the same ~20,000 rows; `ingredient-suggestions.test.ts`
  asserts the scope holds, by the rows it answers.
- **Not `findSimilarIngredients`**, which answers whether a whole name is nearly one
  already there, by `%` at 0.4, and a typed fragment is far under it (`mu` is 0.22
  similar to Mugwort and 0.67 word-similar). Not `findCommonNameSuggestions` either,
  which answers with strings, while a pick writes an ingredient's id.
- **Two groups, the cupboard then the compendium.** `yours` is the coven's own live
  entries and each live compendium entry it holds a live `workspace_compendium_entries`
  row for, found by the label the coven gave it as well as the compendium's name.
  `compendium` is every other live compendium entry, through a keyed `NOT EXISTS` on
  the cupboard row, so an entry is in exactly one group. A retired compendium entry is
  in neither, whatever rows point at it, by the tombstone filter alone. Each group is
  ranked by score within itself and cut at `SUGGESTION_GROUP_LIMIT` (8 each, an
  estimate tuned in the e2e test). The statement is two inner queries (the top ids of
  each group) and an outer keyset query over those ids with the group as its first
  sort key, so the cursor and the page keep working; each node's `group` rides on its
  edge as a `carry`. `categoryIds` keeps entries carrying any of them, on the entry or
  one of its variants.
- **A name match hides nothing.** The coven's own entry and the compendium's
  same-named one are both offered, in two groups.
- **A `form` ranks, and filters nothing.** A non-blank `form` puts a rank first in
  the sort: 0 for an entry holding a live variant of that form (folded), 1 for one
  holding a form of the same curated group (a variant matched to a live
  `ingredient_forms` row by `form_id` or by folded name), 2 for the rest. The rank is
  part of the key, so the cursor and the count stay consistent. It ranks inside each
  group, never across them.

`findSimilarIngredients` builds its three matches (display name, formal name, a live
folk name) as a `UNION ALL` under `id IN (...)`, not an `OR` beside the scope:
Postgres cannot turn a subquery inside an `OR` into a join, so that form walks
`ingredients` whole, and a `UNION`'s de-duplication walks `ingredients_pkey` whole
(claude-docs/db/fuzzy-matching.md).

## Hidden entries

An entry with `shown = false` is excluded in SQL from the public read: the list, its
search and counts, the slug finder and its redirects, the picker and
`ingredients-by-id`, so a hidden slug is a 404. The `listing` filter (`shown`, the
default, `hidden` or `all`) is a curator's: a call from anyone else that sets it is
refused with `Forbidden`, because the cache is keyed by the parsed filter. A coven's
cupboard is read without the arm, so an entry it names stays visible there, as do the
admin screens and the audit queue.

The seed lands an entry hidden when neither it nor any of its forms names a category;
a category only on a form keeps the entry shown. Entries already loaded were hidden by
migration, not by the seed: `0109` hid each live compendium entry with no category
pair at all, and `0117` then hid each one with no live category, counting a pair only
where its category and that category's group are live and it is filed on the entry or
on a live form. Each ran once; neither is an ongoing rule, and a curator's Show or
Hide after them stands.

**What a result card shows** is the same union of an entry's categories and its live
forms'. `cardCategoriesOf` (`src/modules/ingredients/services/ingredient-children.ts`)
answers each ingredient of a page with its own categories, by name, then the
categories only its live forms carry, by name, each with the forms that carry it; a
category on both the ingredient and a form is its own. It is one batch for the page:
the own pairs and the live forms through `findManyOfIngredients`, then the forms'
pairs through `findManyOfVariants` asked by the live forms' ids, since the pair table
is hard-deleted and a soft-deleted form's pairs outlive it. `readCardCategoriesOf`
(`src/app/compendium-reads.ts`) adds the group colours and names each form as the
screen does (`formLabel`), and the compendium's cards, the admin Compendium table and
a coven's cupboard all read through it, so they agree. `CategoryChips` draws a
form-only chip with a dashed border and a tip naming its forms ("On: Oil, Dried
Leaf"). `Ingredient.categories` in GraphQL stays the ingredient's own rows
(`claude-docs/design-decisions/m14.38-form-categories-in-search.md`).
