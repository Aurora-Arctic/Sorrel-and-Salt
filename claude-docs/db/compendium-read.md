## The compendium read (M8.5)

The compendium is the public surface (MB.80), so its reads take no proof and
no session. Three services in `ingredients`' `services/compendium.ts` and one
in `vocabulary`'s `services/ingredient-form-values.ts` sit over four
finders, the three that read the compendium tier named on
[the tier seam](../modules.md#the-tier-seam). M12.3 adds a fourth
`ingredients` service, `compendiumFacets` in `services/ingredient-facets.ts`,
over `findCompendiumFacets` (below), which parses its filter through
`CompendiumFilter` as `listCompendium` does.

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
  its folk names, its variants' forms and its variants' descriptions (and a
  sixth, the coven's label, under a coven's proof; below). Each arm
  scores what it matched as the word similarity, or 1
  where the field holds the query verbatim, times the field's weight (the
  next bullet). A word in a form matches every entry
  holding that form, so a bare "oil" ranks each entry with an oil variant at
  0.6, below any entry whose own name holds the word; the form filter (M8.13)
  is the precise tool for that question, and the search is not.
  `weightedSearch` (`src/db/repository/weighted-search.ts`) builds the arms
  from a list of fields and their weights, and the grimoire's search (M10.11)
  builds its own from the same function: two arms over a coven's spells, the
  title weighted 1 and the intent 0.5, keyed `[-rank, position]` and then the
  order the reader chose, so a title match ranks above an equally close
  intent match.
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

- **Under a coven's proof the rank is the score alone, whatever the kind
  (M12.18).** The coven's list (`findWorkspaceIngredientPage`) and the
  substitute picker pass `compendiumList` the proof, and three things change.
  The match gains a sixth arm, the label the coven's cupboard row gives a
  compendium entry, weighted as the name is (M12.19), so a relabelled entry is
  found by that label and by the compendium's own name, and ranks at the
  better of the two, since the score is already the best arm per entry. The
  statement left-joins the coven's cupboard row, so the name part of the key
  is `coalesce(label, name)`, and the cursor is built from the same
  expression. And nothing else enters the key: there is no part for the
  entry's kind, so a coven's own entry and a compendium entry each rank by
  score as every other row does, and the `source` filter (M9.7) narrows the
  list by kind but never lifts one kind above the other. A coven's own entry
  and a compendium entry of the same name and match tie on score and
  position and sort side by side by name, then id.

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
  per id, so an entry must carry every one. `categoryMode: 'any'` (M8.12) swaps
  the per-id arms for one `inArray` arm, so an entry carrying any of them
  matches; an empty list is no filter in either mode. A
  pair counts on the entry itself, `variant_id IS NULL`, or on a live form: a
  form's pair carries the `ingredient_id` too (MB.217), so the arm matches the
  union, and since the table is hard-deleted a soft-deleted form's pairs stay
  behind, so the arm reads the form's liveness through a nested `EXISTS`.
  The category itself must be live too, and so must its group (below).
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
- **A deleted deity or category matches nothing** (M12.3). Both filters
  also check that the deity or category the link points to is live, and so
  is its group (its tradition, for a deity), through `inLiveGroup`, the same
  condition the facet counts' join reads. A curator cannot delete one a
  compendium entry still holds, but a coven's own entry keeps its link
  through the delete, so without the check the coven's list would still show
  that entry under a value its facet counts at 0.
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
- **`reviewed`** is a curator's review mark (M14.8): `true` lists the entries
  whose `curator_reviewed_at` is set, `false` the ones where it is null, and
  absent is both. The finder takes it from anyone; the service decides who
  may send it. `compendiumFilterFor` (`services/compendium-filter.ts`) refuses a
  `reviewed` filter with `Forbidden` for a viewer who does not curate, so
  the public page, a coven and a signed-out caller cannot learn which entries
  a curator has checked. The public page drops `?reviewed=` from its address
  before it reads, and a coven's parameter table has no `reviewed`.

