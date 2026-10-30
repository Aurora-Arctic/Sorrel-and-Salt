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

### Writer contracts and filter fields

`src/db/repository/types.ts` states each writer method's contract in a line or
two. What a caller also needs to know is here.

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

## Reads that take no proof

Every workspace-scoped finder takes a `Membership` and ANDs its `workspace_id`
(CLAUDE.md rule 5). A few reads cannot, because the rows they answer span
workspaces. Each is a named, pinned exception: the repository index's export
list is tested, so adding another is a decision, not an edit.

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
  beside the proof's live cupboard entry naming it, or nothing when the coven
  has no such row. It is the sixth soft-delete escape hatch: a retired entry
  stays readable to exactly the covens whose cupboard names it and reads as
  gone to everyone else (claude-docs/db/workspace-compendium-entries.md, "When
  the compendium retires the entry"). It skips the entry's own filter and no
  other: the cupboard row's tombstone filters, the proof scopes it, and the
  entry must be the compendium's, so a row naming a coven's own ingredient reads
  as none. The cupboard row is a left join read as an inner one, which is what
  lets the entry's tombstone go unread.
- **The in-use ingredient parent** (`inUseIngredientParent`) extends
  `readableIngredientParent` with a compendium entry that curators retired
  while `heldBy`'s coven has a live cupboard entry naming it. The tier is
  checked whatever the tombstone, so a cupboard row naming a coven's own
  ingredient, which the table does not refuse, admits nothing. It is one
  `EXISTS` over the parent, which is why it skips `existsIn`'s tombstone
  filter and restores it on the first arm; its `where` reads the parent as
  `ingredients`, as `readableIngredientParent`'s does. With no `heldBy` it is
  `readableIngredientParent` itself, so a finder takes the proof as an optional
  last argument.

## Sweeping provisional accounts

`deleteProvisionalUsers` hard-deletes every provisional account: unverified,
holding a provider `accounts` row, and either untouched for `lifetimeSeconds` or
created more than `capSeconds` ago. Both ages use the database's own clock, so a
seeded row nobody can sign in to is never one. Its `accounts` and `sessions` rows
go with it by `ON DELETE CASCADE`.

An account holding a `user_privilege_changes` row is kept, because an admin has
vouched for it, and it is not deleted with its rows: the ledger refuses the
delete, and its plain foreign key would fail the whole statement and so every
later sweep.

The delete is hard and outside `withAudit` because Better Auth finds a user by
address without our `deleted_at` filter, so a tombstone would keep blocking the
owner's sign-in, and there is no session to stamp one with. It is the one users
delete, pinned by the export list in `soft-delete-finder-guard.test.ts`. See
claude-docs/db/provisional-account-delete.md and claude-docs/auth/admin-bootstrap.md,
"Provisional accounts".

## Publishing the actor

`publishActor` in `src/db/audit.ts` sets four transaction-local settings on every
write: `app.current_user_id`, `app.impersonated_by`, `app.privilege_route` and
`app.privilege_note`. Each is always set, an absent one as the empty string, so no
reader sees a value an earlier transaction left on a pooled connection.
`set_config(…, true)` is `SET LOCAL` with a bind parameter, and one statement costs
one round trip. The executor is the caller's transaction, so the module stays
free of any client and serves `withAudit` and the seed alike. The first setting is
described under "app.current_user_id, published per transaction".

## Reading the links that cite references

`findReferencesOf` returns the live links of the given rows of the sourced table
`key` names (the `SOURCED` list), each beside the live reference it cites. It reads
them in one statement for the whole batch.

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
