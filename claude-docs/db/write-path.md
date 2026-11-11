## The write path — `withAudit`

`src/db/repository/` is the only code that imports `db` from `connection.ts`
(CLAUDE.md rule 2, DESIGN.md §5), and it exports exactly one write path:
`withAudit(session, fn)`. `db` is not re-exported, and `fn` is not handed the
Drizzle transaction: it gets a narrow `AuditWriter` whose stamping methods each
run their payload through `applyAudit` first. That is what makes "a write outside
`withAudit`" impossible through the public API rather than merely discouraged:
there is no exported handle to write with.

```ts
const [spell] = await withAudit(session, (write) =>
  write.insert(spells, { workspaceId, title: input.title }),
);
```

- **`write.insert(table, values)`** stamps `createdAt`/`createdBy`/`updatedAt`/
  `updatedBy` and returns the inserted rows.
- **`write.update(table, values, where)`** stamps `updatedAt`/`updatedBy` only;
  `createdAt`/`createdBy` are never in the `SET` list, so an update cannot
  rewrite who created a row.
- **`write.softDelete(table, where)`** stamps `deletedAt`/`deletedBy` and leaves
  the row in place (CLAUDE.md rule 4). Typed to demand a `deletedAt` column, so
  it cannot be pointed at a hard-deleted join table.
- **`write.delete(table, match)`** removes rows outright, for the two
  hard-deleted join tables only. Typed to reject any table carrying `deletedAt`,
  so it can never quietly destroy a soft-deletable row. Rows are named by column
  value, `{ ingredientId, categoryId: [...] }`: a list matches by `IN`, `null`
  matches `IS NULL` (so `{ ingredientId, variantId: null, categoryId }` names the
  parent's own pair and not a form's), because a service may not build an `SQL`
  predicate (MB.33; MB.125). A list left empty deletes nothing without a
  statement, and a match naming no column throws rather than emptying the table.

**No update or soft delete reaches a soft-deleted row.** The writer ANDs
`deleted_at IS NULL` onto the `where` of every one of them, by the scoped and
by-id variants too, decided by the table's shape as the finders' filter is
(`notSoftDeleted(table)`, dropped for a hard-deleted join table, which has no
tombstone to skip). So a tombstone is never rewritten, a service updating a
deleted row by id finds nothing and answers `NotFound`, and a second delete
cannot overwrite who made the first. The way back to a deleted row is v2's
restore, a named method per tier, with an edit after it rather than in place
(DESIGN.md §13, "Edit history").

`values` is typed as the table's insert model **minus** the audit columns, so a
call site cannot name `createdBy` without a cast, and if one casts anyway,
`applyAudit` strips it: audit ids come from the session, never from a request
body.

Everything inside one `withAudit` call runs in one transaction: if `fn` throws,
the whole transaction rolls back (earlier writes included) and the error
propagates unchanged. A session with no `userId` is rejected before the
transaction opens, rather than stamping a blank acting user.

