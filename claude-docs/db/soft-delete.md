## Soft-delete filtering and the partial-index convention (M1.20)

CLAUDE.md rule 4 / DESIGN.md §5: **no exported query can return a soft-deleted
row, and no call site does its own filtering.** `src/db/repository/select.ts`
holds the two places a read query is built — `selectFrom`, and `existsIn` for
a correlated subquery — and the repository exports three functions on top of
the first:

- **`findMany(table, where?)`** — every matching row with `deleted_at IS
NULL` ANDed onto whatever `where` the caller supplied — or the caller's
  `where` alone on a table that carries no such column (MB.34). The default,
  and normal-use, finder.
- **`findOne(table, where?)`** — the first row `findMany` returns, or
  `undefined`. There is no separate unfiltered path underneath it.
- **`findManyIncludingSoftDeleted(table, where?)`** — the dedicated escape
  hatch, for admin restore paths only (DESIGN.md §14's trash view / undo). Its
  name says what it does at the call site rather than a `{ includeDeleted }`
  flag a later edit could default the wrong way; nothing else may bypass the
  filter, so a second bypass is a decision argued for in the diff, not a
  convenience appearing quietly beside an import.

There are three such hatches, from two decisions. The first is what a spell
holds: `findIngredientsInSpellsIncludingSoftDeleted` and
`findManyOfSpellIngredientsIncludingSoftDeleted` (M5.3) read an ingredient
past its tombstone, and nothing else past one, for a member who may read a spell
holding it (["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53)).
The second, decided by MB.138 and built by MB.140, is the ingredient a
substitute links: `findSubstitutesIncludingSoftDeleted` reads it past its
tombstone so that the substitute shows its last name, and nothing else past
one (DESIGN.md §5, `ingredient_substitutes`). The substitute's own tombstone
filters, the parent is live by `existsIn` and in a tier the proofs read, and
the link must point at the compendium or the parent's own coven, so a row
written past the service's tier rule reads as nothing.

That finder reads each substitute and its linked ingredient in one statement,
through `selectFrom`'s left join: a `LeftJoin` option names a second table
and its `on`, and each row comes back beside the joined row, or `null` where
none matched — a typed name here. The joined table takes no filter from
`selectFrom`, which is the point of this one finder and why the option
carries the caller's `on` and `where` alone. The linked ingredient is the
alias `linked`, since the parent's correlated subquery reads `ingredients`
itself. `findReferencesOf` (MB.153, MB.208) is the option's other user,
and no hatch: its `on` holds the reference to `deleted_at IS NULL`, and its
`where` takes only a row that joined one, so it reads as an inner join with
every tombstone filtered ([`references.md`](references.md)).

Neither builder is in the repository's surface — their siblings import them,
and nothing outside the folder may (["The repository's files"](repository-files.md)) — so
there is no public handle a finder could reach the database through while
skipping the filter — the same shape as `AuditWriter` gives writes no path
around `applyAudit`.

**`existsIn(table, where)` is the second builder** (MB.100). A finder whose
scope lives on a parent row — `findManyInSpell`, `findManyOfIngredients`,
`findMembershipsOfUsers`, and the provisional-account delete's check for an
`accounts` row — narrows by a correlated `EXISTS` over that parent, and the
parent's own `deleted_at IS NULL` has to be inside the subquery;
`findIngredientsInSpellsIncludingSoftDeleted` nests two, the spell inside the
layer. The four were
`sql` strings while the guard allowed the folder exactly one `.select(`, and a
string is what a guard cannot read: each subquery's filter was its caller's to
remember, which made them the least-checked reads in the repository and the
rule meant to prevent an unfiltered read the thing producing one. `existsIn`
builds the subquery on the same `db`, ANDs `notSoftDeleted(table)` itself —
`undefined`, and so dropped by `and()`, for a table without the column,
`accounts` among them — and returns `SQL` rather than the builder, so a caller
can neither append to it nor await it. The outer row is named through its own
table's columns, which Drizzle qualifies, so the subquery correlates without
an alias. What stays a `sql` string is what no builder can say — ["Where
queries may be built"](query-building.md) lists it.

**The mechanical guard.** This is a code sweep (CLAUDE.md's sweep-task rule),
so it landed as the mechanism above plus a guard — and since MB.33 the sweep is
divided between two of them, by what each can make impossible.

`tests/guards/soft-delete-finder-guard.test.ts` covers the inside of the
repository, read as text, in two cases (MB.224): every finder the index
re-exports, other than the escape hatches, either calls `notSoftDeleted(...)`
directly or delegates to one that does; and the hatches are a pinned list,
each named `…IncludingSoftDeleted`, so a new one is a decision in the diff.
The finders are read off the index itself, so a new finder is checked without
being listed. What each hatch still filters — the spell hatches skip the
ingredient's tombstone alone, the substitute hatch the linked ingredient's
alone — is its service's READS table's to prove
([`testing/layer-ownership.md`](../testing/layer-ownership.md), "The owning
layer").

A query built _outside_ the repository is the linter's job, not this test's —
see ["Where queries may be built"](query-building.md). It was this test's until MB.33, by
reading every tracked source file as text and looking for `.select(`, which
banned one spelling of a finder rather than the capability: `function findX()`
was caught and `const findX = () =>` was not, the global regex carried its
`lastIndex` between files, the brace matcher broke on a brace inside a string,
and it spawned `git` with a `safe.directory` workaround because CI runs the
container as root over a uid-1000 checkout. At Wave 2 there is exactly one table
(the scratch table in the repository's tests), which is the point: the guard
exists before there is anything to forget, and each later table's finder
adopts the mechanism in that finder's own PR rather than a retrofit pass.

**The partial-index convention.** Every unique index in this schema must
carry `WHERE deleted_at IS NULL`. Without it, a plain `UNIQUE` constraint
still matches a soft-deleted row's value, so deleting a record permanently
reserves its name/slug/whatever the index covers — the exact opposite of
"deleted records stay recoverable but invisible." An index whose only
predicate is the tombstone is built by `liveUnique` in
`src/db/schema-parts.ts` (MB.207), which writes the predicate itself, so a
table cannot forget it or spell it differently; `users_email_unique`
(`src/modules/identity/schema/users.ts`) is the worked example:

```ts
liveUnique('users_email_unique', table, table.email);
// uniqueIndex('users_email_unique').on(table.email).where(sql`${table.deletedAt} is null`)
```

An index with a predicate of its own beside the tombstone — a tier, a
nullable link — is still written out, `and ${table.deletedAt} is null` last;
the seed key's is `seedKeyUnique`, beside `liveUnique`, for the vocabularies
and `references`.

`tests/db/partial-unique-indexes.test.ts` proves the convention rather than
merely stating it, on every partial unique index the catalogue holds: a
second live row is still rejected, while soft-deleting the first frees the
slot.

**`users.email` is also held to lower case** (`users_email_lower_case`,
migration 0019, MB.60). The unique index is on the raw column, so without it
two live rows could differ by case alone, and both would match
`ADMIN_BOOTSTRAP_EMAIL`, which is compared case-insensitively. Better Auth
lowercases every address it writes; the constraint catches a row written by
hand. `tests/modules/identity/schema/users-schema.test.ts` inserts one.
