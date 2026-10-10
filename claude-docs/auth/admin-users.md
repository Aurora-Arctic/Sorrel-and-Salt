## The user list (MB.52)

`/admin/users` lists everyone with an account, so an admin can act on a person
without being sent their id: M5.8's approval control and MB.59's grant control
act on its rows, and MB.53 picks an impersonation target from it. Each row
shows the name, the email, the role, whether the user may create a workspace,
when the account was made, the providers linked to it, and whether its address
is verified. The last two are what an admin granting admin is asked to judge
the person by (MB.59).

**It confers no workspace access.** Reading who has an account is what the
admin role already implies. The page reads nothing below `users` and
`accounts`, and it offers no control over any workspace. It is not one more
thing an admin curates, either: CLAUDE.md's "and nothing else" governs what an admin
may _change_.

- **One service, two transports.** `listUsers(session, filter, page)` and
  `providersOf(session, userIds)` (`src/modules/identity/services/user-list.ts`)
  are a site admin's alone. Each asserts the role itself, by direct call, so a
  non-admin is refused at the service and not merely kept off the page. The
  page calls them under `requireAdminSession()`, and GraphQL's `users` query
  and `User.providers` field end at the same two functions. The list is a read,
  so M5.7's mutation sweep does not reach it, and the query carries no Pothos
  scope of its own.