**The review date is on the row; the reviewer never is** (M14.8, corrected 2026-10-23). A
curator's mark is shown to everyone as a date, so `curator_reviewed_at` rides on the cached
compendium read and is the same for every viewer (CLAUDE.md, rule 6). The reviewer's id is not:
every finder over `ingredients` selects `readColumns(ingredients)` from
`src/db/repository/unread-columns.ts`, which leaves out `curator_reviewed_by`, and the row types
leave it out too (`UnreadIngredientColumn`). The mutation `setCompendiumEntryReviewed` calls
`expireCompendium()`, so a change shows at once. The admin's switch reads the mark with
**`findCompendiumReview(curator, id)`** through `readCompendiumReview(session, id)`, which throws
`Forbidden` for anyone who does not curate. The Reviewed filter and its counts stay curator-only.

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

**`findCompendiumFacets(filter)`** (M12.3) answers "how many entries would I
see if I picked this value?" for every value of every search filter, so the
filter panel can show a number beside each choice. It lives in
`src/db/repository/ingredient-facets.ts` and returns a `CompendiumFacets`: seven
lists of `{ value, count }`, one per filter kind — forms, deities, categories,
zodiac signs, celestial bodies, elements and toxic — the No Refs count, and
`reviewed`: how many entries are reviewed and how many need review, counted
under the rest of the filter with its own setting left out (M14.8). The
service `compendiumFacets(filter, viewer)` returns `reviewed` as null for a
viewer who does not curate, the rest unchanged. The
rules:

- **A value's count is what the list would hold with that value as the only
  choice of its kind**, the rest of the filter unchanged. So with `forms: ['Oil']`
  and `toxic: 'toxic'` chosen, Resin's count is how many toxic entries come as
  a resin, not how many come as both an oil and a resin. `tests/db/repository/ingredient-facets.test.ts`
  checks each count against `findCompendiumCount` under eight filters.
- **Categories under `categoryMode: all` are the exception.** There an entry
  needs every chosen category, so each category is counted together with the
  ones already chosen: it says how many entries picking it as well would leave.
  Under `any` the categories are counted like every other kind.
