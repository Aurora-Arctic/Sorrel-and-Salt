## The user list (MB.52)

`/admin/users` lists everyone with an account, so an admin can act on a person
without being sent their id: M5.8's approval control and MB.59's grant control
act on its rows (Change Role since M11.20), and MB.53 picks an impersonation target from it. Each row
shows the name, the email, the role, whether the user may create a workspace,
when the account was made, the providers linked to it, and whether its address
is verified. The last two are what an admin changing a role is asked to judge
the person by (MB.59). The role column names `User`, `Curator` or `Admin`, the last two in bold; the
coven-creation column and its control show for a `user` only, since every curator and admin holds the flag.

**It confers no workspace access.** Reading who has an account is what the
admin role already implies. The page reads a user's memberships — each
coven's name and the user's role in it — for the modal (M9.19), and nothing
beneath them: no ingredient, spell or member list. It offers no control over
any workspace. It is not one more
thing an admin curates, either: CLAUDE.md's "and nothing else" governs what an admin
may _change_.

- **One service, two transports.** `listUsers(session, filter, page)`,
  `countUsers(session, filter, start)` and `providersOf(session, userIds)`
  (`src/modules/identity/services/user-list.ts`) are a site admin's alone. Each asserts the role itself, by direct call, so a
  non-admin is refused at the service and not merely kept off the page. The
  page calls them under `requireAdminSession()`, and GraphQL's `users` query
  and `User.providers` field end at the same two functions. The list is a read,
  so M5.7's mutation sweep does not reach it, and the query carries no Pothos
  scope of its own.
- **Under the `SiteAdmin` proof.** `findUserPage`, `findUserCount` and `findProvidersOfUsers`
  (`src/db/repository/users.ts`) take the proof first, so the repository
  cannot be asked for the list by a caller that has not checked the role
  ([`db/site-admin-proof.md`](../db/site-admin-proof.md), "The SiteAdmin
  proof"). `findProvidersOfUsers` returns each account's user and provider
  only, so the tokens on an `accounts` row never leave the repository.
- **Not Better Auth's `listUsers`.** The `admin` plugin ships one, but it
  would put a database read outside the repository and a browser-initiated
  read outside `/api/graphql`: rules 2 and 1 in one call.
- **Paged by the M3.6 helper.** The order is name then id, with a keyset
  cursor and no offset, and a page holds 25 rows. The page reads it through
  `readNumberedPage` (`src/lib/numbered-page.ts`), which pages it with
  `resolveNumberedPage` and counts it with `countUsers`, so the pager says
  "Page 2 of 3" between Prev and Next as every admin list does (MB.115): the
  count is every user the filter keeps, and how many of them come before the
  page's first row. GraphQL's `users` connection pages with `resolvePage` and
  is not counted. `?after=` and `?before=` carry the cursor. A cursor the codec
  cannot read, or one it reads that names no row of this list, as a cursor
  copied from another list does, gets the first page rather than an error.
- **Three filters, all in SQL.** `?query=` matches a substring of the name or
  the email, case-insensitively, with `%` and `_` read literally, through
  the repository's `containsText`, which the category and form lists share (MB.178). It
  is an `ilike` rather than a trigram match, because an admin looks a person
  up by part of an address, which similarity scores poorly. `?awaiting`, a flag read by
  its presence (MB.53), narrows to `canCreateWorkspace = false`, the to-do
  list M5.8 acts on. `?role=admin`, `?role=curator` or `?role=user` narrows to that site role
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
soft-deleted rows, the count under each filter and before a page, and
the refusal of a non-admin fixture user by direct call, list and count alike,
after proving that the same call answers E. `tests/modules/identity/graphql/users.test.ts` covers
the transport's half (MB.186): the default page of 25, the resumed cursor, the
filters reaching the service, and that the nodes are the same `User` as
`me`'s; a signed-out caller is `tests/db/graphql-query-scopes.test.ts`'s.
`tests/app/admin/(people)/users/page.test.tsx` covers the guard running first and the
search parameters becoming the filter, the count and the pager's links and
position, and a foreign cursor reading the first page.
`tests/e2e/admin.spec.ts` checks the page an admin sees against the built
server, with axe.

## The user modal (M9.19)

Pressing a user's name on the list opens a modal over it, so an admin sees
what a person already holds before approving, revoking, changing their role or
impersonating them. The owner narrowed story 19 for this: "private data" is a
workspace's contents, and which covens someone belongs to is not among them
([`design-decisions/m9.19-admin-sees-user-covens.md`](../design-decisions/m9.19-admin-sees-user-covens.md)).

- **The address is `?user=<id>`.** The press opens the modal at once, over a
  skeleton, through M9.18's `RouteModal`; the list keeps its filter and page
  beneath it, and Close drops `?user=`. A request that arrives with a live
  `?user=` renders the modal on the server.
- **The head** is the eyebrow "User", the name as the title and the email on a line beneath it as
  the qualifier. The body is `UserDetail`
  ([`components/user-detail.md`](../components/user-detail.md)): every fact
  the list's row shows (the page reads them with the user, so the modal holds
  the whole row), with the row's Change Role and Approve or Revoke
  beside the facts they change, asking inside the modal and going through the
  same mutations and services as the row's, then a Covens list (each coven's name, with its role and joining date beneath), owners first, then members, then viewers, each
  by name. Coven names are text, not links: an admin reaches no coven, and
  `/coven/[slug]` is a 404 to a non-member.
