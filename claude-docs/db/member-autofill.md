## The member's autofill (MB.94)

`findVocabularySuggestions(memberships, vocabulary, query, page)` in
`src/db/repository/vocabularies.ts` is the read behind `planetSuggestions`,
`zodiacSuggestions`, `formSuggestions` and `deitySuggestions`
([`graphql/schema.md`](../graphql/schema.md)). Its services are
`suggestPlanets`, `suggestZodiacSigns`, `suggestForms` and `suggestDeities` in
`vocabulary`, which ask `ingredient: ['read']`: the curated rows are global, and every in-use value
is one a reader of the workspace could already list. **The proofs are a list**
(M5.5), as `findManyOfIngredients` takes them: a coven's lookup passes its
one, and the admin's compendium form none, which reads the compendium alone.
A caller names a table and
nothing else. The ingredient column each table suggests for is paired in the
repository's `IN_USE`, keyed by table name, so a caller cannot hand `planets`
the `zodiac_signs` list, and a fifth vocabulary does not compile until it
names its column. `planets` and `zodiac_signs` are paired with the lists of
the same names, `ingredient_forms` with the single `form` (M4.7a), and
`deities` with the rows of `ingredient_deities` (MB.167).

One page is one statement: a `UNION ALL` of three tiers, sorted, bounded and
cut by cursor as a whole.

| Tier | Rows                                                                                                                | Matched by                          |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0    | live curated rows whose name matches                                                                                | `name % query` or `query <% name`   |
| 1    | live curated rows whose description alone matches                                                                   | `query <% description`              |
| 2    | values on live ingredients in the compendium or a proof's workspace, folding to no live curated row's `lower(name)` | `value % query` or `query <% value` |

- **A description matches by `<%`, never `%`.** `%` compares whole
  strings, and a query is a word or two against a sentence: `serpent` is 0.12
  similar to Ophiuchus's description and `black moon` 0.22 to Lilith's, far
  under 0.4. `<%` is word similarity, the query against the best-matching run
  of words in the text, and scores both 1.0. It is a trigram operator too, so
  ["Fuzzy matching"](fuzzy-matching.md)'s rule still holds, and its threshold
  is the second one `selectFrom` sets.
- **A name or an in-use value matches by either.** `<%` completes a typed
  prefix: `mer` is 0.33 similar to Mercury and 0.75 word-similar. A name
  should never be harder to find than its own description.
- **Each tier is alphabetical, case-folded**, not ranked by score. The tiers
  carry the ranking the story asks for — a name match before a description
  match, curated before in use — and a name is an exact cursor key where a
  float score is not.
- **A list is read entry by entry** (MB.136). An `InUseSource` is a
  `column` or a `list`, and `inUseRows` turns a list into
  `ingredients cross join lateral unnest(list) as entry(value)`, one row per
  entry, before anything trims or folds it. The scope and the soft-delete
  filter are still the ingredient's, so an entry is in scope exactly when its
  row is, and the grouping below makes a value held by several lists, or
  twice by one, a single suggestion. A row with no list unnests to nothing.
  `deities` was read the same way (MB.130) until MB.167 made it a `child`
  source: `ingredient_deities`' live rows inner-joined to their ingredient,
  each row's `name` a value, so the ingredient's scope and filter still
  decide it.
- **An in-use value is folded to `lower(btrim(value))`**, so `Moon`, `moon`
  and `Moon` are one value, offered in the spelling most of those entries
  use (`mode()`, a tie broken by sort order). A blank value is no value. A
  fold equal to a live curated name is never in tier 2, whether or not that
  row matched the query, so a value is offered once, as the curated row, or
  not at all. Soft-deleting a curated row moves a coven's spellings of it
  into tier 2. A compendium entry's never arrive there, since a row a live
  entry holds is not deleted (MB.162).