- **The fixed vocabularies come back whole.** Every live curated zodiac sign
  and celestial body, by `position` with nulls last, then by name (a curator's addition has none, so follows the seeded ones; M12.52), every element in `INGREDIENT_ELEMENTS`' order,
  and `toxic` then `not_toxic`, zeros included, so the panel can list them
  all.
- **The open-ended kinds list only what counts.** Forms, deities and
  categories list each value some entry carries, plus every chosen value at
  zero if nothing carries it, so a choice never vanishes from the panel. They
  sort alphabetically in SQL under the natural-language collation
  `"en-US-x-icu"`, never by count (M12.52; the record is
  `claude-docs/design-decisions/m12.52-facet-sort-order.md`): a category by
  group name then name, a deity by tradition name then name, both read in the
  query itself, and a chosen value at zero in its alphabetical place. Forms
  sort by the same rule in JavaScript with `Intl.Collator('en-US')`, since a
  form's spelling is only known after its group is read and the read has no
  query to spare. Deities and categories are named by id.
- **A form is spelled as its curated row,** when a live curated form folds
  to the same text, else as most of its counted variants spell it, ties going
  alphabetically. Forms are grouped by the same case- and space-folding the
  `forms` filter matches with, so `Oil` and `oil` are one form.
- **The No Refs switch gets a count too, on the compendium only.**
  `withoutReferences` is how many entries cite no live reference, on
  themselves or on a live form, under the rest of the filter. The filter's own
  `withoutReferences` is set to true for it, so the number is the same
  whether the switch is on or off, and it reads through `citesNowhere` in
  `compendiumList` like every other kind. An entry whose only reference has
  been soft-deleted counts as citing nothing. The result type is
  `CompendiumFacets`, `IngredientFacets` plus this number; a coven's list
  has no such switch, so `findWorkspaceIngredientFacets` returns plain
  `IngredientFacets`. Classification (`nomenclature`) gets no count: it is
  leaving the search.
- **No Form is counted the same way (M12.30).** `withoutForms` is how many
  entries have no live variant under the rest of the filter, read through
  `hasNoForm`, whatever the switch's own setting. An entry whose variants
  are all soft-deleted counts. It shares one query with the No Refs count: the
  read lists the entries with both switches off and counts each arm
  (`citesNowhere`, `hasNoForm`) beside the other switch's own setting, so a
  switch that is on narrows the other's count as it narrows the list.
- **Nothing soft-deleted counts** (a soft delete marks a row deleted rather
  than removing it): not a deleted entry, variant, deity link or category
  pair, and not a deleted deity, category, sign or body either.

**How it reads.** Each kind is one grouped query (`GROUP BY`), built through
`selectFrom`'s aggregate form and the list's own conditions from
`compendiumList`, so a count cannot match differently from the list it sits
beside. They run at once with `Promise.all`, so a read costs eight
queries for the compendium (the seven kinds and the two switch counts, No Refs and No Form) and eleven
for a coven (the seven kinds, the two Source counts, the In Stock count and the Low Stock Only count), whatever the filter. With a search, each runs in its own transaction
that sets the 0.5 threshold, as the list does. Signs and bodies use a right
join from the vocabulary table, with the entries' conditions in the join, so a
sign no entry lists still comes back at zero. Elements and toxic need no
join: one query counts every setting at once with `count(*) filter (where …)`.

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
  private `compendiumList({ query }, membership)` as the coven's list, so the match is the compendium
  search's: word similarity at 0.5 against the label, the formal name, the
  live folk names and the live variants' forms and descriptions, accent-folded, best match first, under the compendium's weights, with a blank query
  listing by `(coalesce(label, name), id)`, the coven's label where it gave one. The service parses the query through
  `CompendiumFilter`, so a query under `MIN_QUERY_LENGTH` is a blank one here
  too. Only the scope differs: the proof's workspace or the compendium, split
  into the two groups below.
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
- **Two groups, the cupboard then the compendium (M12.19).** The finder
  answers `yours`, the coven's cupboard, then `compendium`, each ranked by
  score within itself and cut to its own limit, 8 and 8 to start (the
  constant is an estimate, tuned in the e2e test). `yours` is the coven's own
  live rows, and each live compendium row it holds a live
  `workspace_compendium_entries` row for, found by the label the coven gave
  it as well as the compendium's name: `compendiumList` and `searchMatch`
  take the proof and add that label as a sixth `UNION ALL` arm, weighted as
  the name is. `compendium` is every other live compendium row, through a
  keyed `NOT EXISTS` on the cupboard row, so an entry is in exactly one
  group. A retired entry (a soft-deleted compendium row) is in neither,
  whatever rows point at it, by the tombstone filter alone. The statement is
  two inner queries (the top ids of each group) and an outer keyset query
  over those ids with the group as its first sort key, so the cursor and the
  page keep working; each node's `group` rides on its edge as a `carry`. A
  `form` ranks inside each group, never across them.
- **A name match hides nothing.** The coven's own entry and the
  compendium's same-named one are both offered, in two groups (DESIGN.md §5).
  The picker stopped hiding the compendium entry at M12.19 and the coven's
  list at M12.18; M12.28 removed the predicate, a `NOT EXISTS` that matched a
  live local row on `identity_key`, or on the folded label when the local
  declared no formal name.
- **A `form` ranks, and filters nothing.** A non-blank `form` puts a rank
  first in the sort: 0 for an entry holding a live variant of that form
  (folded), 1 for one holding a form of the same curated group (a variant
  matched to a live `ingredient_forms` row by `form_id` or by folded
  name), 2 for the rest. The rank is part of the key, so the cursor and
  the count stay consistent.

### Facet counts

How many entries each filter value would list under the rest of the filter. The
public list takes no proof. A value's count is what `findCompendiumCount` reads
with that value as its kind's only choice, except that a category under `all` is
counted with the chosen ones beside it.

What each kind lists and in what order:

- Zodiac signs and celestial bodies list every live curated row, by position
  (nulls last) then name.
- Elements and toxic list every setting, zeros included, in the vocabulary's own
  order.
- Forms, deities and categories list the values some entry carries plus every
  chosen one (at zero if none carries it), alphabetically in natural-language
  order and never by count. A category sorts by group then name, a deity by
  tradition then name.
- A form is spelled as the live curated form that folds the same, otherwise as
  its counted variants most often spell it, ties alphabetically.

`withoutReferences` counts entries that cite no live reference, on themselves or
a live form, under the rest of the filter, with the filter's own
`withoutReferences` forced on so the number is the same whether the switch is on
or off. `withoutForms` is the same for the No Form switch. Both come from one
read. `withReview` is a curator's alone: false sends no statement for the
Reviewed counts and answers `reviewed: null`.

### Vocabulary finders

"Curated" means a live row under a live group or tradition, for the form page
(`findIngredientFormValues`) and for the autofill suggestions alike. The
autofill itself is in claude-docs/db/member-autofill.md.

Two facts sit beside them. The deity filter matches a name by an `EXISTS` over the
deity's live other names, so a folk name finds the deity. A curated form's rename
is refused when it would leave a compendium entry with two live forms of one name:
the check counts entries with a variant that picked the form and another variant
whose form already folds to the new name, before the write and again after the
unique index refuses one.

### Tier-scoped reads

Ingredient child tables (`ingredient_folk_names`, `ingredient_categories`,
`ingredient_variants` and the rest) carry no `workspace_id`, so they are read
under the parent's tier.

- `findManyOfIngredients` reads what the ingredient owns, and
  `findManyOfVariants` what one form owns, each through a correlated `EXISTS`
  over a live parent in the compendium or in a coven one of `memberships` proves.
  No proofs reads the compendium alone. A caller naming another coven's id gets
  no rows, rather than a filter applied after the fetch (rule 7).
- `heldBy` widens that by one case: a retired compendium entry whose cupboard row
  in that coven is live is read too, and so is a live form of it, so the coven can
  start a new jar of an entry it still holds. Without it only the live tiers are
  read.
- `findReadableVariant` and `findReadableVariants` return a live variant while its
  ingredient is live and in a readable tier, so another coven's form is no form
  at all. The plural takes many ids and omits any that is not readable, so the
  caller compares lengths.
- `findDeitiesOfIngredients` pairs each live deity link with the curated deity it
  names while that deity is live under a live tradition. A typed name, or a deity
  since retired, reads as the name the row holds with a null deity, and the
  retired deity is filtered like any other. It is unordered; a caller sorts by
  `position`.
- `findSubstitutesIncludingSoftDeleted` is the substitute escape hatch (see
  "Soft-delete filtering"). It skips the linked ingredient's filter and no other.
  The substitute's own tombstone filters, its parent must be live and readable,
  and the link must point where the parent's readers may look, the compendium or
  the parent's own coven, so a row written past the service's tier rule shows
  nothing. The linked ingredient is a left join under an alias, since the
  parent's correlated subquery reads `ingredients` itself.

### The coven list scope

`workspaceListScopeIncludingSoftDeleted` is what a coven's ingredient list reads:
the coven's own live entries plus the compendium entries a live cupboard row of
the coven names, as one keyed `EXISTS` on the row's `(workspace_id, ingredient_id)`
unique. The second arm admits a compendium entry a curator has retired, so it
stays listed until the coven removes it (claude-docs/db/workspace-compendium-entries.md,
"When the compendium retires the entry").

- The scope carries the tombstone filters itself, the own entry's here and the
  cupboard row's in `existsIn`, so its readers page it without one, and
  `inCompendium` keeps a coven's own deleted entry off the second arm.
- A jar does not decide membership, and an own entry sharing a compendium
  entry's name leaves both listed.
- The page and the facets read the same scope, so they hold the same rows.
- The coven-only `source`, `inStock` and `lowStockOnly` settings are read here, not in
  `compendiumList`, which the compendium's page and count share and where a
  coven's jars mean nothing.
- `holdsJarInStock` and `holdsJarLowOrOut` use a plain live-variant `EXISTS`, as the
  row is already the readable ingredient. A jar with no quantity is held
  unweighed: `inStock` is an `OR` with null, because `<> 0` alone reads null as
  unknown and would drop it, and `lowStockOnly` never matches it. The rule is
  `stockState`'s in `src/components/StockBadge/stock-state.ts`, and
  `tests/support/jar-states.ts` is the list both are tested against.
- `listColumns` reads `coalesce(cupboard row's, entry's)` under a coven's proof, so
  an override sorts, filters and counts where the coven put it, and an empty list
  it cleared matches nothing (`coalesce` takes `[]` as a value, as
  `applyCupboardEntry`'s `??` does). The join matches the proof's live row for a
  live compendium entry, so a coven's own entry reads its own columns. Without a
  proof each is the entry's column. It is raw SQL because `coalesce` has no
  builder.
- `heldInAnyOf` and `heldInNoneOf` (In My Covens, Not In) go through `existsIn`,
  which ANDs the cupboard row's tombstone filter, so a removed row does not hold
  the entry. A coven's own entries never match, as the compendium lists none.

### Ingredient suggestions

`findIngredientSuggestions`, the substitute picker, has two groups. `yours` is the
coven's cupboard: its own live entries and each compendium entry it holds a live
cupboard row for, found by the label it gave the entry as well as the
compendium's name. `compendium` is every other live compendium entry, through a
keyed `NOT EXISTS` on that row. An entry is in one group, an own entry and a
compendium entry sharing a name are both offered, and a retired compendium entry
is in neither.

Each group is matched and ordered as the compendium search is and cut at
`SUGGESTION_GROUP_LIMIT` (8, an estimate tuned in the e2e test). The result lists
`yours` first, pages by cursor, and carries each row's `group`. A blank `query`
lists both by name. `categoryIds` keeps entries carrying any of them, on the entry
or one of its variants.

`findSimilarIngredients` builds its three matches (display name, formal name, a
live folk name) as a `UNION ALL` under `id IN (...)`, not an `OR` beside the scope:
Postgres cannot turn a subquery inside an `OR` into a join, so that form walks
`ingredients` whole, and a `UNION`'s de-duplication walks `ingredients_pkey` whole
(claude-docs/db/fuzzy-matching.md).

### Search ranking

One ranking serves the compendium, a coven's ingredients and the grimoire.

- `weightedSearch` is a best-match search over several text fields, returned as a
  relation to join onto the listed table, with each row's rank and where its best
  field holds the query. It is one `UNION ALL` arm per field, so each arm's
  `where` is that field's own `<%` match, which an index can answer, and the
  position an arm reports belongs to the field it scored. An arm scores its
  field's `word_similarity` (which the index recheck has just computed), or 1
  where the field holds the query verbatim, times the field's weight. The rank
  is the best of a row's arms (`max … group by id`), so a row two of whose fields
  match is still one row, with the best arm's position, earliest first among
  equal arms. The threshold is the keyset read's, so the order using it must say
  `wordMatch`. `query` is trimmed and never blank.
- `foldedWordMatch(query)` supplies the pieces. `matches` is word similarity
  (`<%`) and `similarity` its score, each side folded through
  `unaccent_immutable` so the expression indexes of migration 0027 answer it.
  `contains` holds where the text holds the query verbatim, folded the same way
  and lower-cased, because `<%` ignores case and `word_similarity` scores against
  whole words: a caller ranks a fragment inside a longer word (`wood` in
  Sandalwood) as a full hit with it. `position` is the character where that
  verbatim match starts, or `NOWHERE`, and orders hits of equal score so Wood Ash
  leads Sandalwood. It uses `strpos` rather than `ilike` because `strpos` reads
  the query as plain text, where a pattern would need `%`, `_` and `` escaped.
- `SEARCH_WEIGHTS` gives every field its own weight. A boost on the label alone
  would leave a formal name, a folk name, a form and a description tied, so a
  word in a variant's prose would rank with the entry's own formal name.
- `searchMatch` matches the label, the formal name, a live folk name, and the form
  or description of a live variant, as five arms of `weightedSearch`; the indexes
  `ingredient_variants_unaccent_trgm` and 0027's expression indexes answer them.
  A field only scores where it matched itself, so a weak hit in a heavier field
  never outranks the field that matched. The arms are plain columns, so the order
  and the page bound read them per matched row, not a correlated folk-name
  subquery per compendium row. A blank query means no search.
- `compendiumList` builds the arms and the key with the search's join in one
  place, so the count reads the rows the pages hold in the order they hold them.
  A search keys `[-rank, position, name]`, the rank negated so one ascending row
  comparison bounds it; a browse keys `[name]`.

### Filter arms

Each filter kind is a predicate built once and shared by the page, the count and
the facets, so they cannot disagree.

- `categoryArms` under `all` is one correlated `EXISTS` per id, so an entry must
  carry every one. Under `any` it is a single `EXISTS` over the list, which also
  keeps an entry holding two of them from being found twice. The category may be
  filed on the entry or on a live form. A variant's pair names the ingredient
  too, so the union comes free, but the table is hard-deleted and its pairs
  outlive a soft-deleted variant, so the variant's liveness is read here (and by
  `pairIsLive`, which takes the pair's column so an aliased read can ask too).
  The category itself must be live, through `pointsLive`.
- `stated` drops blank values from a list filter, so `['', 'Mars']` filters by Mars
  and `[' ']` by nothing; the fold stays in SQL, beside the column's own.
  `listArm` is one `IN` per value, ORed, not an array overlap (`&&`), because the
  list's side has to be folded entry by entry, which `listFolds` does, and an
  overlap would compare raw spellings.
- `elementArm` is an array overlap on the entry's own list and a correlated
  `EXISTS` on a live variant's, so an entry is one row however many of its forms
  hold an element and a retired form's counts for nothing. Elements are a closed
  set, so nothing is folded. `formArm` and `deityArm` are correlated `EXISTS` for
  the same one-row reason, answered by `ingredient_variants_form_id_idx` and
  `ingredient_deities_deity_id_idx`.
- `pointsLive` requires the curated row a link names to be live and its group
  live too, which is what the facets' join reads, so a value the facets count at
  nothing lists nothing. A curator cannot delete a row a compendium entry links,
  but a coven's own entry keeps its link through the delete.
- `toxicArm` is toxic when the entry's own flag is on or a live variant's is. Not
  toxic is the negation of the same predicate, so the two settings always split
  the list between them.
- `reviewArm` reads `curator_reviewed_at`, which a CHECK keeps set exactly when
  `curator_reviewed_by` is. `findCompendiumReview` returns that time as epoch
  milliseconds, as a column inside an aggregate loses Drizzle's date mapping and
  a `Date` holds no finer anyway.
- `citesNowhere` is the admin's to-do list: an entry whose only source is on its
  oil is sourced (the union rule), so it is not on the list. `hasNoForm` lists
  entries nobody can stock or put in a spell yet; a soft-deleted variant is none,
  through `existsIn`.

## Hidden entries (M14.35)

An entry with `shown = false` is excluded in SQL from the public read: the list, its search and counts, the slug finder and its redirects, the picker and `ingredients-by-id`, so a hidden slug is a 404. The `listing` filter (`shown`, the default, `hidden` or `all`) is a curator's: a call from anyone else that sets it is refused with `Forbidden`, because the cache is keyed by the parsed filter. A coven's cupboard is read without the arm, so an entry it names stays visible there, as do the admin screens and the audit queue.

An entry lands hidden when neither it nor any of its forms names a category; a category only on a form keeps the entry shown. The category filter and its counts match the union of an entry's categories and its live forms'. **What a result card shows** (M14.39) is that union too. `cardCategoriesOf` (`src/modules/ingredients/services/ingredient-children.ts`) answers each ingredient of a page with its own categories, by name, then the categories only its live forms carry, by name, each with the forms that carry it; a category on both the ingredient and a form is its own. It is one batch for the page: the own pairs and the live forms through `findManyOfIngredients`, then the forms' pairs through `findManyOfVariants` asked by the live forms' ids, since the pair table is hard-deleted and a soft-deleted form's pairs outlive it. `readCardCategoriesOf` (`src/app/compendium-reads.ts`) adds the group colours and names each form as the screen does (`formLabel`), and the compendium's cards, the admin Compendium table and a coven's cupboard all read through it, so they agree. `CategoryChips` draws a form-only chip outlined, with a tip naming its forms ("On: Oil, Dried Leaf"). `Ingredient.categories` in GraphQL stays the ingredient's own rows (MB.215) (`claude-docs/design-decisions/m14.38-form-categories-in-search.md`).
