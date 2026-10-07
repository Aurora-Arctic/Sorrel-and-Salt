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
- **Two filters, both in SQL.** `?query=` matches a substring of the name or
  the email, case-insensitively, with `%` and `_` read literally. It is an
  `ilike` rather than a trigram match, because an admin looks a person up by
  part of an address, which similarity scores poorly. `?awaiting`, a flag read by
  its presence (MB.53), narrows to `canCreateWorkspace = false`, the to-do
  list M5.8 acts on. The filter is a GET form to the page itself, so a
  filtered page is an address.
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
the default page of 25, the resumed cursor, the refusal signed in and signed
out, and that the nodes are the same `User` as `me`'s.
`tests/app/admin/users/page.test.tsx` covers the guard running first and the
search parameters becoming the filter and the pager's links.
`tests/e2e/admin.spec.ts` checks the page an admin sees against the built
server, with axe.
