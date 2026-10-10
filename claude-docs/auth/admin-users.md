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

- **One service, two transports.** `grantWorkspaceCreation(session, userId, note?)`
  and `revokeWorkspaceCreation(session, userId, note?)`
  (`src/modules/identity/services/workspace-creation.ts`) assert the site
  role themselves, by direct call, and the two mutations in front of them carry
  the `admin` scope as the second check
  ([`graphql/schema.md`](../graphql/schema.md), "Auth scopes"). The page has
  no path of its own: the row's control sends the mutation.
- **Each change is a ledger row, in the same transaction.** The flag is an
  `updateById` on the user's row through `withAudit`, declared
  `{ via: 'admin', note }`, `note` being the confirmation's optional reason, a
  blank one stored as none (added 2026-10-10 beside MB.59's, on the owner's
  call), and the trigger on `users` writes a `create_workspace`
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
  destructive and says their covens stay theirs, and an approval of an
  unverified address warns that nobody has proved who holds it and that
  approving keeps the account from lapsing (MB.204, MB.205), and still
  approves. Each takes the same optional Reason as Grant and Revoke of admin
  ([`components/user-list.md`](../components/user-list.md)).

**Tests.** `tests/modules/identity/services/workspace-creation.test.ts` covers
each write, its stamps and its ledger row; each non-admin fixture user refused
by direct call, with the same call proven to succeed for E; the repeated
change refused with nothing written; an admin's flag refused; A's ownership
of W surviving a revoke; and a soft-deleted or unknown user. The transport's
half is `tests/modules/identity/graphql/workspace-creation.test.ts`, a
signed-out caller is `tests/db/graphql-query-scopes.test.ts`'s, and
`tests/e2e/admin.spec.ts` approves and revokes a user against the built server,
approves an unverified one through the warning, and approves one with a
reason, read back off the ledger. The note on the ledger, trimmed or none, is
the service test's, and the transport test asserts the actor is the
session's whatever the request carries.

## Granting and revoking admin (MB.59)

