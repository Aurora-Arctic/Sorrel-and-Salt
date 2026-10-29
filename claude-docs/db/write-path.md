## The write path — `withAudit` (M1.16)

`src/db/repository/` is the only code that imports `db` from
`connection.ts` (CLAUDE.md rule 2, DESIGN.md §5), and it exports exactly one
write path: `withAudit(session, fn)`. `db` is not re-exported, and `fn` is not
handed the Drizzle transaction — it gets a narrow `AuditWriter` whose three
stamping methods each run their payload through `applyAudit` first. That is what makes
"a write outside `withAudit`" impossible through the public API rather than
merely discouraged: there is no exported handle to write with.

```ts
const [spell] = await withAudit(session, (write) =>
  write.insert(spells, { workspaceId, title: input.title }),
);
```

- **`write.insert(table, values)`** — stamps `createdAt`/`createdBy`/
  `updatedAt`/`updatedBy`, returns the inserted rows.
- **`write.update(table, values, where)`** — stamps `updatedAt`/`updatedBy`
  only; `createdAt`/`createdBy` are never in the `SET` list, so an update
  cannot rewrite who created a row.
- **`write.softDelete(table, where)`** — stamps `deletedAt`/`deletedBy` and
  leaves the row in place (CLAUDE.md rule 4). Typed to demand a `deletedAt`
  column, so it cannot be pointed at a hard-deleted join table with nothing
  to stamp.

**No update or soft delete reaches a soft-deleted row.** The writer ANDs
`deleted_at IS NULL` onto the `where` of every one of them, by the scoped and
by-id variants too, decided by the table's shape as the finders' filter is —
`notSoftDeleted(table)`, dropped for a hard-deleted join table, which has no
tombstone to skip. So a tombstone is never rewritten, a service updating a deleted row by
id finds nothing and answers `NotFound`, and a second delete cannot
overwrite who made the first. The way back to a deleted row is v2's restore,
a named method per tier, with an edit after it rather than in place
(DESIGN.md §13, "Edit history").