The read-side finder builder that applies `deleted_at IS NULL` lands on top of
this, not beside it ([`soft-delete.md`](soft-delete.md), "Soft-delete filtering
and the partial-index convention").

### Table marks

Some tables are written only through named writer methods, because a row
authorises something or holds a state only a named call may move:
`admin_role_change_pauses` (`pauseAdminRoleChanges`, `resumeAdminRoleChanges`),
`invitations` (its named insert, accept and revoke), `user_access_pauses`
(`setUserAccessPause`, `liftUserAccessPause`) and `workspace_member_pauses`
(under a `Membership`: `setWorkspaceMemberPause`, `liftWorkspaceMemberPause`).
Such a table says so once, in its schema file:

```ts
export const adminRoleChangePauses = namedWrites(pgTable('admin_role_change_pauses', { … }));
```

`namedWrites`, in `src/db/table-marks.ts`, is a cast and nothing more. It types
the table as `NamedWrites`, `{ readonly $writes: 'named' }`, and adds no
property, so drizzle-kit and every query see the same object. Every generic
writer method takes `Generic`, `{ $writes?: never }`, which a marked table cannot
satisfy: the six unscoped ones (`insert`, `update`, `updateById`, `softDelete`,
`softDeleteByIds`, `delete`), the six workspace-scoped ones (`updateRevisioned`
among them) and the three compendium-tier ones, so a marked two-tier table is off
the proof-scoped methods too. `$writes` is a phantom key beside Drizzle's
`$inferSelect`, so no column can be named like it. Both types are in
`src/db/types.ts`.

**Why a mark, not a marker per table.** A type keyed on a column one table
happens to carry (`ended_at`, `token_hash`) would need adding to every
signature for each new named table, and an unrelated table that later took that
column name would be refused by accident. The mark is the table's own statement,
and nothing else reads it.

**Where the named writes live.** Beside the table's finders, in its repository
file, not in `write.ts`: `admin-roles.ts` exports `adminRoleWrites` and
`invitations.ts` `invitationWrites`, each a function of a `WriterContext` (the
transaction, the session, the writer's own stamped `insert` and `update`, and
`stampInsert` and `stampUpdate`, which stamp a raw payload for a multi-row insert or an
update built by hand: `applyAudit` is called nowhere else in the repository,
`tests/guards/repository-shared-pieces.test.ts`),
whose result `writerFor` spreads into the writer. A new marked table touches its
own repository file; the writer's surface, `AuditWriter`, is where its methods
are argued for, and `write.test.ts` pins their number.

**One read sits among them.** `adminRoleWrites` also holds `lockLiveAdmins`, the
live keeper rows locked `for update` in id order, which the admin revoke counts
before it writes so two revokes at once cannot leave no keeper
([`auth.md`, "Granting and revoking admin"](../design-decisions/auth.md#granting-and-revoking-admin)).
It is in the writer only because the lock must be taken in the transaction that
writes; it is still built by `selectFrom`, whose `Locked` shape runs the read in
that transaction and appends `FOR UPDATE`, so every read is still built in
`select.ts`.

**The guard.** `tests/support/db/probe-tables.ts` declares marked probe tables,
and `write.test.ts` asserts with `@ts-expect-error` that every generic method
refuses them. `npm run typecheck` is the check: a generic method that stops
demanding `Generic` leaves a directive unused. Each marked table's schema test
assigns the table to `NamedWrites`, so one that loses its mark fails too.

### Reads inside a write

`withAudit` runs its callback inside `runInWriteTransaction(tx, …)` from
`src/db/repository/unit-of-work.ts`, which holds the transaction in an
`AsyncLocalStorage`. `selectFrom` asks `currentWriteTransaction()` and runs on
that transaction when there is one, on the bare client when there is not. So a
finder called in the callback sees the rows the write has put down and not yet
committed, finds `app.current_user_id` published, and uses the write's
connection. A read on a second connection could instead block on a lock queued
behind the write (an `ALTER TABLE` waiting for the write to commit), and the
write would wait for the read: a cycle Postgres cannot see, since one leg is the
application waiting. A similarity read inside a write sets its thresholds in a
savepoint (`tx.transaction`) on the same transaction. Only `withAudit` enters the
store, and no finder's signature carries a transaction, so a service still holds
no handle to it. The record:
[`data.md`, "Reads on the write transaction"](../design-decisions/data.md#reads-on-the-write-transaction).

### `app.current_user_id`, published per transaction

Before it calls `fn`, `withAudit` publishes the session's acting user to the
database itself, through `publishActor(executor, { userId, impersonatedBy?,
route?, note? })` in `src/db/audit.ts`. It is client-free, since it runs on the
transaction it is handed, which is how the seed's transaction publishes the same
four:

```sql
select set_config('app.current_user_id', $1, true),
       set_config('app.impersonated_by', $2, true),
       set_config('app.privilege_route', $3, true),
       set_config('app.privilege_note', $4, true)
```

**`app.impersonated_by`** is the keeper acting as the session's user on an
impersonation session, from the session's `impersonatedBy` and never a request
body, and empty on every other write. The stamps still name the user acted as,
since impersonation reproduces what that user would do
([`auth/impersonation.md`](../auth/impersonation.md)). It has no reader yet.

**`app.privilege_route` and `app.privilege_note`** come from `withAudit`'s
optional third argument, `{ via, note }` (`PrivilegeDeclaration` in
`src/db/types.ts`, `via` typed as `user_privilege_route`'s values so it cannot be
misspelt). A write that changes `users.role` or `users.can_create_workspace`
declares how the change came about (`bootstrap`, `admin`, `invitation` or
`manual`) and may give a reason. The trigger on `users`,
`record_privilege_change()`, reads both and writes one `user_privilege_changes`
row per changed column, with the route as `via` and the note as `note`, an empty
note stored as none. **An empty route refuses the change**: `a privilege change
must declare its route`. A write that changes no privilege never reaches the
trigger, whatever it declared. Outside `withAudit`, the seed publishes all four
through the same `publishActor` (the bootstrap user, every other setting empty)
and declares `bootstrap` around its fixture users' insert
(`declaringBootstrapPrivileges`, `src/db/seed/idempotent.ts`); a `psql` fix
declares `manual` ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md)). Why
a declared route rather than a default:
[`auth.md`, "One privilege ledger, written by the database"](../design-decisions/auth.md#one-privilege-ledger-written-by-the-database).

All four are set on every transaction, empty included, so a reader never sees a
value an earlier transaction left on a pooled connection; one statement holds
all four, so it costs no second round trip.

**The user id has one reader, and two more are expected.** The privilege trigger
reads it as the ledger row's actor, falling back to the row's own `updated_by`
where no transaction published one. It is also published for two readers that do
not exist yet: the v2 history trigger's `changed_by` (DESIGN.md §13), and the RLS
policies deferred to the public launch (DESIGN.md §8), each of which it leaves
one migration away (§5). So do not remove it, and do not describe it as
protecting anything beyond the ledger's stamp today.

**The second authorization layer is not here.** It is CLAUDE.md rule 5's branded
`Membership`, which every workspace-scoped finder and `AuditWriter` method
demands as its first argument so the omission is a compile error rather than a
missing runtime check ([`membership-proof.md`](membership-proof.md), "The
Membership proof"). The eventual RLS policies' specification is
[`auth.md`, "RLS role split, `FORCE`, and identity on the read path"](../design-decisions/auth.md#rls-role-split-force-and-identity-on-the-read-path)
(DESIGN.md §8).

**Why `set_config(.., true)` and not `SET LOCAL`**: the same semantics, with the
user id a bind parameter rather than text in the SQL (DESIGN.md §5). Transaction
scoping is the whole point of `LOCAL`: the value is discarded at `COMMIT` or
`ROLLBACK`, so it cannot ride a pooled connection into the next request that
reuses it. Since the setting is only ever set _inside_ the transaction, and a
session with no `userId` is rejected before the transaction opens, no path writes
with the setting stale or absent.

This is also why CLAUDE.md forbids wrapping tests in a rolled-back transaction:
`withAudit`'s `set_config` would be local to that outer wrapper, and one test
user's identity would survive into the next assertion
([`ci.md`, "Test database isolation: per-worker clone vs. rolled-back transaction"](../design-decisions/ci.md#test-database-isolation-per-worker-clone-vs-rolled-back-transaction)).

### Writer contracts and filter fields

`src/db/repository/types.ts` states each writer method's contract in a line or
two. What a caller also needs to know is here.

- **`delete`** rejects, in the type, a table carrying `deleted_at` and one
  carrying `workspace_id`. No table is both today; the first that is adds its
  proof-scoped counterpart rather than being hard-deleted unscoped.
  `ColumnMatch` takes values rather than an `SQL` predicate because a service
  may not import `drizzle-orm` at runtime.
- **`updateById` and `updateByIdInWorkspace`** exist for the same reason: a
  service cannot build the `where` the unkeyed methods want, so the writer builds
  the predicate every entity update needs.
- **`updateRevisioned`** throws `StaleWrite` (carrying the row's revision now)
  only for a live row of the proof's workspace. A row that is absent, deleted or
  another coven's answers `[]`, because `StaleWrite` would tell another coven's
  reader the row exists. `expectedRevision: null` writes whatever the row holds,
  the client's choice to keep its own version.
- **`pauseAdminRoleChanges`** relies on the one-open unique index: a second open
  pause is refused by the index, and the call returns no row rather than failing
  the transaction. **`lockLiveAdmins`** and **`lockLiveMembers`** are reads that
  live in the writer only so the `for update` lock is taken in the transaction
  that writes; the last-admin and last-owner counts depend on it.
- **`reviveMembership`** is the one writer that touches a deleted row, so it
  reaches only a deleted one. It always sets `invited_by`, to null when no sender
  is given, so an earlier inviter never lingers.
- **`setSeatRole`** sets the role of a live member under no proof, as
  `insertMembership` and `reviveMembership` take none: identity services seat an
  admin in the demo coven and hold no membership of it.
- **The invitation accepts and declines** run under no proof because the invitee
  holds neither a membership nor the site role yet. A link's token admits
  `acceptInvitation`; the by-id calls (`acceptReceivedInvitation`,
  `declineReceivedInvitation`) match the session user's verified address in SQL
  and refuse a site-tier id, whose grant a link alone accepts.
- **`revokeInvitation`** treats an invitation as open when it is pending, or
  declined and not yet removed, whatever its expiry: Revoke acts on the first,
  Remove on the second.
- **`lockCovenStock`** is per coven, and taken first in any write that adds a
  jar, counts them on a cupboard remove, or converts them.
- **Filter fields** on `IngredientFilter`: a list field (`forms`, `deityIds`,
  `celestialBodies`, `elements`) matches any of its values, ignores blank entries
  and is no filter when empty; `toxic`, `elements` and `forms` look at live
  variants only. `source`, `inStock` and `lowStockOnly` are a coven's list only,
  and the compendium read ignores them. `heldIn` and `notHeldIn` take a
  `Membership` each so a coven the caller is not in cannot be named.

## Reads that take no proof

Every workspace-scoped finder takes a `Membership` and ANDs its `workspace_id`
(CLAUDE.md rule 5). A few reads cannot, because the rows they answer span
workspaces. Each is a named, pinned exception: the repository index's export list
is tested, so adding another is a decision, not an edit.

- **A user's memberships** (`findMembershipsOfUsers`) are every live seat the
  users hold, in a workspace that is itself live. A user's own seats span
  workspaces, so no single workspace exists to hold a proof for. The calling
  service decides whose ids may be asked about. The workspace's `deleted_at` is
  read through `existsIn`, a correlated `EXISTS`, so the rows keep the
  membership's own shape.
- **Co-member names** (`findCoMemberNamesIncludingSoftDeleted`) return only the
  display name of each user who holds or has held a seat in a coven the viewer
  sits in now. The viewer's covens are several, so the scope is the viewer's own
  live seat in a live coven; the service passes the session's id as `viewerId`.
  This is rule 4's third named exception. It skips the filter on the user's row,
  so a deleted user reads under the name the row last held, and on that user's
  seat, so a removed member still counts. The viewer's seat and the coven keep
  their filters through `existsIn`. The seats come from a left join, so one
  statement answers a whole batch however many covens a pair shares.
- **A retired compendium entry a coven still uses**
  (`findCupboardEntryIncludingSoftDeleted`) returns the entry, deleted or not,
  beside the proof's live cupboard entry naming it, or nothing when the coven has
  no such row. It is the sixth soft-delete escape hatch: a retired entry stays
  readable to exactly the covens whose cupboard names it and reads as gone to
  everyone else
  ([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "When
  the compendium retires the entry"). It skips the entry's own filter and no
  other: the cupboard row's tombstone filters, the proof scopes it, and the entry
  must be the compendium's, so a row naming a coven's own ingredient reads as
  none. The cupboard row is a left join read as an inner one, which is what lets
  the entry's tombstone go unread.
- **The in-use ingredient parent** (`inUseIngredientParent`) extends
  `readableIngredientParent` with a compendium entry that curators retired while
  `heldBy`'s coven has a live cupboard entry naming it. The tier is checked
  whatever the tombstone, so a cupboard row naming a coven's own ingredient,
  which the table does not refuse, admits nothing. It is one `EXISTS` over the
  parent, which is why it skips `existsIn`'s tombstone filter and restores it on
  the first arm; its `where` reads the parent as `ingredients`, as
  `readableIngredientParent`'s does. With no `heldBy` it is
  `readableIngredientParent` itself, so a finder takes the proof as an optional
  last argument.

## Removing a lapsed provisional account

`deleteLapsedProvisionalUser` hard-deletes one provisional account when it has
lapsed: unverified, holding a provider `accounts` row, and either untouched for
`lifetimeSeconds` or created more than `capSeconds` ago. The expiry job's step
calls it, and so does each batch of the daily cleanup, for every id of its page.
Both ages use the database's own clock, so a seeded row nobody can sign in to is
never one. Its `accounts` and `sessions` rows go with it by `ON DELETE CASCADE`,
and so do any pauses naming it, site (`user_access_pauses`) and coven
(`workspace_member_pauses`) alike: a pause means nothing once its account is
gone, and keeping the account for it would let a squat outlast its window.

An account holding a `user_privilege_changes` row is kept, because a keeper has
vouched for it: the ledger refuses the delete, and its plain foreign key would
fail it.

The delete is hard and outside `withAudit` because Better Auth finds a user by
address without our `deleted_at` filter, so a tombstone would keep blocking the
owner's sign-in, and there is no session to stamp one with. It is the one users
delete, pinned by the export list in `soft-delete-finder-guard.test.ts`
([`identity-model.md`](identity-model.md);
[`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Provisional accounts").

## Publishing the actor

`publishActor` (`src/db/audit.ts`) sets the four settings on every write. Its
executor is the caller's transaction, so the module stays free of any client and
serves `withAudit` and the seed alike. The settings and their readers are under
"`app.current_user_id`, published per transaction".

## Reading the links that cite references

`findReferencesOf` returns the live links of the given rows of the sourced table
`key` names (the `SOURCED` list), each beside the live reference it cites, in one
statement for the whole batch.

- An ingredient's links read exactly when the ingredient does, as
  `findManyOfIngredients` reads it: live, and in the compendium or a coven one of
  `memberships` proves. They read only where the reference is one its readers may
  read, the compendium's or its own coven's.
- A variant's links are the same, through the variant to its ingredient
  (`inUseVariantParent`), since a variant is a coven's where its ingredient is
  though it carries no `workspace_id`.
- Every other sourced table is global reference data. Its links read while the row
  is live, and only to a compendium reference, the one tier every reader shares.
- A link to a soft-deleted reference reads as nothing and is left in place, so a
  restore returns it (DESIGN.md §5, "Nothing deletes a reference in v1").
- The reference is a left join read as an inner one, because the parent's
  correlated subquery compares its tier with the reference's.

### Removing a passkey

`removePasskeyKeepingAWayIn` refuses when the passkey is the account's last way
in (no other passkey, no account for a provider in `providerIds`, no password).
It runs outside `withAudit`, like the plugin's own passkey writes, because the
table has no audit columns. The check and delete hold the account row locked, so
two racing removals run one after the other and the second sees the first's
delete.

### Pausing a user's site access

`setUserAccessPause` closes the live row first (run out or standing), so the
one-live index takes the new one. It has no conflict target: a pause set for the
same user in a transaction alongside wins the slot and this call writes nothing
rather than failing. Every session the user holds ends in the same transaction,
so their next request is signed out; a session row has no audit columns or
`deleted_at`, and Better Auth deletes it the same way at sign-out.

### Rename carries

`carryAstrologyRename`, `carryFormRename` and `carryDeityRename` carry a
vocabulary rename onto the cupboard rows that hold the old name.

- **Astrology** is two statements (entries, then variants). No slug moves, so
  every holding row takes the same rewrite: a list is rebuilt in its own order
  with each value folding to `from` replaced and the rest kept as written.
  Variants are reached through the entry's tier and liveness by a correlated
  `EXISTS`, so a coven's variant is never reached.
- **Form** is one statement over variants (a slug carries no form).
- **Deity** is one statement, `deity_id` matched as the service read it.
