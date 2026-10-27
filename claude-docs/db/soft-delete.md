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

There are six such hatches, from four decisions. The first is what a spell
holds: `findIngredientsInSpellsIncludingSoftDeleted` and
`findManyOfSpellIngredientsIncludingSoftDeleted` (M5.3) read an ingredient
past its tombstone, and `findFormsInSpellsIncludingSoftDeleted` (M10.9) its
forms past theirs, and nothing else past one, for a member who may read a spell
holding it (["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53)).
The second, decided by MB.138 and built by MB.140, is the ingredient a
substitute links: `findSubstitutesIncludingSoftDeleted` reads it past its
tombstone so that the substitute shows its last name, and nothing else past
one (DESIGN.md §5, `ingredient_substitutes`), for an ingredient's own rows or,
with `of: 'variant'`, a variant's (MB.218). The substitute's own tombstone
filters, the parent — the ingredient, or the variant and its ingredient — is
live by `existsIn` and in a tier the proofs read, and
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

The third, decided by MB.10, is a co-member's name:
`findCoMemberNamesIncludingSoftDeleted` reads the asked-about users' seats in
the viewer's covens, a removed member's tombstoned seat included, and
left-joins each to its user row, a deleted user's included, so that a deleted
user reads under the name their row last held. The viewer's own seat and the
coven are live by `existsIn`, and the finder returns an id and a name, never
the row ([`auth/display-names.md`](../auth/display-names.md)).

The fourth, decided by M12.24, is a compendium entry the curators have
retired while a coven still uses it: `findCupboardEntryIncludingSoftDeleted`
reads the entry past its tombstone, and only while the proof's coven has a
live cupboard row naming it, so the coven goes on reading what it holds. The
cupboard row's own tombstone filters, the entry must be a compendium one, and
the proof's `workspace_id` scopes the row. The entry's children and jars
follow through `inUseIngredientParent` and `inUseVariantParent` in
`ingredient-parent.ts`, which a finder takes as an optional last `heldBy`
proof: one `EXISTS` over the ingredient that admits it live and in a tier the
proofs read, or in the compendium with a live cupboard row of `heldBy`'s
coven. That `EXISTS` is `existsInIncludingSoftDeleted` in `select.ts`, which
skips `existsIn`'s tombstone filter so the first arm can put it back; it is
not in the index, and named as the hatches are so a second caller is a
decision in the diff
([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "When
the compendium retires the entry").

M12.32 carries the same rule onto the coven's Ingredients list. The list, its
pager count and its filter counts keep showing a retired compendium entry while
the coven's live cupboard row names it, and stop once the coven removes the row.
The rule lives in one scope in `ingredients.ts`,
`workspaceListScopeIncludingSoftDeleted`, built from the ordinary builders:

- the coven's own entries, with their tombstone filter, `notSoftDeleted`;
- or a compendium entry (`inCompendium`), live or retired, that a cupboard
  row of the proof's coven names, through `existsIn`, which keeps the
  cupboard row's own tombstone filter.

The list and its count page that scope through
`findPageInScopeIncludingSoftDeleted` and
`findPageCountInScopeIncludingSoftDeleted` in `finders.ts`:
`findPageInScope` and its count without the tombstone filter they would
otherwise add, since the scope carries its own. The facet counts read the
scope directly through `selectFrom`. None of the three is in the index. The
public list and its search, the add flow's exact match, the ingredient picker
and `findReadableVariant` stay live-only
([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "When
the compendium retires the entry").

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
re-exports, other than the escape hatches and the pinned callers of an
internal hatch, either calls `notSoftDeleted(...)`
directly or delegates to one that does; and the hatches are a pinned list,
each named `…IncludingSoftDeleted`, so a new one is a decision in the diff.
A third case pins the folder's internal hatches, the ones the index does not
export (`existsInIncludingSoftDeleted`, M12.24; the M12.32 scope and pager
pair), each to the only functions allowed to call it: a call anywhere else
fails, and a finder reaching a hatch never counts as delegating to a filter.
The finders are read off the index itself, so a new finder is checked without
being listed. What each hatch still filters — the spell hatches skip the
ingredient's tombstone alone, the substitute hatch the linked ingredient's
alone, the co-member hatch the asked-about user's seat and row alone, the cupboard hatch and the list's scope the compendium entry's alone — is its service's READS table's to prove
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
