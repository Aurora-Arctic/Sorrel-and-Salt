## Soft-delete filtering and the partial-index convention (M1.20)

CLAUDE.md rule 4 / DESIGN.md §5: **no exported query can return a soft-deleted
row, and no call site does its own filtering.** `src/db/repository/select.ts`
holds the two places a read query is built — `selectFrom`, and `existsIn` for a
correlated subquery — and the repository exports three functions on top of the
first:

- **`findMany(table, where?)`** — every matching row with `deleted_at IS NULL`
  ANDed onto the caller's `where`, or the `where` alone on a table that carries no
  such column. The default finder.
- **`findOne(table, where?)`** — the first row `findMany` returns, or `undefined`.
  There is no separate unfiltered path underneath it.
- **`findManyIncludingSoftDeleted(table, where?)`** — the dedicated escape hatch,
  for admin restore paths only (a trash view or undo). Its name says what it does
  at the call site rather than a `{ includeDeleted }` flag a later edit could
  default the wrong way; nothing else may bypass the filter, so a second bypass is
  a decision argued for in the diff.

There are further named hatches, each ending `…IncludingSoftDeleted`, from five
decisions:

1. **What a spell holds.** `findIngredientsInSpellsIncludingSoftDeleted` and
   `findManyOfSpellIngredientsIncludingSoftDeleted` read an ingredient past its
   tombstone, and `findFormsInSpellsIncludingSoftDeleted` its forms past theirs,
   and nothing else past one, for a member who may read a spell holding it
   (["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53)).
2. **The ingredient a substitute links.** `findSubstitutesIncludingSoftDeleted`
   reads it past its tombstone so that the substitute shows its last name, and
   nothing else past one (DESIGN.md §5, `ingredient_substitutes`), for an
   ingredient's own rows or, with `of: 'variant'`, a variant's. The substitute's
   own tombstone filters, the parent is live by `existsIn` and in a tier the proofs
   read, and the link must point at the compendium or the parent's own coven, so a
   row written past the service's tier rule reads as nothing.
3. **A co-member's name.** `findCoMemberNamesIncludingSoftDeleted` reads the
   asked-about users' seats in the viewer's covens, a removed member's tombstoned
   seat included, and left-joins each to its user row, a deleted user's included,
   so that a deleted user reads under the name their row last held. The viewer's
   own seat and the coven are live by `existsIn`, and the finder returns an id and
   a name, never the row ([`auth/display-names.md`](../auth/display-names.md)).
4. **A compendium entry retired while a coven still uses it.**
   `findCupboardEntryIncludingSoftDeleted` reads the entry past its tombstone, and
   only while the proof's coven has a live cupboard row naming it. The cupboard
   row's own tombstone filters, the entry must be a compendium one, and the proof's
   `workspace_id` scopes the row. The entry's children and jars follow through
   `inUseIngredientParent` and `inUseVariantParent` in `ingredient-parent.ts`,
   which a finder takes as an optional last `heldBy` proof: one `EXISTS` over the
   ingredient that admits it live and in a tier the proofs read, or in the
   compendium with a live cupboard row of `heldBy`'s coven. That `EXISTS` is
   `existsInIncludingSoftDeleted` in `select.ts`, which skips `existsIn`'s
   tombstone filter so the first arm can put it back; it is not in the index
   ([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "When the
   compendium retires the entry").
5. **The coven's Ingredients list**, under "The cupboard's internal finders" below.

`findSubstitutesIncludingSoftDeleted` reads each substitute and its linked
ingredient in one statement, through `selectFrom`'s left join: a `LeftJoin` option
names a second table and its `on`, and each row comes back beside the joined row,
or `null` where none matched. The joined table takes no filter from `selectFrom`,
which is the point of this one finder and why the option carries the caller's `on`
and `where` alone. The linked ingredient is the alias `linked`, since the parent's
correlated subquery reads `ingredients` itself. `findReferencesOf` is the option's
other user, and no hatch: its `on` holds the reference to `deleted_at IS NULL`, and
its `where` takes only a row that joined one, so it reads as an inner join with
every tombstone filtered ([`references.md`](references.md)).

Neither builder is in the repository's surface — their siblings import them, and
nothing outside the folder may (["The repository's files"](repository-files.md)) —
so there is no public handle a finder could reach the database through while
skipping the filter, the same shape as `AuditWriter` gives writes no path around
`applyAudit`.

**A read inside a write runs on the write's transaction.** `selectFrom` takes the
transaction `withAudit` published through `unit-of-work.ts` when one is present and
the bare client otherwise, so the soft-delete filter is applied in the same place
whichever connection runs the read. Inside a write that connection is the write's
own: the read sees the write's uncommitted rows and its published actor, and cannot
deadlock behind a lock queued after the write
([`write-path.md`](write-path.md), "Reads inside a write"). `existsIn` only builds
SQL and is unaffected.

**`existsIn(table, where)` is the second builder.** A finder whose scope lives on a
parent row — `findManyInSpell`, `findManyOfIngredients`, `findMembershipsOfUsers`,
and the provisional-account delete's check for an `accounts` row — narrows by a
correlated `EXISTS` over that parent, and the parent's own `deleted_at IS NULL` has
to be inside the subquery; `findIngredientsInSpellsIncludingSoftDeleted` nests two,
the spell inside the layer. A subquery written as an `sql` string is what the guard
cannot read, leaving each filter to its caller to remember. `existsIn` builds the
subquery on the same `db`, ANDs `notSoftDeleted(table)` itself — `undefined`, and so
dropped by `and()`, for a table without the column, `accounts` among them — and
returns `SQL` rather than the builder, so a caller can neither append to it nor
await it. The outer row is named through its own table's columns, which Drizzle
qualifies, so the subquery correlates without an alias. What stays a `sql` string is
what no builder can say — ["Where queries may be built"](repository-files.md) lists
it.

**The mechanical guard.** This is a code sweep (CLAUDE.md's sweep-task rule), so it
is a mechanism plus a guard, divided between two guards by what each can make
impossible.

`tests/guards/soft-delete-finder-guard.test.ts` covers the inside of the
repository, read as text, in three cases: every finder the index re-exports, other
than the escape hatches and the pinned callers of an internal hatch, either calls
`notSoftDeleted(...)` directly or delegates to one that does; the hatches are a
pinned list, each named `…IncludingSoftDeleted`, so a new one is a decision in the
diff; and the folder's internal hatches, the ones the index does not export
(`existsInIncludingSoftDeleted` and the cupboard list's scope and pager pair), are
each pinned to the only functions allowed to call them: a call anywhere else fails,
and a finder reaching a hatch never counts as delegating to a filter. The finders
are read off the index itself, so a new finder is checked without being listed. What
each hatch still filters — the spell hatches skip the ingredient's tombstone alone,
the substitute hatch the linked ingredient's alone, the co-member hatch the
asked-about user's seat and row alone, the cupboard hatch and the list's scope the
compendium entry's alone — is its service's READS table's to prove
([`testing/layer-ownership.md`](../testing/layer-ownership.md), "The owning
layer").

A query built _outside_ the repository is the linter's job, not this test's — see
["Where queries may be built"](repository-files.md).

**The partial-index convention.** Every unique index in this schema must carry
`WHERE deleted_at IS NULL`. Without it, a plain `UNIQUE` constraint still matches a
soft-deleted row's value, so deleting a record permanently reserves its
name/slug/whatever the index covers — the opposite of "deleted records stay
recoverable but invisible." An index whose only predicate is the tombstone is built
by `liveUnique` in `src/db/schema-parts.ts`, which writes the predicate itself, so a
table cannot forget it or spell it differently; `users_email_unique`
(`src/modules/identity/schema/users.ts`) is the worked example:

```ts
liveUnique('users_email_unique', table, table.email);
// uniqueIndex('users_email_unique').on(table.email).where(sql`${table.deletedAt} is null`)
```

An index with a predicate of its own beside the tombstone — a tier, a nullable link
— is still written out, `and ${table.deletedAt} is null` last; the seed key's is
`seedKeyUnique`, beside `liveUnique`, for the vocabularies and `references`.

`tests/db/partial-unique-indexes.test.ts` proves the convention on every partial
unique index the catalogue holds: a second live row is still rejected, while
soft-deleting the first frees the slot.

**`users.email` is also held to lower case** (`users_email_lower_case`). The unique
index is on the raw column, so without it two live rows could differ by case alone,
and both would match `ADMIN_BOOTSTRAP_EMAIL`, which is compared case-insensitively.
Better Auth lowercases every address it writes; the constraint catches a row written
by hand.

### The cupboard's internal finders

The coven's Ingredients list, its pager count and its filter counts keep showing a
retired compendium entry while the coven's live cupboard row names it, and stop once
the coven removes the row. The rule lives in one scope in `ingredients.ts`,
`workspaceListScopeIncludingSoftDeleted`, built from the ordinary builders:

- the coven's own entries, with their tombstone filter, `notSoftDeleted`;
- or a compendium entry (`inCompendium`), live or retired, that a cupboard row of
  the proof's coven names, through `existsIn`, which keeps the cupboard row's own
  tombstone filter.

The list and its count page that scope through `findPageInScopeIncludingSoftDeleted`
and `findPageCountInScopeIncludingSoftDeleted` in `finders.ts`: `findPageInScope`
and its count without the tombstone filter they would otherwise add, since the scope
carries its own. The facet counts read the scope directly through `selectFrom`. None
of the three is in the index, and the guard pins each to the finders allowed to call
it. The public list and its search, the add flow's exact match, the ingredient
picker and `findReadableVariant` stay live-only
([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "When the
compendium retires the entry").