- **Tier 2 reads both tiers of `ingredients`**, the compendium and the proof's
  workspace and never another — the compendium alone with no proof — so the finder is on
  [the tier seam](../modules.md#the-tier-seam). The scope is in the statement,
  so a value that only unrelated workspace X holds never reaches the service.
  The compendium half finds nothing since MB.162, which holds every
  compendium entry to the curated rows, so every tier-2 row is the
  workspace's — what lets MB.131 head the tier "From Coven".
- **A blank query matches everything**, so an opened field can list the whole
  vocabulary before anything is typed. The statement still runs under the
  thresholds, with no trigram predicate in it.
- **The union is read through `selectFrom`.** `selectFrom` takes a
  `Derived` — a parenthesised statement and the columns read off it — in
  place of a table, in its `Similarity` mode, so the rule that every read is
  built in `select.ts` and the thresholds hold for a read no one table holds. The finder writes its
  own keyset bounds: a cursor's key is the two parts `[tier, fold]` and its
  id the tie-break, which is the curated row's id or the fold, compared as the
  row `(tier, fold, tiebreak)`. A key of any other length, or naming a tier
  there is not, throws `InvalidCursor`, as a cursor that will not cast does in
  `findPage`.

**Every row carries an `id`** (MB.167): the curated row's in tiers 0 and 1,
null in tier 2. Form and deity suggestions expose it, since it is what a pick
sends; a planet or sign records no pick, so its suggestion does not.

**A form suggestion carries two things more** (M4.7a), and only a form's
carries both — the finder is overloaded on the table, so a planet or sign
suggestion has neither, and a deity's has the first alone, below:

- **Its group.** `ingredient_forms` is unique on the slug alone, so two live
  rows may share a display name ("Wax", animal and substance), and
  `ingredients.form` stores the string. The group is the only thing that tells
  them apart, so tiers 0 and 1 join `ingredient_form_groups` and return its
  name, and the tie-break is `lower(group name) || ' ' || id`, so a
  same-named pair reads in group order. **A form is curated only while its
  group is live too**: the join filters both `deleted_at`s, in tiers 0 and 1
  and in tier 2's "folds to no live curated name", so a form under a
  soft-deleted group is offered as an in-use value with no group, and a dead
  group's name is never returned. Deleting a group first moves its live forms
  to another live group the admin picks, each re-slugged there, in the same
  transaction (M5.6b), so no compendium entry's pick and no coven's is left
  under a dead group by it. A form reaches tier 2 this way only through the
  race the delete names: one added under the group in the instant between
  the delete's read of its forms and its write.
- **Its claimants** — every live ingredient in the compendium or a proof's
  workspace whose `lower(btrim(form))` equals the suggestion's fold, as
  `{ name, canonicalName }`, formal names first (`nulls last`), then label,
  then id. A second, scoped read of `ingredients`, aggregated once by fold
  and left-joined onto the page — every claim rather than only those
  matching the query, since a form found by its description is claimed under
  its name. `json_agg`, not `jsonb_agg`, so the order it is built in is the
  order read. Both same-named forms carry the same claimants, since the
  string is all an ingredient holds.

**A deity suggestion carries its tradition** (MB.130), as a form's carries
its group, and for the same reason: `deities` is unique on the slug alone,
and a reader choosing among 216 chooses by tradition, "Hecate (Greek)"
([`deity-vocabulary.md`](deity-vocabulary.md)). The finder treats the two
alike: `groupingOf` finds each two-tier vocabulary's group table and the key
filing a row under it in `TWO_TIER` (`src/db/vocabularies.ts`, MB.208), and tiers 0 and 1 join through it, so **a deity is
curated only while its tradition is live too**, both `deleted_at`s filtered
in all three tiers, and a dead tradition's name is never returned. **It
carries no claimants.** A form's claimants show which entries already share
an identity with the one being written, and a deity is no part of an
ingredient's identity, so `DeitySuggestion` is `FormSuggestion` without
them, and the claim join is not made.

**The common-name autofill** (M4.7a) is `findCommonNameSuggestions(memberships,
query, page)` in `src/db/repository/common-names.ts`, the read behind
`commonNameSuggestions`, whose service is `suggestCommonNames` in
`ingredients`. There is no curated vocabulary of common names, so it is
tier 2 alone, keyed and cut exactly as above by the shared
`readSuggestionPage` (`suggestion-page.ts`):

- **An in-use common name is a live in-scope ingredient's display name or a
  live folk name of one**, a `UNION ALL` of two arms folded to
  `lower(btrim(name))` and offered once, in the spelling most of them use.
  The display name is read because it is one — "Cat's Claw" is the label of
  five seeded rows and of §5's own example — and picking a suggestion writes
  a folk-name row either way. **A formal name is not read**: it is identity,
  not something this field writes.
- **Each arm matches its own column** by `%` or `<%`, so each can reach
  its own trigram index, and the fold follows. Trigrams ignore case and
  punctuation, so every spelling of a fold matches alike and a claimant is
  never lost to the query.
- **The claimants are the group's own rows**, each ingredient once: one whose
  label and a folk name fold alike appears in both arms, so a
  `row_number()` over `(fold, ingredient)` filters the aggregate.

**Its plan is asserted, unlike the vocabularies'.** Both tables grow with
use, so `common-names-plan.test.ts` plans the statement the service sends,
as `duplicates-plan.test.ts` does, and asserts `ingredients_trgm` and
`ingredient_folk_names_trgm` are both probed. Two things were measured on
the way:

- **The display-name arm is matched beside the scope, and that is the
  planner's call to make.** Below some tens of thousands of entries it walks
  `ingredients_compendium_identity_unique` — the scope's
  `workspace_id IS NULL` is that index's partial predicate — and filters by
  name; the probe wins above it. Measured on a 10,000-entry compendium the
  walk took 31 ms where the probe takes 1, tolerable behind a debounced
  field. The test seeds 50,000 entries, which it needs: at 30,000 the full
  statement still walks.
- **`findSimilarIngredients`' `id IN (…)` shape does not transfer.** Over a
  single table it is a self-join on the primary key, which Postgres 18's
  self-join elimination removes, leaving the same plan. It survives there
  only because its `IN` is a union over two tables.

**No planner assertion for the vocabularies.** At nineteen, thirteen,
seventy-eight and 216 rows `planets_trgm`, `zodiac_signs_trgm`,
`ingredient_forms_trgm` and `deities_trgm` are never chosen over a
sequential scan, and nothing asserts the SQL text either: since MB.227 a
statement is read only as the precondition of a plan test. The thresholds,
the scope, the soft-delete filter and the fold are proved by what the
services answer — `suggestions.test.ts`,
`form-suggestions.test.ts`, `deity-suggestions.test.ts` and
`common-name-suggestions.test.ts` hold the
behaviour, each refusal and scope case with the precondition that made it
possible; a soft-deleted ingredient's dropping out of each is the `READS`
tables' in `workspace-ingredients.test.ts` and `compendium-entries.test.ts`
(MB.187).
