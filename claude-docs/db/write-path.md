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
  list matching by `IN` — since a service may not build an `SQL` predicate
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
`softDelete`, `softDeleteByIds`, `delete`), the five workspace-scoped ones
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
`adminRoleChangePauseWrites` and `invitations.ts`
`invitationWrites`, each a function of a `WriterContext` (the
transaction, the session, and the writer's own stamped `insert` and
`update`), whose result `writerFor` spreads into the writer. So a new marked
table touches its own repository file, and the writer's surface,
`AuditWriter`, is where its methods are argued for, as before:
`write.test.ts` still pins their number.

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
the database itself:

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
it declared. Outside `withAudit`, the seed declares `bootstrap` around its
fixture users' insert (`declaringBootstrapPrivileges`, `src/db/seed/idempotent.ts`)
and a `psql` fix declares `manual` ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md)).
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
