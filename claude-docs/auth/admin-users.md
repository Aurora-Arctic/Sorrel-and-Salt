## The user list

`/keepers/users` lists everyone with an account, so a keeper can act on a person
without being sent their id: approval, role change and impersonation start from
the modal each row's name opens. Each row shows the name, the email, the role
(`User`, `Curator` or `Admin`), whether the user may create a workspace (shown
for a `user` only, since every curator and keeper holds the flag), when the
account was made, the providers linked to it, and whether its address is
verified. The last two are what a keeper changing a role judges the person by.

**It confers no workspace access.** Reading who has an account is what the
admin role already implies. The page reads a user's memberships — each
coven's name and the user's role in it — for the modal, and nothing
beneath them: no ingredient, spell or member list. It offers no control over
any workspace. It is not one more
thing a keeper curates, either: CLAUDE.md's "and nothing else" governs what a keeper
may _change_.

- **One service, two transports.** `listUsers(session, filter, page)`,
  `countUsers(session, filter, start)` and `providersOf(session, userIds)`
  (`src/modules/identity/services/user-list.ts`) are a site admin's alone. Each asserts the role itself, by direct call, so a
  non-keeper is refused at the service and not merely kept off the page. The
  page calls them under `requireAdminSession()`, and GraphQL's `users` query
  and `User.providers` field end at the same two functions. The list is a read, so the query carries no Pothos scope of its own.