- **`write.delete(table, match)`** — removes the rows outright, for the two
  hard-deleted join tables only (MB.34). Typed to reject any table carrying `deletedAt`, so
  it can never become the way a soft-deletable row is quietly destroyed. The
  rows are named by column value — `{ ingredientId, categoryId: [...] }`, a
  list matching by `IN`, `null` matching `IS NULL` (MB.217, so
  `{ ingredientId, variantId: null, categoryId }` names the parent's own pair
  and not a form's) — since a service may not build an `SQL` predicate
  (MB.33; MB.125). A list left empty deletes nothing without a statement, and
  a match naming no column throws rather than emptying the table.

`values` is typed as the table's insert model **minus** the audit columns, so a call site can't even name `createdBy` without a cast — and if
one casts anyway, `applyAudit` strips it: audit ids come from the session,
never from a request body.

Everything inside one `withAudit` call runs in one transaction: if `fn`
throws, the whole transaction rolls back (including writes that already
succeeded before the failing one) and the error propagates to the caller
unchanged. A session with no `userId` is rejected before the transaction
opens, rather than stamping a blank acting user.

The read-side finder builder that applies `deleted_at IS NULL` (M1.20)
deliberately lands on top of this rather than beside it — see ["Soft-delete
filtering and the partial-index convention"](soft-delete.md).

### Table marks (MB.198)

Some tables are written only through named writer methods, because a row
authorises something or holds a state only a named call may move:
`admin_role_change_pauses` (MB.62), opened and ended by
`pauseAdminRoleChanges` and `resumeAdminRoleChanges`, and `invitations`
(MB.201), made, accepted and revoked by its named insert, accept and revoke. Such a table says so once, in its schema file:

```ts
export const adminRoleChangePauses = namedWrites(pgTable('admin_role_change_pauses', { … }));
```

`namedWrites`, in `src/db/table-marks.ts`, is a cast and nothing more. It
types the table as `NamedWrites`, `{ readonly $writes: 'named' }`, and adds no
property, so drizzle-kit and every query see the same object. Every generic
writer method takes `Generic`, `{ $writes?: never }`, which a marked table
cannot satisfy: the six unscoped ones (`insert`, `update`, `updateById`,
`softDelete`, `softDeleteByIds`, `delete`), the six workspace-scoped ones
(`updateRevisioned` among them, M13.16)
and the three compendium-tier ones, so a marked two-tier table is off the
proof-scoped methods too. `$writes` is a phantom key beside Drizzle's
`$inferSelect`, so no column can be named like it. Both types are in
`src/db/types.ts`.

**Why a mark, not a marker per table.** Before it, each such table was
refused by a type keyed on a column it alone happened to carry,
`NotPauseLedger` on `ended_at` and `NotInvitation` on `token_hash`, each
added to six signatures. A third named table would have added a third marker
to every one of them, and an unrelated table that later took one of those
column names would have been refused by accident. The mark is the table's
own statement, and nothing else reads it.

**Where the named writes live.** Beside the table's finders, in its
repository file, rather than in `write.ts`: `admin-roles.ts` exports
`adminRoleWrites` and `invitations.ts`
`invitationWrites`, each a function of a `WriterContext` (the
transaction, the session, and the writer's own stamped `insert` and
`update`), whose result `writerFor` spreads into the writer. So a new marked
table touches its own repository file, and the writer's surface,
`AuditWriter`, is where its methods are argued for, as before:
`write.test.ts` still pins their number.

**One read sits among them** (MB.59): `adminRoleWrites` also holds
`lockLiveAdmins`, the live admin rows locked `for update` in id order, which
the admin revoke counts before it writes so two revokes at once cannot leave
no admin ([`auth/admin-users.md`](../auth/admin-users.md), "Granting and
revoking admin"). It is in the writer only because the lock must be taken in
the transaction that writes, and it is still built by `selectFrom`, whose
`Locked` shape runs the read in that transaction and appends `FOR UPDATE`, so
every read is still built in `select.ts`. It took the writer to twenty-four
methods.

**The guard.** `tests/support/db/probe-tables.ts` declares two marked
probes, never created as tables: `switches`, unscoped, and `tiers`, with a
nullable `workspace_id`. `write.test.ts` asserts with `@ts-expect-error`
that every generic method refuses each, beside the same calls compiling
against their unmarked twins, `herbs` and `tinctures`; the hard delete is
also asserted against `pairs` marked, since `deleted_at` refuses it
`switches` anyway. `npm run typecheck` is the check: a generic method that
stops demanding `Generic` leaves a directive unused. Each marked table's
schema test assigns the table to `NamedWrites`, so one that loses its mark
fails too.

### `app.current_user_id`, published per transaction (M1.19)

Before it calls `fn`, `withAudit` publishes the session's acting user to
the database itself, through `publishActor(executor, { userId,
impersonatedBy?, route?, note? })` in `src/db/audit.ts` — client-free, since
it runs on the transaction it is handed, which is how the seed's transaction
publishes the same four (MB.208):

```sql
select set_config('app.current_user_id', $1, true),
       set_config('app.impersonated_by', $2, true),
       set_config('app.privilege_route', $3, true),
       set_config('app.privilege_note', $4, true)
```

**`app.impersonated_by` rides beside it** (MB.53): the admin acting as the
session's user on an impersonation session, from the session's
`impersonatedBy` and never a request body, and empty on every other write.
The stamps still name the user acted as, since impersonation reproduces what
that user would do ([`auth/impersonation.md`](../auth/impersonation.md)). It
is set on every transaction, empty included, so a reader never sees the
placeholder an earlier transaction left on a pooled connection. One statement
holds all four, so it costs no second round trip. It has no reader yet, for
the same reasons as the user id once had none.

**`app.privilege_route` and `app.privilege_note` ride beside them too**
(MB.195), from `withAudit`'s optional third argument,
`{ via, note }` (`PrivilegeDeclaration` in `src/db/types.ts`, `via` typed as
`user_privilege_route`'s values so it cannot be misspelt). A write that changes
`users.role` or `users.can_create_workspace` declares how the change came
about, `bootstrap`, `admin`, `invitation` or `manual`, and may give a
reason. The trigger on `users`, `record_privilege_change()`, reads both and
writes one `user_privilege_changes` row per changed column, with the route as
`via` and the note as `note`, an empty note stored as none. **An empty route
refuses the change**: `a privilege change must declare its route`. Both are
published on every transaction, empty when nothing is declared, as
`app.impersonated_by` is, so a write that declared nothing never inherits a
route; a write that changes no privilege never reaches the trigger, whatever
it declared. Outside `withAudit`, the seed publishes all four through the
same `publishActor` — the bootstrap user, every other setting empty, so a
seed run inherits nothing a pooled connection held (MB.208) — and declares
`bootstrap` around its fixture users' insert (`declaringBootstrapPrivileges`,
`src/db/seed/idempotent.ts`); a `psql` fix declares `manual` ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md)).
Why a declared route rather than a default:
[`mb.194-privilege-ledger-by-trigger.md`](../design-decisions/mb.194-privilege-ledger-by-trigger.md).

**The user id has one reader, and two more are expected.** The privilege
trigger reads it as the ledger row's actor, falling back to the row's own
`updated_by` where no transaction published one (MB.195). It is also
published for two readers that do not exist yet: the v2 history trigger's
`changed_by` (DESIGN.md §13), and the RLS policies MB.29 deferred to the
public launch (DESIGN.md §8), each of which it leaves one migration away
(§5). So do not remove it, and do not describe it as protecting anything
beyond the ledger's stamp today.

**The second authorization layer is not here.** It is CLAUDE.md rule 5's
branded `Membership` — the value `assertMembership` returns, which every
workspace-scoped finder and `AuditWriter` method demands as its first argument
so the omission is a compile error rather than a missing runtime check. M6.3
built it; ["The Membership proof"](membership-proof.md) is how it works. The eventual
policies' specification is
[`mb.24-rls-role-split.md`](../design-decisions/mb.24-rls-role-split.md)
(DESIGN.md §8).

**Why `set_config(.., true)` and not `SET LOCAL`**: the same semantics, with
the user id a bind parameter rather than text in the SQL (DESIGN.md §5).

Transaction scoping is the whole point of `LOCAL`: the value is discarded
at `COMMIT` or `ROLLBACK`, so it cannot ride a pooled connection into the
next request that reuses it. `tests/db/repository/write.test.ts` asserts this directly —
24 concurrent `withAudit` calls with distinct user ids each see their own,
and a connection outside any `withAudit` transaction sees the setting
unset. Since the GUC is only ever set _inside_ the transaction, and a session
with no `userId` is rejected before the transaction opens, there is no path
that writes with the setting stale or absent.

This is also the reason CLAUDE.md forbids wrapping tests in a rolled-back
transaction: `withAudit`'s `set_config` would be local to that outer
wrapper rather than to its own statement scope, and one test user's identity
would survive into the next assertion — see
[`m1.9-test-db-isolation.md`](../design-decisions/m1.9-test-db-isolation.md).

**Testing against a scratch table.** `tests/db/repository/` mirrors the
folder — `index.test.ts`, `write.test.ts`, `finders.test.ts` and
`memberships.test.ts` — and runs in the `db` project against this worker's
`sorrel_test_<n>` clone. The clone has carried the full schema since M1.27,
and each file still creates its own `repository_probe_herbs` table spreading
the real `auditColumns` (minus the FKs to `users`) and drops it afterwards,
through `useProbeTables()` in `tests/support/db/probe-tables.ts`: the repository's contract is the
six audit columns, not any one table's other constraints. The
six columns exercised are the ones every real table will carry.

That table carries one extra column no real table will:
`acting_user text default current_setting('app.current_user_id', true)`.
`impersonating_admin` does the same for `app.impersonated_by`.
Each records what its GUC held _inside_ the transaction that inserted the row,
which is how the M1.19 tests observe a setting the narrow `AuditWriter`
gives them no other way to read — without widening the write API for the
benefit of a test. The `missing_ok` second argument is what makes it null,
rather than an error, when the setting was never set.

### Writer methods and filter fields in full

`src/db/repository/types.ts` states each writer method's contract in one to
three lines. The parts that do not fit are here.

- **`delete`** is for the join tables that carry no `deleted_at`. The type
  rejects a table carrying one, and one carrying `workspace_id`. No table is
  both today; the first that is adds its proof-scoped counterpart rather than
  being hard-deleted unscoped. A `match` naming no column is refused, since it
  would empty the table. `ColumnMatch` takes values rather than an `SQL`
  predicate because a service may not import `drizzle-orm` at runtime, and a
  join table keyed on its pair needs no other comparison.
- **`updateById` and `updateByIdInWorkspace`** exist for the same reason: a
  service cannot build the `where` the unkeyed methods want, so the writer
  builds the predicate every entity update needs.
- **`updateRevisioned`** throws `StaleWrite` (carrying the row's revision now)
  only for a live row of the proof's workspace. A row that is absent, deleted
  or another coven's answers `[]`, because `StaleWrite` would tell another
  coven's reader the row exists. `expectedRevision: null` writes whatever the
  row holds, the client's choice to keep its own version.
- **`pauseAdminRoleChanges`** relies on the one-open unique index: a second
  open pause is refused by the index, and the call returns no row rather than
  failing the transaction. **`lockLiveAdmins`** and **`lockLiveMembers`** are
  reads that live in the writer only so the `for update` lock is taken in the
  transaction that writes; the last-admin and last-owner counts depend on it.
- **`reviveMembership`** is the one writer that touches a deleted row, so it
  reaches only a deleted one. It always sets `invited_by`, to null when no
  sender is given, so an earlier inviter never lingers.
- **The invitation accepts and declines** run under no proof because the
  invitee holds neither a membership nor the site role yet. A link's token
  admits `acceptInvitation`; the by-id calls (`acceptReceivedInvitation`,
  `declineReceivedInvitation`) match the session user's verified address in SQL
  and refuse a site-tier id, whose grant a link alone accepts.
- **`revokeInvitation`** treats an invitation as open when it is pending, or
  declined and not yet removed, whatever its expiry: Revoke acts on the first,
  Remove on the second.
- **`lockCovenStock`** is taken first in any write that adds a jar, counts
  them on a cupboard remove, or converts them, and is per coven.
- **Filter fields** on `IngredientFilter`: a list field (`forms`, `deityIds`,
  `celestialBodies`, `elements`) matches any of its values, ignores blank
  entries and is no filter when empty; `toxic`, `elements` and `forms` look at
  live variants only. `source`, `inStock` and `lowStockOnly` are a coven's list
  only, and the compendium read ignores them. `heldIn` and `notHeldIn` take a
  `Membership` each so a coven the caller is not in cannot be named.

## Repository comments in full

The full text of comments that the source files now cite and summarise in a line or two.

#### `src/db/repository/ingredient-facets.ts`: `export async function findCompendiumFacets(`

How many compendium entries each filter value would list under the rest of
`filter` — the public list, so no proof. A value's count is what
`findCompendiumCount` reads with that value as its kind's only choice; a
category under `all` is counted with the chosen ones beside it.

Zodiac signs and celestial bodies list every live curated row, by position
(nulls last) then name, and elements and toxic every setting, zeros
included, in the vocabulary's own order. Forms, deities and categories list
the values some entry carries, and every chosen one, at zero if none does,
alphabetically in natural-language order and never by count: a category by
group then name, a deity by tradition then name. A form is spelled
as the live curated form folding the same, else as its counted variants most
often spell it, ties alphabetically.

`withoutReferences` is how many entries cite no live reference, on
themselves or a live form, under the rest of the filter: the filter's own
`withoutReferences` is set to true for it, so the count is the same whether
the switch is on or off. `withoutForms` is the same for the No Form switch:
how many entries have no live form. Both come from one read.

`withReview` is whether to read the Reviewed counts, a curator's
alone: false sends no statement for them and answers `reviewed: null`.

#### `src/db/repository/vocabularies.ts`: `export function findVocabularySuggestions(`

One page of what a member's autofill offers for `vocabulary`'s column:
the live curated rows matching `query`, name matches before description
matches, then the values written on live ingredients in the compendium or
a coven one of `memberships` proves that match it and fold to no live
row's name. No proofs reads the compendium alone, which is the admin's
compendium form. Each tier is alphabetical, case-folded. A blank
`query` matches everything.

A name or value matches by `%` or `<%` and a description by `<%` alone, so
a query finds a word inside a description and completes a typed prefix
(claude-docs/db/member-autofill.md, "The member's autofill"). A form or a
deity also matches when its group or tradition name holds the query as a
case-folded substring, so typing the heading lists everything under it.

A form suggestion also carries its group and the in-scope ingredients whose
form folds to it, and a deity suggestion its tradition. A form or a deity
is curated only while its group or tradition is live too.

#### `src/db/repository/provisional-users.ts`: `export async function deleteProvisionalUsers(`

Hard-deletes every provisional account: unverified, holding a provider
`accounts` row, and either untouched for `lifetimeSeconds` or created more
than `capSeconds` ago, both by the database's own clock, so a seeded row nobody can sign in to is never one. Its
`accounts` and `sessions` rows go with it by `ON DELETE CASCADE`.

An account holding a `user_privilege_changes` row is kept, since an admin
has vouched for it. Not deleted with its rows: the ledger refuses the
delete, and its plain foreign key would fail the whole statement, and so
every later sweep (claude-docs/db/provisional-account-delete.md).

Hard rather than soft, and outside `withAudit`: Better Auth finds a user by
address without our `deleted_at` filter, so a tombstone would go on
blocking the owner's sign-in, and there is no session to stamp one with
(claude-docs/auth/admin-bootstrap.md, "Provisional accounts"). The one users delete, pinned
by `soft-delete-finder-guard.test.ts`'s export list.

#### `src/db/repository/users.ts`: `export async function findCoMemberNamesIncludingSoftDeleted(`

The name of each of these users who holds or has held a seat in a coven
`viewerId` sits in now, and nothing else of the row: the display names a
member may read. The fourth read that takes no proof, for the
reason `findMembershipsOfUsers` takes none: the viewer's covens are several,
so there is no one workspace to hold a proof for, and the viewer's own live
seat in a live coven is the scope instead. The service passes the session's
id as `viewerId`; a fifth proofless read is a decision.

Rule 4's third named exception: it skips the
filter on the user's row, so a deleted user reads under the name their row
last held, and on the user's seat, so a removed member still counts. The
viewer's seat and the coven keep theirs, through `existsIn`. Read from the
seats, which a left join names, so one statement answers the batch however
many covens a pair shares.

#### `src/db/repository/references.ts`: `export async function findReferencesOf(`

The live links of these rows of the sourced table `key` names (the
`SOURCED` list), each beside the live reference it cites. An ingredient's read
exactly when it is, as `findManyOfIngredients` reads it — live, and in the
compendium or a coven one of `memberships` proves — and only where the
reference is one its readers may read: the compendium's, or its own
coven's. A variant's the same, through the variant to its ingredient
(`readableVariantParent`): a variant is a coven's where its
ingredient is, though it carries no `workspace_id`. Every other sourced table is global reference data, so its links
read while the row is live, and only to a compendium reference, the one
tier every reader shares. A link to a soft-deleted reference reads as
nothing and is left in place, so a restore returns it (DESIGN.md §5,
"Nothing deletes a reference in v1"). One statement for the whole batch:
the reference a left join read as an inner one, since the parent's
correlated subquery compares its tier with the reference's.

#### `src/db/repository/weighted-search.ts`: `export function weightedSearch(`

A best-match search over several text fields, as a relation to join onto
the listed table, each row's rank, and where its best field holds the
query. One `UNION ALL` arm per field, so each arm's `where` is that field's
own `<%` match (an index can answer it) and the position an arm reports
belongs to the field it scored. An arm scores its field's
`word_similarity`, or 1 where the field holds the query verbatim, times the
field's weight. The rank is the best of a row's arms, `max … group by id`,
so a row two of whose fields match is still one row, and its position is
that best arm's, earliest first among equal arms. The threshold is the
keyset read's, so the order using this must say `wordMatch`. Shared by the
compendium and coven ingredient search (`searchMatch`) and the grimoire's,
so both rank one way (claude-docs/db/compendium-read.md, "The
compendium read"). `query` is trimmed and never blank.

#### `src/db/repository/predicates.ts`: `export function foldedWordMatch(query: string): WordMatch {`

A search for `query` — trimmed, never blank — by word similarity: `matches`
holds where it is word-similar (`<%`) to a text and `similarity` scores it,
each side folded through `unaccent_immutable`, so the expression indexes of
migration 0027 answer the match. `contains` holds where the text holds the
query verbatim, folded the same way and lower-cased, since `<%` ignores
case: `word_similarity` scores against whole words, so a caller ranks a
fragment inside a longer word — `wood` in Sandalwood — as a full hit with
it. `position` is the character that verbatim match starts at, or
`NOWHERE`: what orders hits of equal score, so Wood Ash leads Sandalwood.
`strpos` rather than `ilike`: it reads the query as plain text, where a
pattern would need its `%`, `_` and `\` escaped as `containsText`
escapes them. The compendium search and the reference picker's
(claude-docs/db/compendium-read.md, "The compendium read").

#### `src/db/repository/grimoire.ts`: `export async function findGrimoireFacetCounts(`

The counts behind the four facets, in four grouped reads (one per
facet, run together) under the same visibility rule as the list, so another
member's private spell is never counted and its moon phase, day or maker is
never offered. Each facet's counts leave its own picks out of the query and
keep every other facet, the categories, the status and the search in force,
as `findGrimoireCategoryCounts` drops the categories under Match Any. A
value no readable spell carries is absent rather than at zero.

Moon phase and day of the week group on the trimmed, lower-cased text and
name the group by its most-used spelling (`mode()`, the smallest on a tie),
so `Full Moon` and `full moon` are one choice. A maker is a user id, and
stays a choice after leaving the coven, since the read looks at spells and
not seats.

#### `src/db/repository/ingredient-parent.ts`: `export function inUseIngredientParent(`

`readableIngredientParent`, or a compendium entry the curators have retired
while `heldBy`'s coven has a live cupboard entry naming it: an
entry a coven still uses, which the compendium no longer lists. The tier is
checked whatever the tombstone, so a cupboard row naming a coven's own
ingredient, which the table does not refuse, admits nothing. One `EXISTS`
over the parent, which is why it skips `existsIn`'s tombstone filter and
puts it back on the first arm. `where` reads the parent as `ingredients`,
as `readableIngredientParent`'s does; a retired entry's tier is the
compendium's (claude-docs/db/workspace-compendium-entries.md, "When the
compendium retires the entry"). No `heldBy` is `readableIngredientParent`
itself, so a finder takes the proof as an optional last argument.

#### `src/db/repository/common-names.ts`: `export async function findCommonNameSuggestions(`

One page of what a common-name field offers: the display names and live
folk names of live ingredients in the compendium or a coven one of
`memberships` proves that match `query`, folded to `lower(btrim(name))` and
offered once each, alphabetically. No proofs reads the compendium alone,
which is the admin's compendium form. Each names the in-scope
ingredients answering to it, formal names first. A formal name is not a
common name and is not read. A blank `query` matches everything.

Each arm matches its own column by `%` or `<%`, so each can reach its own
trigram index; the fold happens after (claude-docs/db/member-autofill.md,
"The member's autofill").

#### `src/db/repository/spells.ts`: `export function readableSpells(membership: Membership): SQL | undefined {`

§5's reader rule, as a predicate: the coven's own spells, shared ones plus
this reader's private ones. `created_by` is the author — §5 gives spells no
separate author column — so the proof supplies both halves and a caller has
no id to pass that could disagree with it.

Exported for the repository's own finders (the workings
reach their spell through it) and not from the index: above the
repository nothing builds SQL. It builds a condition and runs
nothing, and the lint rule `sorrel/spell-visibility-read-in-one-place` fails a
`spells.visibility` comparison written anywhere else.

#### `src/db/repository/memberships.ts`: `export async function findMembershipsOfUsers(`

Every live membership each of these users holds, in a workspace that is
itself live. The second read that takes no proof, and for the reason the
first does: a user's own memberships span workspaces, so there is no one
workspace to hold a proof for. The service calling it decides whose ids may
be asked about; the index's export list is pinned, so a third is a
decision.

The workspace's own `deleted_at` is `existsIn`'s to check: a correlated
`EXISTS` rather than a join, so the rows come back in the membership's own
shape.

#### `src/db/repository/cupboard-entries.ts`: `export async function findCupboardEntryIncludingSoftDeleted(`

The compendium entry with this id, soft-deleted or not, beside the proof's
live cupboard entry naming it, or `undefined` when the proof's coven has no
such row. The sixth escape hatch: a compendium entry the curators
retire stays readable to exactly the covens whose cupboard names it, and
reads as gone to every other reader (claude-docs/db/workspace-compendium-entries.md,
"When the compendium retires the entry"). It skips the entry's own filter
and no other: the cupboard row's tombstone filters, the proof scopes it, and
the entry must be the compendium's, so a row naming a coven's own
ingredient reads as none. One statement: the cupboard row is a left join
read as an inner one, which is what lets the entry's tombstone go unread.

#### `src/db/audit.ts`: `export async function publishActor(`

Publishes who is writing as the four transaction-local settings every write
publishes — `app.current_user_id`, `app.impersonated_by`,
`app.privilege_route` and `app.privilege_note` — each always set, an
absent one as '', so no reader sees a value an earlier transaction left on
a pooled connection. `set_config(…, true)` is `SET LOCAL` with a bind
parameter, and one statement costs one round trip
(claude-docs/db/write-path.md, "app.current_user_id, published per
transaction"). The executor is the caller's transaction, so this module
stays client-free and serves `withAudit` and the seed alike.