- **The reads come with the navigation**, from the server page, under
  `requireAdminSession()`: `usersForAdmin` for the user, `membershipsOf` for
  the covens, `providersOf`. No GraphQL query is added. `membershipsOf`
  (`src/modules/coven/services/memberships.ts`) answers a key that is the caller's own, or any key
  when the caller is a site admin; it hands over
  a workspace's `id`, `name` and `slug` and nothing beneath. GraphQL's
  `User.memberships` therefore resolves for an admin too, with no schema
  change.
- **A `?user=` that opens nothing shows the missing notice** over the list,
  with no dialog: one that is not an id, names no user, names a soft-deleted
  user or names the bootstrap user.
- **Impersonate sits in the modal** for a non-admin user where impersonation
  is registered. It asks first, inside the modal, through `ConfirmQuestion`,
  and shares its wording and its send with the list's button
  (`src/components/UserList/impersonation.tsx`). The modal offers no other
  control.

**Tests.** `tests/modules/coven/services/memberships.test.ts` (an admin is
answered, with the preconditions; another member is still refused),
`tests/db/workspace-isolation.test.ts` (E reads D's membership of X and is
still refused X's contents by direct id), `tests/modules/identity/graphql/users.test.ts`,
the page and component tests, and an e2e test in `tests/e2e/admin.spec.ts`
tagged `@story-19`, which passes an axe scan with the modal open.

## Approving workspace creation (M5.8)

An admin approves someone who has no invitation from that person's row on
`/admin/users`, so a person starting a coven of their own gets in without
knowing an existing user, and can revoke the approval from the same row. It is
the second of the flag's routes: the first is accepting a workspace invitation
(M7.5), and being made a curator or an admin sets it in its own write (MB.177, M11.20). Neither act
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
- **A curator's or an admin's flag cannot be revoked.** The
  `users_privileged_can_create_workspace` CHECK holds every curator and admin
  to it, so `revokeWorkspaceCreation` refuses any role but `user` first with a
  `Forbidden` saying to make them a user first, and the row offers no control
  (nor an approval, which a curator has no need of). A revoke racing a
  promotion is refused by the CHECK itself and writes nothing.
- **A soft-deleted user is `NotFound`**, as an unknown id is: the read and the
  update both drop the row (rule 4), and a user deleted between the two rolls
  the transaction back before the ledger hears of it.
- **Each asks first**, in the user's row, naming them; a revoke's Confirm is
  destructive and says their covens stay theirs, and an approval of an
  unverified address warns that nobody has proved who holds it and that
  approving keeps the account from lapsing (MB.204, MB.205), and still
  approves. Each takes the same optional Reason as Change Role
  ([`components/user-list.md`](../components/user-list.md)).

**Tests.** `tests/modules/identity/services/workspace-creation.test.ts` covers
each write, its stamps and its ledger row; each non-admin fixture user refused
by direct call, with the same call proven to succeed for E; the repeated
change refused with nothing written; an admin's flag refused; A's ownership
of W surviving a revoke; and a soft-deleted or unknown user. The transport's
half is `tests/modules/identity/graphql/workspace-creation.test.ts`, a
signed-out caller is `tests/db/graphql-query-scopes.test.ts`'s, and
`tests/e2e/admin.spec.ts` approves and revokes a user against the built server,
approving with a reason read back off the ledger. The note on the ledger, trimmed or none, is
the service test's, and the transport test asserts the actor is the
session's whatever the request carries.

## Changing a site role (MB.59, M11.20)

An admin gives another user a site role, `user`, `curator` or `admin`, from
that person's row on `/admin/users`, so a second admin is no longer an `UPDATE`
in `psql`. A curator is between the two: it uses every curation screen an admin
can and reaches no people page
([`admin-guard.md`](admin-guard.md), "The curator guard"). The rules, and the
approaches rejected, are
[`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)'s
"The primary admin", "Granting" and "Revoking", and
[`m11.20-curator-role.md`](../design-decisions/m11.20-curator-role.md); this is
the shape.

- **One service, two checks.** `setUserRole(session, userId, role, note?)`
  (`src/modules/identity/services/user-role.ts`) checks the site role itself,
  by direct call, and the `setUserRole` mutation in front of it carries the
  `admin` scope as the second check ([`graphql/schema.md`](../graphql/schema.md),
  "Auth scopes"). A curator is refused at both: changing roles is a people-page
  act. The page has no path of its own: the row's control sends the mutation.
- **One dialog, every role but the one held.** The row's Change Role button
  opens a dialog naming the user and listing the roles they do not hold, each
  with a line on what it allows, and an optional reason. Nothing is preselected,
  and the confirm button reads Promote or Demote by the ladder `user` <
  `curator` < `admin`, a demotion styled as destructive
  ([`components/user-list.md`](../components/user-list.md)). It replaces the
  old pair of Promote and Revoke buttons.
- **Each change is a ledger row, written by the database.** The role is an
  `updateById` on the user's row through `withAudit`, declared
  `{ via: 'admin', note }`, `note` being the confirmation's optional reason, a
  blank one stored as none. The trigger on `users` writes the rows in
  `user_privilege_changes` beside it, stamped as the admin from the session,
  never the request (MB.195); the service writes none. `admin` and `curator`
  are each a privilege of their own in the ledger, so a move between two roles
  is a revoke of one and a grant of the other, at one instant:

  | Change           | Ledger rows                                                       |
  | ---------------- | ----------------------------------------------------------------- |
  | user to curator  | `curator` grant, and `create_workspace` grant if the flag was off |
  | user to admin    | `admin` grant, and `create_workspace` grant if the flag was off   |
  | curator to admin | `curator` revoke and `admin` grant                                |
  | admin to curator | `admin` revoke and `curator` grant                                |
  | curator to user  | `curator` revoke; the flag stays                                  |
  | admin to user    | `admin` revoke; the flag stays                                    |

- **Becoming a curator or an admin sets `canCreateWorkspace` in the same
  write**, since the `users_privileged_can_create_workspace` CHECK
  (`role = 'user' or can_create_workspace`, replacing MB.177's
  `users_admin_can_create_workspace`) holds every curator and every admin to
  the flag, so a promotion of a user without it is two rows at one instant.
  **Becoming a user leaves the flag**, the grant having been a vouching too,
  and leaves memberships and the `created_by` of everything the person wrote:
  rows are stamped with a person, not a role.
- **Any live user may be changed, verified or not.** Confirming who someone is
  is the changing admin's job, from the row's sign-in methods and verified
  mark; the dialog warns when the address is unverified, **on a promotion
  only**, since a promotion, like an approval, keeps the account from MB.67's
  sweep (MB.204, MB.205). The user must already have an account; inviting by
  email is MB.70's, below.
- **A change that changes nothing is refused**, with a `Forbidden` naming the
  user ("is already a curator"): the same role as the one held. No column
  changes, so the trigger records nothing.
- **The primary admin cannot be moved off admin**, by anyone, itself included.
  It is the live admin whose email matches `ADMIN_BOOTSTRAP_EMAIL` when the
  check runs, read from the variable at each check by `isPrimaryAdmin` (in
  `user-role.ts`, over `src/lib/primary-admin.ts`), compared
  case-insensitively. The refusal is a `Forbidden` in plain words that name no
  variable, the words its row shows: "You can't revoke the primary admin. The
  site's configuration sets who that is." How to change it is below, and in
  [`admin-bootstrap.md`](admin-bootstrap.md).
- **The count is the fallback.** Leaving `admin`, for `curator` or `user`, locks
  every live admin row `for update`, in id order, through the writer's
  `lockLiveAdmins`, then refuses with a `Forbidden` if the target is the only
  one. Two admins demoting each other at once queue on the lock; the second
  reads the first's committed change, finds itself counting one, and is
  refused, so exactly one admin is left. While the primary admin exists the
  count is never what refuses; it guards the gap a change of the variable opens,
  before the new address's first qualifying sign-in, or for good if it never
  makes one.
- **Paused with the rest.** `setUserRole` stays behind the primary admin's
  pause (MB.63, below), for a curator change as for an admin one.
- **A change takes effect on the next request.** A demoted admin's sessions
  stay valid, since they are still a user, and no new session is issued; their
  next request reads the new role off the users row, so `/admin`'s people pages
  and every admin mutation close to them (and, for a demotion to `user`, the
  curation pages too). That holds because Better Auth's `session.cookieCache`
  is off, which `tests/lib/auth.test.ts` pins in its "session lifetimes" block:
  a cache would answer from the cookie until its TTL ran out.
- **A curator can be impersonated like any non-admin**, since Better Auth's
  `adminRoles` stays `['admin']`; being a curator grants no impersonation.
- **A soft-deleted user is `NotFound`**, as an unknown id is.

**Changing the primary admin.** Set `ADMIN_BOOTSTRAP_EMAIL` to the new address
on the Vercel project and redeploy ([`config.md`](config.md)); the new address
is promoted at its next Google or Discord sign-in, or when it verifies the
address by mail ([`admin-bootstrap.md`](admin-bootstrap.md)). The previous
primary admin keeps `role: 'admin'` and is simply no longer protected: any
admin may now demote them like any other. Between the redeploy and the new
address's promotion nobody is protected, and the count above is what keeps a
demotion from leaving no admin.

**Any future user-deletion path must refuse the primary admin.** v1 deletes no
user but the provisional-account sweep, which only ever reaches an unverified
account holding no privilege. A path added later that soft-deletes or removes
a `users` row must call `isPrimaryAdmin` and refuse, as the role change does.

**Tests.** `tests/modules/identity/services/user-role.test.ts` covers each
write, its stamps and its ledger rows; the unverified user; the trigger
refusing the same write undeclared; each non-admin fixture user, F the curator
included, refused by direct call, with the same call proven to succeed for E;
the repeated change refused with nothing written; memberships and `created_by`
surviving a demotion; the primary admin refused for another admin and for
itself, with the same demotion succeeding once the variable names someone else;
the last admin refused with no primary admin in the fixture; and two real
concurrent demotions leaving one admin. `tests/db/privilege-change-trigger.test.ts`
covers the curator and admin ledger rows,
`tests/modules/identity/services/curator-boundary.test.ts` that a curator
reaches nothing on the people page, and `tests/db/admin-revocation.test.ts`
reads a demoted admin's next request through the real session reader.
`tests/modules/identity/graphql/user-role.test.ts` is the transport's half, a
signed-out caller and the scope are `tests/db/graphql-query-scopes.test.ts`'s,
and `tests/e2e/admin.spec.ts` changes a role through the dialog against the
built server.

## Pausing admin changes (MB.63)

The primary admin can switch role changes off for every other
admin, so an admin account gone rogue can neither make more admins or curators nor remove
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
  open pause first, and refuses a change to any role, a curator's included, from any admin but the
  primary one with "The primary admin has paused admin changes. Ask them to
  resume changes.", naming a role and no person. Nothing
  changes, so the trigger on `users` records nothing. Revokes are paused as
  well as grants, since removing the good admins is the same attack from the
  other side.
- **Coven creation pauses too** (amended 2026-10-10, on the owner's call):
  `grantWorkspaceCreation` and `revokeWorkspaceCreation` open with the same
  `assertAdminChangesOpen` guard, exported from `admin-role-pause.ts` — the
  site-role check, then `assertChangesOpen` — so another
  admin's approve or revoke is refused with the same `Forbidden` and writes no
  ledger row while a pause is open.
- **The primary admin is exempt**, so it can clean up without resuming first:
  its grants and revokes go through and are recorded as usual. The exemption
  costs nothing, since the primary admin is the one account a rogue admin
  cannot become: the variable names it, and it cannot be revoked.
- **On `/admin/users`**, the People page's Users tab, every admin sees the
  control as the tab's action, beside the page's heading, and a warning saying changes are paused while they are. The
  control is usable by the primary admin alone, in view but `aria-disabled`
  for any other, with the reason in a tip; while paused, such an admin's
  Change Role, and coven creation's Approve and Revoke, are locked the
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
their address, or since M11.20 a curator, the role picked in the invite form:
M2.9's option B
([`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md), "The
approaches"), on the site tier of MB.201's `invitations`
([`db/invitations.md`](../db/invitations.md)). The link is mailed to the
address and accepted only by an account that has proved it holds it, so no
one is handed a bearer token for the site's highest privilege (story 62).
The names in code still say "admin invitation" for both roles: an admin is
who sends one, and renaming the mutation and the services would buy no
behaviour.

- **A repeat invitation replaces the pending one** (MB.269). Inviting an address
  that already has a pending site-tier invitation, admin or curator, stamps that
  one revoked, as the admin, in the same write that creates the new one, so one
  is pending and its role is the one that applies. A coven's invitation to the
  address is not touched ([`db/invitations.md`](../db/invitations.md)).
- **One service each way, two checks.** `createAdminInvitation(session,
email, siteRole, note, sender)` and `revokeAdminInvitation(session, id)`
  (`src/modules/identity/services/admin-invitations.ts`) assert the site role
  themselves, by direct call, and the two mutations in front of them carry the
  `admin` scope as the second check. `listPendingAdminInvitations(session,
filter, page)` is one page of the pending list, newest first, and
  `countPendingAdminInvitations(session, filter, start)` its count, reads
  the page calls through `resolveNumberedPage` as every admin list does,
  25 to a page (MB.115); no GraphQL query lists invitations. Its filter (MB.115) is
  `{ email, expiringSoon }`: a fragment of the address, trimmed, and only
  the invitations lapsing within 24 hours, each narrowed in the
  repository's SQL ([`db/invitations.md`](../db/invitations.md)).
- **The token is the mail's alone.** `crypto.randomBytes(32)`, base64url,
  goes to the repository's `insertInvitation(admin, …)`, which stores its
  hash, and to the sender, which mails the link; the row the mutation answers
  carries neither, and `Invitation` has no field that could. The sender,
  `invitationSender(request)` in `src/lib/invitation-mail.ts`, is built per
  request by the GraphQL context as the email page's is, because the link's
  origin is Better Auth's to resolve against its allowed hosts: a forged
  `Host` cannot have a live token mailed on a link to another site. The mail
  is `src/emails/admin-invitation.tsx` ([`email.md`](../email.md)); the
  service hands the sender the inviting admin's name, read from their `users`
  row, for the mail to open with. A failed
  send is logged by the transport and never thrown, so the invitation stays
  pending, to be withdrawn and sent again.
- **The role is the invitation's.** `siteRole` is `curator` or `admin`,
  stored on the row (`invitations.site_role`), named in the mail's subject
  and body, and on the Accept page; GraphQL takes it as the
  `InvitableSiteRole` enum, which has no `user`.
- **What is refused at creation.** An address the email page would refuse,
  as a `ValidationError` on `email`, and the address of an account that
  already holds the invited role or a higher one, which would have nothing to
  accept: a curator invited as a curator, an admin as either. The ladder is
  `outranks` in `src/lib/site-roles.ts`, user below curator below admin, so
  a curator may be invited to become an admin. A second invitation to the same address is
  not refused: either link works, and the other then says it has been
  accepted, or the admin withdraws it.
- **Paused with the rest (MB.63).** While admin changes are paused, inviting
  and withdrawing are refused for every admin but the primary one, by the
  shared `assertAdminChangesOpen` and in its words, naming nobody.
- **One accept service, for both tiers.** `acceptInvitation(session, token)`
  (`src/modules/identity/services/invitation-acceptance.ts`) is the one M7.5's
  entry describes, built by MB.70 with the site tier's branch, and by M7.5
  with the workspace's; M10.32 added `acceptInvitationById`, the workspace
  tier alone, which runs the same checks over the row the session's verified
  address holds rather than the one a token names. It checks, in this order:
  1. The token names a live invitation, or the link is invalid (`NotFound`).
     The token is hashed in the repository, so a hash read off a dumped row
     names nothing.
  2. The link is not dead: **accepted, then declined, then revoked, then
     expired**, so a link in two states always reports the same one reason, an
     act before the clock. Declined (M10.34) is the invitee's own no, from the
     account page, on the workspace tier alone; it outranks revoked so that a
     declined link keeps saying so after the owner removes it from their list.
     Each is a `Forbidden` in words of its own, and none names a
     workspace (M7.7, which asserts them on the workspace tier).
  3. The tier: the site tier's branch, below, or the workspace's (M7.5), which
     seats the person at the invited role: a removed member's row is revived
     (`reviveMembership`, `joinedAt` restarted), a live member's is left
     alone and the invitation only stamped, and otherwise a row is inserted.
     It sets `canCreateWorkspace` declared `via: 'invitation'`, which
     re-grants it to a person an admin revoked (M5.8's recorded default; no
     marker exists to consult). The standing carries the coven's name and slug, so the Accept page names the
     coven to the account that matches and is verified, and to no one else. An
     invitation into a deleted coven is
     `closed` (MB.119) at the standing, a `Forbidden` in words of its own
     ("The coven this invitation was for has been deleted, so it can't be
     accepted."), after the dead-link and address checks: an accepted link
     into a since-deleted coven still says accepted, and another address
     learns nothing of the coven. No Accept is offered; the repository
     write's live-workspace check is the backstop. The account page's accept
     by id keeps reading such an id as none (`NotFound`), since that page lists
     live covens only.
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
  `acceptedBy`, and the user given the invitation's role, who may then create
  covens, through `writeSiteRoleGrant`, MB.59's role write, in one transaction
  declared `{ via: 'invitation', note }` with the invitation's note, so the
  trigger on `users` records a grant of that role, and a `create_workspace`
  grant if the flag was off, as the accepting user's act. The service writes
  no ledger row. **An invitation never lowers a role**: an account that has
  since come to hold the invited role or a higher one has the invitation
  stamped and nothing granted, so nothing is recorded. A curator who accepts
  an admin invitation becomes an admin: a `curator` revoke and an `admin`
  grant at one instant, via the invitation. A revoke or a second accept that commits
  between the checks and the stamp leaves nothing to stamp, and the refusal
  is the link's state read again.
- **`/invite/[token]`** is public in `src/proxy.ts`. Signed out, it says an
  invitation is waiting and offers Sign In, which returns to the link; it
  reads nothing of the invitation until a session holds it. Signed in, it
  asks `invitationStanding(session, token)`, the same checks as the accept,
  and shows the refusal, with a link to the email page for an unverified
  match, or Accept Invitation, naming the role it grants, whose mutation
  lands a new curator or admin on `/admin`. An
  unverified account reaches the page, since `requireSession()`'s redirect
  would lose the reason; the accept refuses it all the same.
- **On `/admin/invitations`**, the People page's Invitations tab (beneath
  the user list on `/admin/users` until MB.115), every admin sees Invite
  Admin, whose form asks for the address, the role (Curator chosen to begin
  with, so granting the People page is a choice) and an optional reason, and
  the pending invitations 25 to a page, each with
  its address, its role, its reason, when it expires and Revoke, and the pager
  beneath them
  ([`components/admin-invitations.md`](../components/admin-invitations.md)).
  While changes are paused, both controls are `aria-disabled` for any admin
  but the primary one, with the pause as the reason.

**Not done here.** Revoking an admin does not withdraw the invitations they
sent: the pending list is where an admin sees them and acts. An accepted
invitation is already in the privilege ledger as its `invitation` row, so no
list of past invitations is kept.

**Tests.** `tests/modules/identity/services/admin-invitations.test.ts` covers
creating, with the real sender over a mocked transport, so the link that
reaches the address is the one read back; the role recorded, and each
address refused for already holding the role or a higher one beside the
curator invited to become an admin; revoking and listing; the list's
pages, newest first and by id within an instant, the filter narrowing every
page, and its count; each
non-admin fixture user refused by direct call, with E proven able; and the
pause, with the same calls succeeding once resumed.
`tests/modules/identity/services/invitation-acceptance.test.ts` covers the
grant of each role and its ledger rows, and an account already a curator or
an admin accepting a curator invitation, lowered and recorded nowhere; the same write undeclared refused by the trigger;
the unverified match and the different address, each beside the call that
succeeds; each dead link, the two-state links, a second use, a hashed token
and a workspace invitation; and the pause, by whom the invitation was sent.
`tests/modules/identity/graphql/admin-invitations.test.ts` is the
transport's half, the scope is `tests/db/graphql-query-scopes.test.ts`'s, and
story 62's browser flow is in `tests/e2e/stories/08-email-and-admin.spec.ts`.

## The privilege ledger (MB.199, MB.200)

Every change to who is an admin or a curator and who may create a coven is a row of
`user_privilege_changes`, which the database writes and nothing in the
application inserts into (MB.194, MB.195; DESIGN.md §5). MB.199 is its read
and MB.200 its page, `/admin/privilege-changes`, now the People page's
Privilege Changes tab (MB.115): the whole ledger, newest
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
  the privilege changes icon before each name on `/admin/users` opens with
  that user's address) and by privilege (`?privilege=admin|curator|create_workspace`,
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
half is `tests/app/admin/(people)/privilege-changes/page.test.tsx`, story 61's
browser flow is `tests/e2e/stories/08-email-and-admin.spec.ts`'s, and
`tests/e2e/admin/privilege-changes.spec.ts` reads the page, its filters and
the history icon link against the built server, with axe.

## Admin invitation service details

`src/modules/identity/services/admin-invitations.ts` is the site tier of `invitations`: an admin invites an address to become an admin or a curator. The names still say "admin invitation", since an admin is who sends one. Who may invite, the role ladder and the pause are this service's; the token's hash, the expiry and the pending predicate are the repository's named writes'. Accepting is `invitation-acceptance.ts`'s.

- Inviting stamps the admin, mails the token through `sender` after the commit (so a mailed link always names a row) and stores its hash alone. `note` is the optional reason, a blank one stored as none, which accepting records on the ledger row. A failed send is the transport's to log: the invitation stays pending and can be withdrawn and sent again.
- A second invitation to an address already invited replaces the pending site-tier one, stamped revoked by the admin in the same write, so a failed insert leaves it pending. A coven's invitation to the address is left alone.
- It is refused when the session's role is not `admin`, or when the primary admin has paused admin changes and the caller is another admin. The email is refused when malformed, unmailable, or a live account's that holds the role or above, which accepting would leave as it is.
- Withdrawing kills the link from now on, and it says so.
- The list is open to every admin, paused or not, since it is where an invitation is seen. `email` narrows by a trimmed fragment of the address and `expiringSoon` keeps only those lapsing within `EXPIRING_SOON_HOURS`, both in the finder's SQL.
