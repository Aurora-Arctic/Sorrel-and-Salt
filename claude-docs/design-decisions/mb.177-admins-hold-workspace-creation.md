# MB.177 — Every admin holds `canCreateWorkspace`

**Status:** decided · **Date:** 2026-10-07

The owner's call: every admin can create a coven. The spec already said so,
as a second rule beside the flag, and no admin row agreed with it. This
record says why the rule became an invariant on the row rather than a second
prong in the gate. DESIGN.md §5, `canCreateWorkspace`, carries the model.

## Where things stood

DESIGN.md §5 let an admin create a workspace "regardless of the flag", and
M6.7 was written to gate on `canCreateWorkspace` **or** the admin role. M2.9
had a grant set the flag as well, "so the row states what the person may do"
([`m2.9-granting-admin.md`](m2.9-granting-admin.md), "Granting"), but MB.59,
which carries that rule, is not built. In the meantime nothing gave an admin
the flag:

- the primary admin's promotion (MB.60, MB.68) writes `role` alone;
- fixture E is seeded `role: 'admin'` with the flag `false`, on purpose, so
  that M6.7's admin prong had a fixture
  ([`standard-scenario.md`](../db/standard-scenario.md));
- MB.58's migration backfilled the ledger for every admin, but not the flag.

So every admin read "No" in MB.52's `/admin/users` and sat in M5.8's
awaiting-approval filter, which reads the flag alone. Two readers of the same
question had two answers.

## Decision

The flag is what lets anyone create a workspace, admins included, and every
admin holds it:

- A CHECK on `users`, `users_admin_can_create_workspace`, refuses a row with
  `role = 'admin'` and `can_create_workspace = false`. It binds soft-deleted
  rows too, since it states a fact about the row, not uniqueness.
- Its migration first sets the flag on every admin row, soft-deleted
  included, stamped as that admin as MB.58's backfill was, then adds the
  constraint.
- Promotion writes both columns in its one audited update; MB.59's
  `setUserRole` inherits that. Revoking admin leaves the flag, as before.
- Fixture E is seeded with the flag.
- M6.7's gate reads the flag alone, never `role`.

## Why an invariant and not a second prong

- **One rule, read one way.** With the prong, every reader of "may this
  person create?" had to know the admin rule — the gate, the awaiting filter,
  the user list's column, any future report. With the CHECK, the column is
  the answer.
- **Impossible, not absent.** Setting the flag at the grant alone would leave
  a hand-written `UPDATE`, an older row or a future writer free to break it.
  CLAUDE.md's sweep-task tell applies: the state can be made impossible, so
  it is.
- **No new fixture lost.** E existed to exercise the admin prong. With no
  prong there is nothing for it to distinguish, and E now proves the other
  thing: an admin creates through the flag like anyone else.

## What it costs

- **M5.8 cannot revoke an admin's flag.** The CHECK would refuse it; M5.8's
  service refuses it first with an explaining error, and revoking admin is
  the route. Revoking admin leaves the flag, so a former admin keeps it — the
  grant was a vouching too ([`m2.9-granting-admin.md`](m2.9-granting-admin.md),
  "Revoking").
- **A hand-promoted admin needs both columns.** The stop-gap `psql` route
  ([`admin-bootstrap.md`](../auth/admin-bootstrap.md), "Granting a second
  admin") sets `can_create_workspace` with `role`, or the CHECK refuses it.
- **Test rows that insert an admin set the flag**, through the raw client as
  every setup row is.