- **Under the `SiteAdmin` proof.** `findUserPage`, `findUserCount` and `findProvidersOfUsers`
  (`src/db/repository/users.ts`) take the proof first, so the repository
  cannot be asked for the list by a caller that has not checked the role
  ([`db/site-admin-proof.md`](../db/site-admin-proof.md), "The SiteAdmin
  proof"). `findProvidersOfUsers` returns each account's user and provider
  only, so the tokens on an `accounts` row never leave the repository.
- **Not Better Auth's `listUsers`.** The `admin` plugin ships one, but it
  would put a database read outside the repository and a browser-initiated
  read outside `/api/graphql`: rules 2 and 1 in one call.
- **Paged by the cursor helper** (CLAUDE.md rule 8): name then id, keyset, 25
  rows. The page reads it through `readNumberedPage`
  (`src/lib/numbered-page.ts`) with `countUsers`, so the pager says "Page 2 of
  3" as every admin list does; GraphQL's `users` connection pages with
  `resolvePage` and is not counted. A cursor the codec cannot read, or that
  names no row of this list, gets the first page rather than an error.
- **Five filters, all in SQL**, in a GET form, so a filtered page is an address.
  `?query=` matches a substring of the name or the email, case-insensitively,
  with `%` and `_` read literally (the repository's `containsText`, shared with
  the category and form lists); it is an `ilike` rather than a trigram match
  because a keeper looks a person up by part of an address, which similarity
  scores poorly. `?awaiting` narrows to `canCreateWorkspace = false`.
  `?role=admin|curator|user` narrows to that site role; any other value is no
  role. `?timed-out` and `?paused` narrow to the users a support time-out or a
  site access pause stands on: not lifted, not deleted, and `until` null or
  still ahead. Each is a semi-join (`EXISTS`) in `findUserPage` and
  `findUserCount` sharing `timeoutStands` (`support.ts`) and `pauseStands`
  (`user-access-pauses.ts`) with the column reads, so the filter and the marks
  cannot disagree. GraphQL's `users` takes them as `timedOut` and `paused`.
- **Soft-deleted users never appear.** `findUserPage` drops them, like every
  finder (rule 4); the service has no predicate to add, and no way to build
  one.
- **`User.email` keeps its one scope.** The `users` nodes are the ordinary `User`, so `email`, `role`, `canCreateWorkspace` and `emailVerified` resolve through `selfOrAdmin` as on `me` ([`graphql/schema.md`](../graphql/schema.md), "Auth scopes").
- **`User.providers` is a keeper's alone**, the user's own row included. It
  resolves through the `providersByUser` loader. A user's own providers come
  from Better Auth, on `/account`, whose table it is.
- **Impersonate sits on each non-keeper row** where impersonation is
  registered. The control is the page's, but the guard is Better
  Auth's endpoint, which refuses a non-keeper caller and a keeper target
  ([`impersonation.md`](impersonation.md)).
- **The bootstrap user is left out.** The seed's system user,
  `BOOTSTRAP_USER_ID`, named Seed System User, is a live `users` row in every
  database, production included, because it stamps the seeded rows. Nobody can
  sign in as it ([`db/seed-module.md`](../db/seed-module.md), "The seed module"), so nothing
  a keeper does to a person applies to it, and `findUserPage` drops it in SQL
  beside the soft-delete filter.

## The user modal

Pressing a user's name on the list opens a modal over it, so a keeper sees what a person already holds before approving, revoking, changing their role or impersonating them. "Private data" is a workspace's contents; which covens someone belongs to is not among them ([`auth.md`, "A site keeper sees which covens a user belongs to"](../design-decisions/auth.md#a-site-keeper-sees-which-covens-a-user-belongs-to)).

- **The address is `?user=<id>`.** The press opens the modal at once, over a
  skeleton, through `RouteModal`; the list keeps its filter and page
  beneath it, and Close drops `?user=`. A request that arrives with a live
  `?user=` renders the modal on the server.
- **The head** is the eyebrow "User", the name as the title and the email as the
  qualifier. The body is `UserDetail`
  ([`components/user-detail.md`](../components/user-detail.md)): every fact the
  list's row shows, with Change Role and Approve or Revoke beside the facts
  they change, asking inside the modal (the modal is the one place they are),
  then a Covens list, stewards first, then members, then observers, each by
  name. Coven names are text, not links: a keeper reaches no coven, and
  `/coven/[slug]` is a 404 to a non-member.
- **The reads come with the navigation**, from the server page, under
  `requireAdminSession()`: `usersForAdmin` for the user, `membershipsOf` for
  the covens, `providersOf`. No GraphQL query is added. `membershipsOf`
  (`src/modules/coven/services/memberships.ts`) answers a key that is the caller's own, or any key
  when the caller is a site keeper; it hands over
  a workspace's `id`, `name` and `slug` and nothing beneath. GraphQL's
  `User.memberships` therefore resolves for a keeper too, with no schema
  change.
- **A `?user=` that opens nothing shows the missing notice** over the list,
  with no dialog: one that is not an id, names no user, names a soft-deleted
  user or names the bootstrap user.
- **Impersonate sits in the modal** for a non-keeper user where impersonation
  is registered. It asks first, inside the modal, through `ConfirmQuestion`,
  and shares its wording and its send with the list's button
  (`src/components/UserList/impersonation.tsx`). The modal offers no other
  control.

## Approving workspace creation

A keeper approves someone who has no invitation from that person's user modal on
`/keepers/users`, so a person starting a coven of their own gets in without
knowing an existing user, and can revoke the approval from the same modal. It is
the second of the flag's routes: the first is accepting a workspace invitation
(M7.5), and being made a curator or a keeper sets it in its own write. Neither act
touches anything but the flag: it confers no workspace access on the admin,
creates no workspace, and a revoke leaves every workspace the user already
created, and their ownership of it
([`auth.md`, "Revoking workspace creation, and its ledger"](../design-decisions/auth.md#revoking-workspace-creation-and-its-ledger)).

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
  blank one stored as none, and the trigger on `users` writes a `create_workspace`
  `grant` or `revoke` row in `user_privilege_changes` beside it, stamped as
  the admin from the session, never the request. The service writes
  no ledger row itself. The row's own `updated_by` goes with its next update;
  the ledger's row does not.
- **A change that changes nothing is refused, not repeated.** Approving a user
  who may already create a workspace, or revoking one who cannot, is refused
  with a `Forbidden` naming them, and writes no ledger row: it would record a
  change that never happened.
- **A curator's or a keeper's flag cannot be revoked.** The
  `users_privileged_can_create_workspace` CHECK holds every curator and keeper
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
  approving keeps the account from lapsing, and still
  approves. Each takes the same optional Reason as Change Role
  ([`components/user-list.md`](../components/user-list.md)).

## Changing a site role

A keeper gives another user a site role, `user`, `curator` or `admin`, from
that person's row on `/keepers/users`, so a second keeper is no longer an `UPDATE`
in `psql`. A curator is between the two: it uses every curation screen a keeper
can and reaches no people page
([`admin-guard.md`](admin-guard.md), "The curator guard"). The rules, and the
approaches rejected, are
[`auth.md`, "Granting and revoking admin"](../design-decisions/auth.md#granting-and-revoking-admin)'s
"The primary keeper", "Granting" and "Revoking", and
[`auth.md`, "A third site role, `curator`"](../design-decisions/auth.md#a-third-site-role-curator); this is
the shape.

- **One service, two checks.** `setUserRole(session, userId, role, note?)`
  (`src/modules/identity/services/user-role.ts`) checks the site role itself,
  by direct call, and the `setUserRole` mutation in front of it carries the
  `admin` scope as the second check ([`graphql/schema.md`](../graphql/schema.md),
  "Auth scopes"). A curator is refused at both: changing roles is a people-page
  act. The page has no path of its own: the user modal's control sends the mutation.
- **One question, every role but the one held.** The user modal's Change Role button
  asks over the modal, naming the user and listing the roles they do not hold, each
  with a line on what it allows, and an optional reason. Nothing is preselected,
  and the confirm button reads Promote or Demote by the ladder `user` <
  `curator` < `admin`, a demotion styled as destructive
  ([`components/user-list.md`](../components/user-list.md)).
- **Each change is a ledger row, written by the database.** The role is an
  `updateById` on the user's row through `withAudit`, declared
  `{ via: 'admin', note }`, `note` being the confirmation's optional reason, a
  blank one stored as none. The trigger on `users` writes the rows in
  `user_privilege_changes` beside it, stamped as the admin from the session,
  never the request; the service writes none. `admin` and `curator`
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

- **Becoming a curator or a keeper sets `canCreateWorkspace` in the same
  write**, since the `users_privileged_can_create_workspace` CHECK
  (`role = 'user' or can_create_workspace`) holds every curator and every keeper to
  the flag, so a promotion of a user without it is two rows at one instant.
  **Becoming a user leaves the flag**, the grant having been a vouching too,
  and leaves memberships and the `created_by` of everything the person wrote:
  rows are stamped with a person, not a role.
- **Any live user may be changed, verified or not.** Confirming who someone is
  is the changing admin's job, from the row's sign-in methods and verified
  mark; the dialog warns when the address is unverified, **on a promotion
  only**, since a promotion, like an approval, keeps the account from the
  provisional-account job. The user must already have an account; inviting by
  email is below.
- **A change that changes nothing is refused**, with a `Forbidden` naming the
  user ("is already a curator"): the same role as the one held. No column
  changes, so the trigger records nothing.
- **The primary keeper cannot be moved off admin**, by anyone, itself included.
  It is the live keeper whose email matches `ADMIN_BOOTSTRAP_EMAIL` when the
  check runs, read from the variable at each check by `isPrimaryAdmin` (in
  `user-role.ts`, over `src/lib/primary-admin.ts`), compared
  case-insensitively. The refusal is a `Forbidden` in plain words that name no
  variable, the words its row shows: "You can't revoke the primary keeper. The
  site's configuration sets who that is." How to change it is below, and in
  [`admin-bootstrap.md`](admin-bootstrap.md).
- **The count is the fallback.** Leaving `admin`, for `curator` or `user`, locks
  every live keeper row `for update`, in id order, through the writer's
  `lockLiveAdmins`, then refuses with a `Forbidden` if the target is the only
  one. Two keepers demoting each other at once queue on the lock; the second
  reads the first's committed change, finds itself counting one, and is
  refused, so exactly one keeper is left. While the primary keeper exists the
  count is never what refuses; it guards the gap a change of the variable opens,
  before the new address's first qualifying sign-in, or for good if it never
  makes one.
- **Paused with the rest.** `setUserRole` stays behind the primary keeper's
  pause (below), for a curator change as for a keeper one.
- **A change takes effect on the next request.** A demoted admin's sessions
  stay valid, since they are still a user, and no new session is issued; their
  next request reads the new role off the users row, so `/admin`'s people pages
  and every keeper mutation close to them (and, for a demotion to `user`, the
  curation pages too). That holds because Better Auth's `session.cookieCache`
  is off, which `tests/lib/auth.test.ts` pins in its "session lifetimes" block:
  a cache would answer from the cookie until its TTL ran out.
- **A curator can be impersonated like any non-keeper**, since Better Auth's
  `adminRoles` stays `['admin']`; being a curator grants no impersonation.
- **A soft-deleted user is `NotFound`**, as an unknown id is.

**Changing the primary keeper.** Set `ADMIN_BOOTSTRAP_EMAIL` to the new address
on the Vercel project and redeploy ([`config.md`](config.md)); the new address
is promoted at its next Google or Discord sign-in, or when it verifies the
address by mail ([`admin-bootstrap.md`](admin-bootstrap.md)). The previous
primary keeper keeps `role: 'admin'` and is no longer protected. Until the new
address is promoted nobody is protected, and the count above keeps a demotion
from leaving no keeper.

**Any future user-deletion path must refuse the primary keeper.** v1 deletes no
user but the provisional-account sweep, which only ever reaches an unverified
account holding no privilege. A path added later that soft-deletes or removes
a `users` row must call `isPrimaryAdmin` and refuse, as the role change does.

## Pausing keeper changes

The primary keeper can switch role changes off for every other
admin, so a keeper account gone rogue can neither make more keepers or curators nor remove
the good ones while it is dealt with, and back on. The argument is
[`auth.md`, "Granting and revoking admin"](../design-decisions/auth.md#granting-and-revoking-admin)'s
"Granting"; the ledger the switch is kept in is MB.62's
([`auth.md`, "The admin-role-change pause is a ledger, not a settings row"](../design-decisions/auth.md#the-admin-role-change-pause-is-a-ledger-not-a-settings-row)).

- **Only the primary keeper may pause or resume.**
  `pauseAdminRoleChanges(session)` and `resumeAdminRoleChanges(session)`
  (`src/modules/identity/services/admin-role-pause.ts`) assert the site role,
  then read the caller's own row and refuse anyone `isPrimaryAdmin` does not
  name, with "Only the primary keeper may pause or resume keeper changes". The
  two mutations carry the `admin` scope as the second check, and take no
  argument, so a request names no actor.
- **Each pause is a row.** Pausing opens one through the writer's
  `pauseAdminRoleChanges`, stamped `created_by` from the session; resuming
  ends it through `resumeAdminRoleChanges`, stamping `ended_at` and
  `ended_by`. Both go through `withAudit`. A second pause or resume writes
  nothing and answers the state, `true` paused or `false` not, so a double
  click is not an error. Nothing in v1 lists the rows.
- **While paused, `setUserRole` refuses every other keeper.** It reads the
  open pause first, and refuses a change to any role, a curator's included, from any keeper but the
  primary one with "The primary keeper has paused keeper changes. Ask them to
  resume changes.", naming a role and no person. Nothing
  changes, so the trigger on `users` records nothing. Revokes are paused as
  well as grants, since removing the good keepers is the same attack from the
  other side.
- **Coven creation pauses too**:
  `grantWorkspaceCreation` and `revokeWorkspaceCreation` open with the same
  `assertAdminChangesOpen` guard, exported from `admin-role-pause.ts` — the
  site-role check, then `assertChangesOpen` — so another
  admin's approve or revoke is refused with the same `Forbidden` and writes no
  ledger row while a pause is open.
- **The primary keeper is exempt**, so it can clean up without resuming first:
  its grants and revokes go through and are recorded as usual. The exemption
  costs nothing, since the primary keeper is the one account a rogue admin
  cannot become: the variable names it, and it cannot be revoked.
- **On `/keepers/users`**, the People page's Users tab, every keeper sees the
  control as the tab's action, beside the page's heading, and a warning saying changes are paused while they are. The
  control is usable by the primary keeper alone, in view but `aria-disabled`
  for any other, with the reason in a tip; while paused, such a keeper's
  Change Role, and coven creation's Approve and Revoke, are locked the
  same way
  ([`components/user-list.md`](../components/user-list.md)). The page reads
  the state through `adminRoleChangePauseState(session)`.

## Inviting a keeper

A keeper can make someone a keeper or a curator, the role picked in the invite form, before they have signed in, by inviting their address: option B of [`auth.md`, "Granting and revoking admin"](../design-decisions/auth.md#granting-and-revoking-admin), "The approaches", on the site tier of `invitations` ([`db/invitations.md`](../db/invitations.md)). The link is mailed to the address and accepted only by an account that has proved it holds it, so no one is handed a bearer token for the site's highest privilege. The names in code still say "admin invitation" for both roles: a keeper is who sends one.

- **A repeat invitation replaces the pending one**. Inviting an address
  that already has a pending site-tier invitation, keeper or curator, stamps that
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
  25 to a page; no GraphQL query lists invitations. Its filter is
  `{ email, expiringSoon }`: a fragment of the address, trimmed, and only
  the invitations lapsing within `EXPIRING_SOON_HOURS`, each narrowed in the
  repository's SQL ([`db/invitations.md`](../db/invitations.md)).
- **The token is the mail's alone.** The invitation is inserted through the
  repository's `insertInvitation(admin, …)` holding the hash of a token
  nobody is told, and after the commit the service hands the sender the row's
  id. The sender, `invitationSender(request)` in `src/lib/invitation-mail.ts`,
  is built per request by the GraphQL context as the email page's is, and
  starts the secret-link job with the id and the origin, because the link's
  origin is Better Auth's to resolve against its allowed hosts: a forged
  `Host` cannot have a live token mailed on a link to another site. The job's
  step mints the token (`crypto.randomBytes(32)`, base64url) through
  `rotateInvitationToken`, stores its hash, reads the inviting admin's name
  for the mail to open with, and mails `src/emails/admin-invitation.ts`
  ([`email.md`](../email.md)). Each retry mints again, so only the newest
  mailed link works
  ([auth.md, "The invitation mail mints its token in the job step"](../design-decisions/auth.md#the-invitation-mail-mints-its-token-in-the-job-step)).
  The row the mutation answers carries neither the token nor its hash, and
  `Invitation` has no field that could. A mail that fails every attempt is
  logged by invitation id, and the invitation stays pending, to be withdrawn
  and sent again.
- **The role is the invitation's.** `siteRole` is `curator` or `admin`,
  stored on the row (`invitations.site_role`), named in the mail's subject
  and body, and on the Accept page; GraphQL takes it as the
  `InvitableSiteRole` enum, which has no `user`.
- **What is refused at creation.** An address the email page would refuse,
  as a `ValidationError` on `email`, and the address of an account that
  already holds the invited role or a higher one, which would have nothing to
  accept: a curator invited as a curator, a keeper as either. The ladder is
  `outranks` in `src/lib/site-roles.ts`, user below curator below admin, so
  a curator may be invited to become a keeper. A second invitation to the same address is
  not refused: either link works, and the other then says it has been
  accepted, or the admin withdraws it.
- **Paused with the rest.** While keeper changes are paused, inviting
  and withdrawing are refused for every keeper but the primary one, by the
  shared `assertAdminChangesOpen` and in its words, naming nobody. The list is
  open to every keeper, paused or not, since it is where an invitation is seen.
  Withdrawing kills the link from now on, and it says so.
- **One accept service, for both tiers.** `acceptInvitation(session, token)`
  (`src/modules/identity/services/invitation-acceptance.ts`) serves both;
  `acceptInvitationById` is the workspace tier alone, running the same checks
  over the row the session's verified address holds rather than the one a token
  names. It checks, in this order:
  1. The token names a live invitation, or the link is invalid (`NotFound`).
     The token is hashed in the repository, so a hash read off a dumped row
     names nothing.
  2. The link is not dead: **accepted, then declined, then revoked, then
     expired**, so a link in two states always reports the same one reason, an
     act before the clock. Declined is the invitee's own no, from the
     account page, on the workspace tier alone; it outranks revoked so that a
     declined link keeps saying so after a steward removes it from their list.
     Each is a `Forbidden` in words of its own, and none names a
     workspace.
  3. The tier: the site tier's branch, below, or the workspace's, which
     seats the person at the invited role: a removed member's row is revived
     (`reviveMembership`, `joinedAt` restarted), a live member's is left
     alone and the invitation only stamped, and otherwise a row is inserted.
     It sets `canCreateWorkspace` declared `via: 'invitation'`, which
     re-grants it to a person a keeper revoked (M5.8's recorded default; no
     marker exists to consult). The standing carries the coven's name and slug, so the Accept page names the
     coven to the account that matches and is verified, and to no one else. An
     invitation into a deleted coven is
     `closed` at the standing, a `Forbidden` in words of its own
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
  5. Keeper changes are not paused, or the primary keeper sent the invitation:
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
  a keeper invitation becomes an admin: a `curator` revoke and an `admin`
  grant at one instant, via the invitation. A revoke or a second accept that commits
  between the checks and the stamp leaves nothing to stamp, and the refusal
  is the link's state read again.
- **`/invite/[token]`** is public in `src/proxy.ts`. Signed out, it says an
  invitation is waiting and offers Sign In, which returns to the link; it
  reads nothing of the invitation until a session holds it. Signed in, it
  asks `invitationStanding(session, token)`, the same checks as the accept,
  and shows the refusal, with a link to the email page for an unverified
  match, or Accept Invitation, naming the role it grants, whose mutation
  lands a new curator or keeper on `/admin`. An
  unverified account reaches the page, since `requireSession()`'s redirect
  would lose the reason; the accept refuses it all the same.
- **On `/keepers/invitations`**, the People page's Invitations tab, every keeper sees Invite
  Admin, whose form asks for the address, the role (Curator chosen to begin
  with, so granting the People page is a choice) and an optional reason, and
  the pending invitations 25 to a page, each with
  its address, its role, its reason, when it expires and Revoke, and the pager
  beneath them
  ([`components/admin-invitations.md`](../components/admin-invitations.md)).
  While changes are paused, both controls are `aria-disabled` for any keeper
  but the primary one, with the pause as the reason.

**Not done here.** Revoking a keeper does not withdraw the invitations they
sent: the pending list is where a keeper sees them and acts. An accepted
invitation is already in the privilege ledger as its `invitation` row, so no
list of past invitations is kept.

## The privilege ledger

Every change to who is a keeper or a curator and who may create a coven is a row of `user_privilege_changes`, which the database writes and nothing in the application inserts into (DESIGN.md §5). `/keepers/privilege-changes`, the People page's Privilege Changes tab, shows the whole ledger, newest first, for the keeper who suspects misuse.

- **One service, two transports.** `listPrivilegeChanges`
  (`src/modules/identity/services/privilege-changes.ts`) is a site admin's
  alone, asserted by direct call. GraphQL's `privilegeChanges` query ends at
  it and carries the `admin` scope as the second check, so a non-keeper is
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
  whose service, `usersForAdmin(session, userIds)`, answers a site keeper each
  live user, null where none is live, and refuses every slot to anyone else.
  It is the keeper's whole row, not the display-name `usersById`.
- **One page, not one per privilege.** `/keepers/privilege-changes` is one
  ledger, filtered by part of the subject's name or email (`?query=`, which
  the privilege changes icon before each name on `/keepers/users` opens with
  that user's address) and by privilege (`?privilege=admin|curator|create_workspace`,
  a dropdown). The page takes no `?user=`: the read's `userId` is GraphQL's.
  It is not merged with the pause or the invitations, which stay where they
  are acted on; an accepted invitation is already in the ledger as its
  `invitation` row. A server component under `requireAdminSession()`, it
  calls the service through `cache()`, numbered by `resolveNumberedPage`
  with `countPrivilegeChanges` as every admin list is, and reads the
  users a page names in one `usersForAdmin` call. A hand-edited privilege is
  no filter, and a cursor from another list reads the first page
  ([`components/privilege-ledger.md`](../components/privilege-ledger.md)).
- **A row links its people to their `/keepers/users` rows**, the list filtered
  to their address, except the seed's bootstrap user, which the list leaves
  out (`listedOnUserList`).
- **No index beyond the key**: the ledger holds a few rows a user, so the planner seq-scans it whole. An index on `(user_id, created_at desc)` would serve only the subject's filter, never the order, which is on the negated expression.