An admin makes another user an admin, or stops one being one, from that
person's row on `/admin/users`, so a second admin is no longer an `UPDATE` in
`psql`. The rules, and the approaches rejected, are
[`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)'s
"The primary admin", "Granting" and "Revoking"; this is the shape.

- **One service, two checks.** `setUserRole(session, userId, role, note?)`
  (`src/modules/identity/services/user-role.ts`) asserts the site role itself,
  by direct call, and the `setUserRole` mutation in front of it carries the
  `admin` scope as the second check ([`graphql/schema.md`](../graphql/schema.md),
  "Auth scopes"). The page has no path of its own: the row's control sends the
  mutation.
- **Each change is a ledger row, written by the database.** The role is an
  `updateById` on the user's row through `withAudit`, declared
  `{ via: 'admin', note }`, `note` being the confirmation's optional reason, a
  blank one stored as none. The trigger on `users` writes an `admin` `grant`
  or `revoke` row in `user_privilege_changes` beside it, stamped as the admin
  from the session, never the request (MB.195); the service writes none.
- **A grant sets `canCreateWorkspace` in the same write**, since MB.177's
  CHECK holds every admin to it, so a grant to a user without the flag is two
  rows at one instant, `admin` and `create_workspace`, and a grant to one who
  holds it the `admin` row alone. **A revoke leaves the flag**, the grant
  having been a vouching too, and leaves memberships and the `created_by` of
  everything the admin wrote: rows are stamped with a person, not a role.
- **Any live user may be granted, verified or not.** Confirming who someone is
  is the granting admin's job, from the row's sign-in methods and verified
  mark; the confirmation warns when the address is unverified, since a grant,
  like an approval, keeps the account from MB.67's sweep (MB.204, MB.205).
  The grantee must already have an account; inviting by email is MB.70's,
  below.
- **A change that changes nothing is refused**, with a `Forbidden` naming the
  user: granting to an admin, or revoking from someone who is not one. No
  column changes, so the trigger records nothing.
- **The primary admin cannot be revoked**, by anyone, itself included. It is
  the live admin whose email matches `ADMIN_BOOTSTRAP_EMAIL` when the check
  runs, read from the variable at each check by `isPrimaryAdmin` (in
  `user-role.ts`, over `src/lib/primary-admin.ts`), compared case-insensitively. The refusal is a
  `Forbidden` in plain words that name no variable, the words its row shows:
  "This is the primary admin and can't be removed. Changing who the primary
  admin is takes a change to the site's configuration." How to change it is
  below, and in [`admin-bootstrap.md`](admin-bootstrap.md).
- **The count is the fallback.** A revoke locks every live admin row
  `for update`, in id order, through the writer's `lockLiveAdmins`, then
  refuses with a `Forbidden` if the target is the only one. Two admins
  revoking each other at once queue on the lock; the second reads the first's
  committed revoke, finds itself counting one, and is refused, so exactly one
  admin is left. While the primary admin exists the count is never what
  refuses; it guards the gap a change of the variable opens, before the new
  address's first qualifying sign-in, or for good if it never makes one.
- **A revoke takes effect on the next request.** The revoked admin's sessions
  stay valid, since they are still a user, and no new session is issued; their
  next request reads `role: 'user'` off the users row, so `/admin` and every
  admin mutation close to them. That holds because Better Auth's
  `session.cookieCache` is off, which `tests/lib/auth.test.ts` pins in its
  "session lifetimes" block: a cache would answer from the cookie until its
  TTL ran out.
- **A soft-deleted user is `NotFound`**, as an unknown id is.

**Changing the primary admin.** Set `ADMIN_BOOTSTRAP_EMAIL` to the new address
on the Vercel project and redeploy ([`config.md`](config.md)); the new address
is promoted at its next Google or Discord sign-in, or when it verifies the
address by mail ([`admin-bootstrap.md`](admin-bootstrap.md)). The previous
primary admin keeps `role: 'admin'` and is simply no longer protected: any
admin may now revoke them like any other. Between the redeploy and the new
address's promotion nobody is protected, and the count above is what keeps a
revoke from leaving no admin.

**Any future user-deletion path must refuse the primary admin.** v1 deletes no
user but the provisional-account sweep, which only ever reaches an unverified
account holding no privilege. A path added later that soft-deletes or removes
a `users` row must call `isPrimaryAdmin` and refuse, as the revoke does.

**Tests.** `tests/modules/identity/services/user-role.test.ts` covers each
write, its stamps and its ledger rows; the unverified grantee; the trigger
refusing the same write undeclared; each non-admin fixture user refused by
direct call, with the same call proven to succeed for E; the repeated change
refused with nothing written; memberships and `created_by` surviving a revoke;
the primary admin refused for another admin and for itself, with the same
revoke succeeding once the variable names someone else; the last admin
refused with no primary admin in the fixture; and two real concurrent revokes
leaving one admin. `tests/db/admin-revocation.test.ts` reads a revoked admin's
next request through the real session reader.
`tests/modules/identity/graphql/user-role.test.ts` is the transport's half, a
signed-out caller and the scope are `tests/db/graphql-query-scopes.test.ts`'s,
and `tests/e2e/admin.spec.ts` grants and revokes against the built server.

## Pausing admin changes (MB.63)

The primary admin can switch granting and revoking admin off for every other
admin, so an admin account gone rogue can neither make more admins nor remove
the good ones while it is dealt with, and back on. The argument is
[`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)'s
"Granting"; the ledger the switch is kept in is MB.62's
([`mb.62-pause-ledger.md`](../design-decisions/mb.62-pause-ledger.md)).

- **Only the primary admin may pause or resume.**
  `pauseAdminRoleChanges(session)` and `resumeAdminRoleChanges(session)`
  (`src/modules/identity/services/admin-role-pause.ts`) assert the site role,
  then read the caller's own row and refuse anyone `isPrimaryAdmin` does not
  name, with "Only the primary admin may pause or resume admin changes". The
  two mutations carry the `admin` scope as the second check, and take no
  argument, so a request names no actor.
- **Each pause is a row.** Pausing opens one through the writer's
  `pauseAdminRoleChanges`, stamped `created_by` from the session; resuming
  ends it through `resumeAdminRoleChanges`, stamping `ended_at` and
  `ended_by`. Both go through `withAudit`. A second pause or resume writes
  nothing and answers the state, `true` paused or `false` not, so a double
  click is not an error. Nothing in v1 lists the rows.
