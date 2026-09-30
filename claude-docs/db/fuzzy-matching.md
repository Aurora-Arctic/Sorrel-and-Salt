## Fuzzy matching: one index, and a rule every caller is bound by (M4.6)

**`ingredients_trgm` is one multicolumn index, not two single-column ones.**
`USING gin (name gin_trgm_ops, canonical_name gin_trgm_ops)` — a multicolumn
GIN index is reachable from a predicate naming either column on its own, which
is a property of the access method rather than a hope, and
`ingredients-trigram.test.ts` asserts it by `EXPLAIN` for each column
separately. Reduce it to `name` alone and the `canonical_name` assertion
reddens. It is neither unique nor partial: the three unique indexes _reserve_
an identity, so a tombstone must fall outside them, while this one only answers
"what is this called" for a finder that filters `deleted_at` itself.
`ingredient_folk_names_trgm` stays its own index over its own table (M4.4a),
and is reached independently.

**The index is only half of it. A match must be written `name % $1`, with
`pg_trgm.similarity_threshold` set per transaction — never
`similarity(name, $1) > 0.4`.** The two return the same rows, so nothing but
the query plan tells them apart, and getting it wrong is silent in both
directions:

- `similarity(a, b) > 0.4` is a **function call**, and no trigram index can
  answer one. Only the operators (`%`, `<->`) are indexable. A query written
  that way sequentially scans `ingredients` no matter what indexes exist — and
  it does so even with `enable_seqscan = off`, which is how the test asserts it
  rather than merely observing a planner preference.
- `%` alone means "similar by `pg_trgm.similarity_threshold`", which defaults
  to **0.3**, not the 0.4 DESIGN.md §9 specifies. So the threshold is set with
  `SET LOCAL` inside the matching transaction, and does not leak past it.

One is a correctness bug in the results, the other a performance bug invisible
until the table is big.

**The threshold is set by `selectFrom`, not by its callers.** A finder asks
for a similarity read by handing `selectFrom` a `Similarity` — an `orderBy`
and a `limit` — in place of a `Keyset`, and `selectFrom` then opens a
transaction, runs `select set_config('pg_trgm.similarity_threshold', '0.4',
true), set_config('pg_trgm.word_similarity_threshold', '0.6', true)` in it,
and runs the read in the same transaction. `set_config(…, true)` is
`SET LOCAL` taking a bind parameter, as `withAudit`'s GUC is. So a finder
cannot forget either threshold, and each is written in one place. The second
is `<%`'s, word similarity, which is how a description is searched ("The
member's autofill" below); 0.6 is pg_trgm's own default, set anyway so the
server's configuration cannot move it. A keyset page can ask the same way.
A `Keyset` marked `wordMatch` is read in a transaction that first sets the
word threshold to the search's 0.5 ("The compendium read"). One marked
`similarityMatch` first sets the similarity threshold to the same 0.4
constant, which is how `findSimilarIngredients` pages (below). These are the
reads that open a transaction: they carry a planner setting, not an identity,
so they are not the read-side `withAudit` that MB.29 declined to build.

**`findSimilarIngredients` (M4.7) is the first finder bound by both halves.**
It answers story 16's "did you mean": live ingredients in the compendium or
the proof's workspace whose display name, formal name or a live folk name is
`%`-similar to the name, best first by the greatest of the three
similarities. It reads one keyset page at a time, keyed `[-score, name]` and
marked `similarityMatch`, and carries each row's score, because
`possibleDuplicates` (MB.11) pages it through the helper
(claude-docs/graphql.md, "`possibleDuplicates`"). Each row
carries `canonical_name`, which is what tells five Cat's Claws apart. The
three matches are a `UNION ALL` under `id IN (…)`, and each detail is
load-bearing:

- **Not an `OR` beside the scope.** Postgres cannot turn a subquery inside an
  `OR` into a join, so `name % $1 OR … OR id IN (folk-name subquery)` tests
  the subquery per row and walks `ingredients` whole.
- **`UNION ALL`, not `UNION`.** `IN` removes duplicates already, and
  `UNION`'s own de-duplication wants sorted input, which the planner gets
  cheapest by walking `ingredients_pkey` in full — an index scan that reads
  every row.

`findPossibleDuplicates` in `ingredients` is the service over it, and asks
`ingredient: ['read']`: every row it can return is one a reader of that
workspace could already list.

**Its `EXPLAIN` test needs more rows than M4.6's.** `duplicates-plan.test.ts`
captures the SQL the service actually sends, by rebuilding the connection with
a logger, and plans it with `enable_seqscan = off`. That is not enough on its
own. The folk-name arm filters `deleted_at IS NULL`, which is exactly
`ingredient_folk_names_unique`'s partial predicate, so that index offers a
whole-table walk the planner prefers to a GIN probe below about 20,000 folk
names. The test seeds 30,000 folk names with distinct (md5) trigrams, so the
plan shows a real choice between the probe and the walk. With 2,000 names
sharing one prefix, the plan shows the walk even for a query that can reach
the trigram index.

**Accent insensitivity is the compendium search's, through `unaccent`** (M8.5;
"The compendium read" below). It is not the fuzzy matches': `%` reads the raw
columns and the raw trigram indexes, and one diacritic barely moves a trigram
score, so the duplicate warning is accent-tolerant without folding. Folding it
too would be a small task of its own, not a gap.

Full column list, the CHECK constraints' exact text, and the
local-beats-compendium resolution query that reads these indexes: DESIGN.md
§5.