- **Under the `SiteAdmin` proof.** `findUserPage` and `findProvidersOfUsers`
  (`src/db/repository/users.ts`) take the proof first, so the repository
  cannot be asked for the list by a caller that has not checked the role
  ([`db/site-admin-proof.md`](../db/site-admin-proof.md), "The SiteAdmin
  proof"). `findProvidersOfUsers` returns each account's user and provider
  only, so the tokens on an `accounts` row never leave the repository.
- **Not Better Auth's `listUsers`.** The `admin` plugin ships one, but it
  would put a database read outside the repository and a browser-initiated
  read outside `/api/graphql`: rules 2 and 1 in one call.
- **Paged by the M3.6 helper.** The order is name then id, with a keyset
  cursor and no offset, and a page holds 25 rows. The page reads it with
  `resolvePage`, as `t.pagedConnection` does. `?after=` and `?before=` carry
  the cursor. A cursor the codec cannot read gets the first page rather than an
  error, since only a hand-edited address carries one.
- **Three filters, all in SQL.** `?query=` matches a substring of the name or
  the email, case-insensitively, with `%` and `_` read literally, through
  the repository's `containsText`, which the category and form lists share (MB.178). It
  is an `ilike` rather than a trigram match, because an admin looks a person
  up by part of an address, which similarity scores poorly. `?awaiting`, a flag read by
  its presence (MB.53), narrows to `canCreateWorkspace = false`, the to-do
  list M5.8 acts on. `?role=admin` or `?role=user` narrows to that site role
  (M5.8, on the owner's review); any other value is no role, since only a
  hand-edited address carries one. The filter is a GET form to the page
  itself, so a filtered page is an address.
- **Soft-deleted users never appear.** `findUserPage` drops them, like every
  finder (rule 4); the service has no predicate to add, and no way to build
  one.
- **`User.email` keeps its one scope.** The `users` connection's nodes are the
  ordinary `User`, so `email`, `role`, `canCreateWorkspace` and the new
  `emailVerified` resolve through `selfOrAdmin` as they do on `me`. This page
  is the first consumer that passes that scope as an admin, rather than as the
  user themselves
  ([`graphql/schema.md`](../graphql/schema.md), "Auth scopes").
- **`User.providers` is an admin's alone**, the user's own row included. It
  resolves through the `providersByUser` loader. A user's own providers come
  from Better Auth, on `/account`, whose table it is.
- **Impersonate sits on each non-admin row** where impersonation is
  registered (MB.53). The control is the page's, but the guard is Better
  Auth's endpoint, which refuses a non-admin caller and an admin target
  ([`impersonation.md`](impersonation.md)).
- **The bootstrap user is left out.** The seed's system user,
  `BOOTSTRAP_USER_ID`, named Seed System User, is a live `users` row in every
  database, production included, because it stamps the seeded rows. Nobody can
  sign in as it ([`db/seed-module.md`](../db/seed-module.md), "The seed module"), so nothing
  an admin does to a person applies to it, and `findUserPage` drops it in SQL
  beside the soft-delete filter.

**Tests.** `tests/modules/identity/services/user-list.test.ts` covers the
order, the cursor, both filters, the literal wildcards, the bootstrap user,
soft-deleted rows and
the refusal of every non-admin fixture user by direct call, after proving that
the same call answers E. `tests/modules/identity/graphql/users.test.ts` covers
the transport's half (MB.186): the default page of 25, the resumed cursor, the
filters reaching the service, and that the nodes are the same `User` as
`me`'s; a signed-out caller is `tests/db/graphql-query-scopes.test.ts`'s.
`tests/app/admin/users/page.test.tsx` covers the guard running first and the
search parameters becoming the filter and the pager's links.
`tests/e2e/admin.spec.ts` checks the page an admin sees against the built
server, with axe.

## Approving workspace creation (M5.8)

An admin approves someone who has no invitation from that person's row on
`/admin/users`, so a person starting a coven of their own gets in without
knowing an existing user, and can revoke the approval from the same row. It is
the second of the flag's routes: the first is accepting a workspace invitation
(M7.5), and being made admin sets it in its own write (MB.177). Neither act
touches anything but the flag: it confers no workspace access on the admin,
creates no workspace, and a revoke leaves every workspace the user already
created, and their ownership of it
([`m5.8-revoking-workspace-creation.md`](../design-decisions/m5.8-revoking-workspace-creation.md)).

- **One service, two transports.** `grantWorkspaceCreation(session, userId)`
  and `revokeWorkspaceCreation(session, userId)`
  (`src/modules/identity/services/workspace-creation.ts`) assert the site
  role themselves, by direct call, and the two mutations in front of them carry
  the `admin` scope as the second check
  ([`graphql/schema.md`](../graphql/schema.md), "Auth scopes"). The page has
  no path of its own: the row's control sends the mutation.
- **Each change is a ledger row, in the same transaction.** The flag is an
  `updateById` on the user's row through `withAudit`, declared
  `{ via: 'admin' }`, and the trigger on `users` writes a `create_workspace`
  `grant` or `revoke` row in `user_privilege_changes` beside it, stamped as
  the admin from the session, never the request (MB.195). The service writes
  no ledger row itself. The row's own `updated_by` goes with its next update;
  the ledger's row does not.
- **A change that changes nothing is refused, not repeated.** Approving a user
  who may already create a workspace, or revoking one who cannot, is refused
  with a `Forbidden` naming them, and writes no ledger row: it would record a
  change that never happened.
- **An admin's flag cannot be revoked.** MB.177's CHECK holds every admin to
  it, so the service refuses first with a `Forbidden` saying revoking their
  admin role is the route, and the row offers no control. A revoke racing a
  grant of admin is refused by the CHECK itself and writes nothing.
- **A soft-deleted user is `NotFound`**, as an unknown id is: the read and the
  update both drop the row (rule 4), and a user deleted between the two rolls
  the transaction back before the ledger hears of it.
- **Each asks first**, in the user's row, naming them; a revoke's Confirm is
  destructive and says their covens stay theirs
  ([`components/user-list.md`](../components/user-list.md)).

**Tests.** `tests/modules/identity/services/workspace-creation.test.ts` covers
each write, its stamps and its ledger row; each non-admin fixture user refused
by direct call, with the same call proven to succeed for E; the repeated
change refused with nothing written; an admin's flag refused; A's ownership
of W surviving a revoke; and a soft-deleted or unknown user. The transport's
half is `tests/modules/identity/graphql/workspace-creation.test.ts`, a
signed-out caller is `tests/db/graphql-query-scopes.test.ts`'s, and
`tests/e2e/admin.spec.ts` approves and revokes a user against the built server.