- **While paused, `setUserRole` refuses every other admin.** It reads the
  open pause first, and refuses a grant or a revoke from any admin but the
  primary one with "Admin changes are paused by the primary admin.", naming a role and no person. Nothing
  changes, so the trigger on `users` records nothing. Revokes are paused as
  well as grants, since removing the good admins is the same attack from the
  other side.
- **Coven creation pauses too** (amended 2026-10-10, on the owner's call):
  `grantWorkspaceCreation` and `revokeWorkspaceCreation` call the same
  `assertChangesOpen` guard, exported from `admin-role-pause.ts`, so another
  admin's approve or revoke is refused with the same `Forbidden` and writes no
  ledger row while a pause is open.
- **The primary admin is exempt**, so it can clean up without resuming first:
  its grants and revokes go through and are recorded as usual. The exemption
  costs nothing, since the primary admin is the one account a rogue admin
  cannot become: the variable names it, and it cannot be revoked.
- **On `/admin/users`** every admin sees the control beside the page's
  heading, and a warning saying changes are paused while they are. The
  control is usable by the primary admin alone, in view but `aria-disabled`
  for any other, with the reason in a tip; while paused, such an admin's
  Grant and Revoke, and coven creation's Approve and Revoke, are locked the
  same way
  ([`components/user-list.md`](../components/user-list.md)). The page reads
  the state through `adminRoleChangePauseState(session)`.

**Tests.** `tests/modules/identity/services/admin-role-pause.test.ts` covers
pausing and resuming and their stamps; a second pause and a second resume;
another live admin refused, with that admin proven able to grant; nobody
allowed while the variable names no one; each non-admin fixture user; a grant
and a revoke by another admin refused while paused, writing no ledger row,
and the same calls succeeding once resumed; and the primary admin's grant and
revoke recorded while paused.
`tests/modules/identity/services/workspace-creation.test.ts` covers another
admin's approve and revoke refused while paused with no ledger row, the same
calls succeeding once resumed, and the primary admin's recorded as usual.
`tests/modules/identity/graphql/admin-role-pause.test.ts` is the transport's
half, the stamps the session's whatever the request carries, and
`tests/e2e/admin.spec.ts` pauses, refuses another admin's grant, and resumes
against the built server.

## Inviting an admin (MB.70)

An admin can make someone an admin who has not signed in yet, by inviting
their address: M2.9's option B
([`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md), "The
approaches"), on the site tier of MB.201's `invitations`
([`db/invitations.md`](../db/invitations.md)). The link is mailed to the
address and accepted only by an account that has proved it holds it, so no
one is handed a bearer token for the site's highest privilege (story 62).

- **One service each way, two checks.** `createAdminInvitation(session,
email, note, sender)` and `revokeAdminInvitation(session, id)`
  (`src/modules/identity/services/admin-invitations.ts`) assert the site role
  themselves, by direct call, and the two mutations in front of them carry the
  `admin` scope as the second check. `listPendingAdminInvitations(session)` is
  the pending list, newest first, a read the page calls; no GraphQL query
  lists invitations.
- **The token is the mail's alone.** `crypto.randomBytes(32)`, base64url,
  goes to the repository's `insertInvitation(admin, …)`, which stores its
  hash, and to the sender, which mails the link; the row the mutation answers
  carries neither, and `Invitation` has no field that could. The sender,
  `invitationSender(request)` in `src/lib/invitation-mail.ts`, is built per
  request by the GraphQL context as the email page's is, because the link's
  origin is Better Auth's to resolve against its allowed hosts: a forged
  `Host` cannot have a live token mailed on a link to another site. The mail
  is `src/emails/admin-invitation.tsx` ([`email.md`](../email.md)). A failed
  send is logged by the transport and never thrown, so the invitation stays
  pending, to be withdrawn and sent again.
- **What is refused at creation.** An address the email page would refuse,
  as a `ValidationError` on `email`, and the address of a live admin, who
  would have nothing to accept. A second invitation to the same address is
  not refused: either link works, and the other then says it has been
  accepted, or the admin withdraws it.
- **Paused with the rest (MB.63).** While admin changes are paused, inviting
  and withdrawing are refused for every admin but the primary one, by the
  shared `assertChangesOpen` and in its words, naming nobody.
- **One accept service, for both tiers.** `acceptInvitation(session, token)`
  (`src/modules/identity/services/invitation-acceptance.ts`) is the one M7.5's
  entry describes, built here with the site tier's branch; M7.5 adds the
  workspace's, and until then a workspace invitation is refused as an invalid
  link. It checks, in this order:
  1. The token names a live invitation, or the link is invalid (`NotFound`).
     The token is hashed in the repository, so a hash read off a dumped row
     names nothing.
  2. The link is not dead: **accepted, then revoked, then expired**, so a
     link in two states always reports the same one reason, an act before
     the clock. Each is a `Forbidden` in words of its own, and none names a
     workspace (M7.7, which asserts them on the workspace tier).
  3. The tier: the site tier's branch, below; a workspace's is invalid until
     M7.5.
  4. The session's account holds the invited address, compared
     case-insensitively, or "This invitation was sent to a different email
     address"; and holds it **verified**, or it is pointed at `/account/email`
     to confirm it first. The repository's accept repeats the address match in
     its statement, so a path that forgot the check still cannot redeem.
  5. Admin changes are not paused, or the primary admin sent the invitation:
     the pause exempts the primary admin's own grants, and an invitation is a
     grant its invitee completes. One a rogue admin sent before the pause
     waits for the resume.
- **Accepting is a grant.** The invitation is stamped `acceptedAt` and
  `acceptedBy`, and the user made an admin who may create covens through
  `writeAdminGrant`, MB.59's role write, in one transaction declared
  `{ via: 'invitation', note }` with the invitation's note, so the trigger on
  `users` records an `admin` grant, and a `create_workspace` grant if the flag
  was off, as the accepting user's act. The service writes no ledger row. An
  account that is already an admin has the invitation stamped and nothing
  granted, so nothing is recorded. A revoke or a second accept that commits
  between the checks and the stamp leaves nothing to stamp, and the refusal
  is the link's state read again.
- **`/invite/[token]`** is public in `src/proxy.ts`. Signed out, it says an
  invitation is waiting and offers Sign In, which returns to the link; it
  reads nothing of the invitation until a session holds it. Signed in, it
  asks `invitationStanding(session, token)`, the same checks as the accept,
  and shows the refusal, with a link to the email page for an unverified
  match, or Accept Invitation, whose mutation lands an admin on `/admin`. An
  unverified account reaches the page, since `requireSession()`'s redirect
  would lose the reason; the accept refuses it all the same.
- **On `/admin/users`** every admin sees, beneath the list, an Admin
  Invitations section: Invite Admin, and the pending invitations, each with
  its address, its reason, when it expires and Revoke
  ([`components/admin-invitations.md`](../components/admin-invitations.md)).
  While changes are paused, both controls are `aria-disabled` for any admin
  but the primary one, with the pause as the reason.

**Not done here.** Revoking an admin does not withdraw the invitations they
sent: the pending list is where an admin sees them and acts. An accepted
invitation is already in the privilege ledger as its `invitation` row, so no
list of past invitations is kept.

**Tests.** `tests/modules/identity/services/admin-invitations.test.ts` covers
creating, with the real sender over a mocked transport, so the link that
reaches the address is the one read back; revoking and listing; each
non-admin fixture user refused by direct call, with E proven able; and the
pause, with the same calls succeeding once resumed.
`tests/modules/identity/services/invitation-acceptance.test.ts` covers the
grant and its ledger rows; the same write undeclared refused by the trigger;
the unverified match and the different address, each beside the call that
succeeds; each dead link, the two-state links, a second use, a hashed token
and a workspace invitation; and the pause, by whom the invitation was sent.
`tests/modules/identity/graphql/admin-invitations.test.ts` is the
transport's half, the scope is `tests/db/graphql-query-scopes.test.ts`'s, and
story 62's acceptance test is in `tests/acceptance/08-email-and-admin.test.ts`.

## The privilege ledger (MB.199, MB.200)

Every change to who is an admin and who may create a coven is a row of
`user_privilege_changes`, which the database writes and nothing in the
application inserts into (MB.194, MB.195; DESIGN.md §5). MB.199 is its read
and MB.200 its page, `/admin/privilege-changes`: the whole ledger, newest
first, for the admin who suspects misuse (story 61).

- **One service, two transports.** `listPrivilegeChanges`
  (`src/modules/identity/services/privilege-changes.ts`) is a site admin's
  alone, asserted by direct call. GraphQL's `privilegeChanges` query ends at
  it and carries the `admin` scope as the second check, so a non-admin is
  refused before the service is asked
  ([`graphql/schema.md`](../graphql/schema.md), "Auth scopes").
- **Newest first, a page at a time.** `findPrivilegeChangePage`
  (`src/db/repository/users.ts`) reads through `findPage` under the
  `SiteAdmin` proof, keyed on `created_at` negated, since a page's key is
  ascending, and read as `numeric` so a cursor keeps the microseconds; rows of
  one instant, a role grant and the flag it sets, follow by id.
- **Narrowed by subject, by part of the subject's name or email, by
  privilege, or any of them.** Each part is optional. The query matches as
  the user list's `query` does, case-insensitively with `%` and `_` read
  literally, on the subject's live row only, never the actor's: a
  correlated `EXISTS` on `users`, in SQL, so no row is fetched to be dropped
  (rule 7); a blank one is none. A subject that is not an id is a
  `ValidationError`, not a read: the keyset read takes any data exception for
  a bad cursor.
- **Subject and actor in one read per page.** `PrivilegeChange.subject` and
  `.actor` (the row's `created_by`) both load through `usersByIdForAdmin`,
  whose service, `usersForAdmin(session, userIds)`, answers a site admin each
  live user, null where none is live, and refuses every slot to anyone else.
  It is the admin's whole row, not MB.10's display-name `usersById`.
- **One page, not one per privilege.** `/admin/privilege-changes` is one
  ledger, filtered by part of the subject's name or email (`?query=`, which
  the permissions history icon before each name on `/admin/users` opens with
  that user's address) and by privilege (`?privilege=admin|create_workspace`,
  a dropdown). The page takes no `?user=`: the read's `userId` is GraphQL's.
  It is not merged with the pause or the invitations, which stay where they
  are acted on; an accepted invitation is already in the ledger as its
  `invitation` row. A server component under `requireAdminSession()`, it
  calls the service through `cache()`, numbered by `resolveNumberedPage`
  with `countPrivilegeChanges` as every admin list is (MB.132), and reads the
  users a page names in one `usersForAdmin` call. A hand-edited privilege is
  no filter, and a cursor from another list reads the first page
  ([`components/privilege-ledger.md`](../components/privilege-ledger.md)).
- **A row links its people to their `/admin/users` rows**, the list filtered
  to their address, except the seed's bootstrap user, which the list leaves
  out (`listedOnUserList`).
- **No index beyond the key.** The plan does not want one: the ledger holds a
  row per privilege an admin, an invitation or the bootstrap changes, a few
  rows a user, and the planner seq-scans it whole. At ten thousand rows an
  index on `(user_id, created_at desc)` serves only the subject's filter, as
  a bitmap scan; it cannot serve the order, which is on the negated
  expression, and every page still sorts.

**Tests.** `tests/modules/identity/services/privilege-changes.test.ts` covers
the order, each filter and both together, a walk two rows at a time each way
across shared instants and a microsecond pair, the malformed subject, and each
non-admin fixture user refused by direct call with E proven to read the same
rows. `tests/modules/identity/graphql/privilege-changes.test.ts` holds the
transport's half: every field, the filters reaching the service, subject and
actor in one user read per page by query count, and the scope's own refusal.
A signed-out caller is `tests/db/graphql-query-scopes.test.ts`'s. The page's
half is `tests/app/admin/privilege-changes/page.test.tsx`, story 61's
acceptance test is `tests/acceptance/08-email-and-admin.test.ts`'s, and
`tests/e2e/admin/privilege-changes.spec.ts` reads the page, its filters and
the history icon link against the built server, with axe.
