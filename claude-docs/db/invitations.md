## Invitations (M7.1)

`src/modules/coven/schema/invitations.ts` holds every invitation, in two
tiers as `ingredients` is: a row naming a workspace and a role invites into
that coven, and a row with neither is a **site-tier** invitation, which
grants admin, as a null workspace is a compendium entry.
`0057_two-tier-invitations.sql` is the migration. It replaced M7.1's
`workspace_invitations` (`0012_cultured_ben_grimm.sql`) and MB.69's
`admin_invitations` (`0046_admin-invitations.sql`), copying both; MB.202
undeclared the two and MB.203 dropped them (`0059`). Why one table, why it is
`coven`'s, and what was rejected:
[`mb.201-two-tier-invitations.md`](../design-decisions/mb.201-two-tier-invitations.md).

- **`invitations`** — `id`, `workspaceId` (nullable), `email`, `role`
  (nullable), `tokenHash`, `expiresAt`, `acceptedAt`, `acceptedBy`,
  `declinedAt` (nullable), `revokedAt`, `note` (nullable), + the full six-column
  audit spread.
  `email` is text and **not** a foreign key: an invitee may have no account
  yet, which is the point of inviting them. `note` says why the person is
  being invited, optional as a privilege change's `note` is in
  `user_privilege_changes`; either tier may carry one, and the workspace tier's UI need
  not offer it.
- **Cards (M15.17).** A third shape of the same table: `kind` is `address` (the
  default) or `card`, and `batch_id` (nullable uuid, no table) groups the cards
  of one mint. `email` is nullable. A card is a printed code bound to no address,
  coven or site role. `invitations_kind_known` admits the two kinds;
  `invitations_kind_shape` requires an `address` row's `email` and a `card`'s
  `email`, `workspace_id`, `role` and `site_role` to be null. A card's token is
  returned once, at minting, to the admin who mints it; only its hash is stored.
  Migration `0095_invitation-cards.sql`. Why a shape of this table rather than a
  new one:
  [`m15.17-invitation-cards.md`](../design-decisions/m15.17-invitation-cards.md).
- **`invitations_tier`**, `kind = 'card' or (workspace_id is null) = (role is null)`:
  an address row is in one tier, a workspace and the role it is invited to, or
  neither; a card is in neither.
- **`invitations_declined_coven`** (M10.34),
  `declined_at is null or workspace_id is not null`: only a coven invitation is
  declined. An admin invitation is never listed to its invitee, so it is
  accepted by its link or not at all, and the database says so rather than
  leaving it to the service.
- **`invitations_answered_once`** (M10.34),
  `num_nonnulls(accepted_at, declined_at) <= 1`: an invitation is accepted or
  declined, never both. The writers already match a pending row only, so two
  racing answers cannot both land; the CHECK is what holds if a later path
  forgets. `revoked_at` is outside it on purpose: the owner's Remove stamps a
  declined row revoked, so a row may carry a decline and a revoke together.
- **Only the hash is stored.** There is no plaintext column and there must
  never be one: story 4's requirement is that a leaked database row cannot be
  redeemed. The token is generated with `crypto.randomBytes`, mailed in the
  link and in no response, and every later read matches a hash against
  `token_hash`. The schema test pins the table's exact column set, so a
  later `invite_token` reddens it.
- **`invitations_role_invitable`**,
  `role is null or role in ('viewer', 'member')`, is the check DESIGN.md §5
  requires. Written as the allowed set rather than as `role <> 'owner'`
  deliberately: `workspace_role` has three values today, and a fourth added
  later would be silently _invitable_ under the negative form and silently
  refused under this one. Refusing is the safe default for the column that
  decides what a stranger holding a link may do. In the database rather than
  the service because a service check can be forgotten by the next code path
  that writes the table, and a constraint cannot.
- **Expiry defaults to seven days** (`now() + interval '7 days'`), and the
  column is `NOT NULL`. §5 names no figure, so M7.1 chose one and recorded
  why at the constant: long enough that a link mailed on a Friday survives
  the weekend, short enough that one found in an old inbox is dead. It is a
  default, not a policy, and what the `NOT NULL` buys is that omitting one
  cannot produce an invitation valid forever.
- **`invitations_token_hash_unique`** is the acceptance path's lookup, across
  both tiers, and unique as well as indexed: one hash must resolve to at most
  one invitation, or redeeming it is a coin toss between two rows that may
  grant different things. Partial on `deleted_at IS NULL` per the
  [partial-index convention](soft-delete.md); the usual argument for that
  predicate is weak here, since nothing re-proposes a random hash, but the
  rule is absolute and the predicate is free.
- **Five lifecycle columns, not one `status` enum.** `expiresAt` is a clock
  comparison, `revokedAt` is an owner's or an admin's act,
  `acceptedAt`/`acceptedBy` are the redeemer's, and `declinedAt` (M10.34) is
  the invitee's no. Story 7 wants the dead states told
  apart with a deterministic answer when two apply at once, and collapsing
  them is exactly the shape MB.30 rejected in Better Auth's plugin, which
  answers every dead link with one `INVITATION_NOT_FOUND`
  ([`mb.30-organization-plugin.md`](../design-decisions/mb.30-organization-plugin.md)).
  M7.7 owns the classification; the table owns keeping the evidence apart.
  There is no `revokedBy`: revoking is the last write a row takes, so
  `updated_by` is who revoked. There is no `declinedBy` either: who declined
  is the address the invitation was sent to, which the decline write matched
  against the session's verified address, so a column would only repeat
  `email`. No constraint pairs `acceptedAt` with `acceptedBy`, since one named
  write sets both.

### Admin invitations (MB.69), now the site tier

MB.69 built story 62's table, `admin_invitations`: the workspace table's
shape without the workspace or the role, since accepting grants exactly one
thing, and with the note. Its rows are the site tier now, a null workspace
and role, copied by MB.201's migration with their ids, stamps and notes, and
its named writes and token read became the ones below, by tier. M2.9's two
objections to reusing the workspace table, that it was scoped and that its
check refused anything but a workspace role, are what the nullable pair
answers.

Since M11.20 a site-tier row also names the site role it grants,
`site_role` (the `user_role` enum), `curator` or `admin`: migration 0075
added it, set every site-tier row there before it to `admin`, and added two
CHECKs, `invitations_site_role_tier`, `(workspace_id is null) = (site_role
is not null)`, and `invitations_site_role_invitable`, which admits only
`curator` and `admin`. The second compares the column as text, since
Postgres refuses a value an enum gained in the same transaction (55P04), and
drizzle-kit runs every pending migration in one.

### Written and read by tier (MB.202)

The row is what authorises a membership or a grant, so a generic insert would
let any service mint its own user an invitation and accept it. The table is
marked `namedWrites` in its schema file, which takes it off every generic
writer method ([`write-path.md`](write-path.md#table-marks-mb198), "Table
marks"; MB.198). In their place, in the repository's `invitations.ts`, which
`writerFor` spreads into the writer:

- **`revokePendingInvitationsTo(proof, email)`** stamps revoked every pending
  invitation to the address in the proof's tier: its coven for a `Membership`,
  the site tier for a `SiteAdmin`, so the two tiers never replace each other.
  Both create services call it before `insertInvitation`, in the same write
  (MB.269).
- **`insertInvitation(membership, values)`** writes a workspace invitation
  into the proof's workspace with the role `values` names, which the type
  requires and confines to `viewer` or `member`.
  **`insertInvitation(admin, values)`**, under the `SiteAdmin` proof, writes
  the null pair and the site role `values` names, which the type requires
  and confines to `curator` or `admin` (M11.20). Either takes the email, the token, the note and an optional
  expiry, and writes the token's hash and nothing else, so a row starts
  pending, and in the proof's tier, even if a cast smuggled a stamp, a
  workspace or a role in.
- **`acceptInvitation(token)`** stamps `accepted_at` now and `accepted_by`
  from the session, on either tier, under no proof, since the invitee holds
  neither a membership nor the site role yet. It matches only while the
  session's user holds the invited address, verified, on a live row,
  compared case-insensitively. The accept service checks the address first
  so it can say why, pointing an unverified match at `/account/email`; the
  statement is what holds if a later path forgets. What accepting grants,
  and the pause on admin grants, are the service's. When a coven's accept
  inserts or revives a membership, it also writes the invitation's
  `created_by` to `workspace_members.invited_by` (M10.26). An accept by someone
  already seated writes no membership, so the inviter stays as it was.
- **`acceptReceivedInvitation(id)`** (M10.32) stamps the same two columns on
  a workspace-tier row by id, under no proof, matching only while the
  session's user holds the invited address, verified, and the coven is live:
  the token write with the address in the token's place, for the account
  page's list ("Accepting from the account page", below).
- **`declineReceivedInvitation(id)`** (M10.34) stamps `declined_at` now on a
  workspace-tier row by id, under no proof, with the same match as the accept
  by id: the session's user holds the invited address, verified, the coven is
  live and the row is pending. Nothing else is written: no `declined_by`, and
  no membership or grant ("Declining from the account page", below).
- **`revokeInvitation(membership, id)`** stamps `revoked_at` now on an open row
  in the proof's workspace, and **`revokeInvitation(admin, id)`** on a
  site-tier row. Open (M10.34) is pending, or declined and not yet removed:
  Revoke is this write on a pending row, and Remove is the same write on a
  declined one, so it leaves the owner's list and stays in the table for the
  audit. By id rather than token: an owner or an admin revokes from
  a list, and neither holds the token. Each reaches only its own tier: a
  workspace proof cannot revoke a site invitation by id, nor the site proof
  a workspace's, nor one workspace's proof another's, each asserted by
  direct id against a row the right proof then revokes.

The accept and decline stamps match a **pending** row only: live, none of
accepted, declined and revoked, and unexpired. So no invitation is answered
twice, a declined, revoked or expired link cannot be redeemed even by a service
that forgot to check, and no stamp overwrites another; a call that matches
nothing returns no row, as MB.62's resume does. The revoke stamp matches an
**open** row instead: not accepted, not revoked, and either declined or
unexpired. A declined invitation is an answer for the owner to read, not a link
that lapses, so it stays open past its expiry until the owner removes it; a
pending one that has lapsed is not open, as before.

**The token goes in, never the hash.** `hashToken` in the repository's
`tokens.ts`, hex SHA-256, is the only place a hash is made, so a caller
never holds one: a hash read out of a dumped row and passed where a token
goes is hashed again and matches nothing, and the accept by token cannot be
reached with an invitation's id, which the lists show. The accept by id
(M10.32) matches only while the session's user holds the invited address,
verified, so an id read off a list admits no one else. SHA-256 unsalted rather than
a password hash, because a token is `crypto.randomBytes` output with no
dictionary to resist.

A CSPRNG is a cryptographically secure pseudorandom number generator:
a source of random numbers that cannot be predicted from the numbers it has
already produced. `crypto.randomBytes()` is one, drawing on the operating
system's entropy pool (its store of unpredictable events). `Math.random()` is
fast but predictable: anyone who collects a few outputs can work out its
internal state and compute the next ones, so a token made with it could be
guessed.

**One generator makes every token** (M7.2): `newToken()` in
`src/lib/invitation-token.ts`, 32 bytes of `crypto.randomBytes()` as
base64url, 256 bits where 128 would do. Both tiers' services call it: the
admin invitation (MB.70) and the workspace invitation (M7.3). It lives in
`src/lib/` because a service may not import the repository's internals, so
it cannot sit beside `hashToken`, and because two modules mint a token, so
neither module owns it. The service hands the token to `insertInvitation`
and then to the mail sender, and to nothing else: no response, no query, and
no later read can recover it.

The finders:

- **`findInvitationByToken(token)`** returns the live row the token names,
  on either tier, under no proof for the accept's reason: holding the token
  is what admits. It returns expired, revoked, accepted and declined rows alike: the
  accept service rejects each with its own message (M7.7), and can only tell
  them apart if it sees them.
- **`findPendingWorkspaceInvitationPage(membership, page)`**, the members
  page's pending list (M7.6), which since M10.34 also holds the declined
  invitations not yet removed, and **`findPendingSiteInvitationPage(admin, filter, page)`**,
  `/admin/invitations`' (MB.70): each tier's pending rows under its own proof.
  The workspace's pages newest first as the site tier's does, by the same
  order, through `findPageInScope` under the proof's `workspace_id`, and
  **`findPendingWorkspaceInvitationCount(membership, start)`** counts it for
  the "Page X of Y"; neither takes a filter. **`findInvitationInWorkspace(membership, id)`**
  reads one invitation of the proof's workspace in any state, pending,
  accepted, declined, revoked or expired, and `undefined` for a missing, deleted or
  other workspace's id: `revokeInvitation` matches open rows only, so
  this is how the coven service tells an accepted invitation (point the
  owner at member removal) from a missing one. The site tier's is a cursor page (a page of results that resumes
  from the last row rather than counting rows to skip; CLAUDE.md rule 8),
  newest first: keyed on `created_at` negated as `numeric`, as the privilege
  ledger is, so the microseconds survive the cursor, and by id among rows of
  one instant. It reads through `findPageInScope` under `onSiteTier()`,
  since the exported pagers' types admit no two-tier table and
  `findPageInTiers` would read the site tier as the compendium (MB.115).
  **`findPendingSiteInvitationCount(admin, filter, start)`** counts the same
  rows, and those before a page's first, for the tab's "Page X of Y". No
  index serves the order: the pending set is small, and an index on the
  negated expression would be its own task. Both take a
  `SiteInvitationFilter` (MB.115), each part ANDed in SQL:
  `email`, a fragment of the address matched case-insensitively by the
  shared `containsText`, its `%` and `_` read literally; and
  `expiresWithinHours`, which keeps a row only while its `expires_at` falls
  within that many hours of the database's `now()`, the same clock the
  pending test reads, so the app's clock never decides an expiry. For
  example, `{ email: 'FERN', expiresWithinHours: 24 }` finds a pending
  invitation to `fern.moss@…` that lapses in 23 hours, and not one that
  lapses in 25. No list of past
  invitations is planned: each pending list is where an invitation is acted
  on, and the privilege ledger holds every acceptance that granted
  something.

The site tier is read through `onSiteTier()`, `workspace_id IS NULL` spelled
for this table alone rather than through `inCompendium`: a site-tier
invitation is no compendium row. The tier-seam guard still lists it, since
it reads the spelling ([`modules.md`](../modules.md), "The tier seam").

### Policy, in two services

Who may invite, the pause, what accepting grants and where it lands stay in
two services, while the mechanics above exist once: `coven`'s
`createInvitation` / `revokeWorkspaceInvitation`, owner only, role chosen (M7.2,
M7.3, M7.6), and `identity`'s `createAdminInvitation` /
`revokeAdminInvitation`, admin only and refused while admin changes are
paused (MB.70). One accept service in `identity`, `acceptInvitation(session,
token)`, adds the membership and sets `canCreateWorkspace` on a workspace
row, and grants admin on a site row; one route, `/invite/[token]`, lands in
the workspace or on `/admin` by tier (M7.5, MB.70). The accept reads
MB.62's open pause under the site-tier invitation itself, since the invitee
holds no `SiteAdmin` proof: `findOpenAdminRoleChangePause` takes either. How
MB.70 built the site tier's half is
[`auth/admin-users.md`](../auth/admin-users.md), "Inviting an admin".

### Inviting into a coven (M7.3)

`createInvitation(session, workspaceId, { email, role }, sender)`, exported
from `@/modules/coven`, is the workspace tier's half of the policy above. It
runs in this order, and the order is the point:

1. **`assertMembership(session, workspaceId, { member: ['invite'] })`**, which
   only owners hold (`access-control.ts`). A member, a viewer, an owner of
   another coven and a stranger all get the same `Forbidden`, before the role
   or the address is looked at, so nothing about the input leaks to a caller
   who may not invite.
2. **The role** must be `viewer` or `member`. The GraphQL enum `InvitableRole`
   has no `owner`, so a browser cannot ask for one, but the service refuses it
   too, as a `ValidationError` on `role` that says ownership is granted
   afterwards: a direct call is a second path, and the database's
   `invitations_role_invitable` check is a third, which would only say "check
   violated".
3. **The address** is trimmed and lower-cased with `normaliseEmail` and checked
   with `validateEmailAddress`, both from `identity`, exactly as
   `createAdminInvitation` does.
4. **A live member's address is refused**, in words, by the repository's
   `findMemberByEmail(membership, email)`: one SQL `EXISTS` over `users`,
   case-insensitive, live rows only, so a member who was removed can be invited
   back and the roll is never fetched to be searched.
5. **The token** comes from `newToken()`, goes to `insertInvitation(membership,
{ email, role, token })` inside `withAudit`, and only then to
   `sender.workspaceInvitation(email, token, { name, role, inviterName })`: after
   the commit, so a mailed link always names a row. `inviterName` is the
   inviting owner's name, read from their `users` row, since the session holds
   the id alone.

**A repeat invitation replaces the pending one** (MB.269). Inviting an address
that already has a pending invitation to the same coven first stamps that one
revoked, as the inviter, in the same `withAudit` write that inserts the new one,
through the repository's `revokePendingInvitationsTo(membership, email)`. So one
invitation per address and coven is pending, its link is the newest and its role
the one that applies, and the old link is refused as revoked. The address is
matched in any case. Only a pending row in this coven is touched: another
coven's, the site tier's, and an accepted, declined or lapsed one stay as they
are. A new invitation that fails its checks revokes nothing. **A failed send leaves the
invitation pending**: `send` in `src/lib/mail.ts` never throws and logs with
`console.error`, so the mutation succeeds and the owner can revoke and
re-invite. The test for it runs the real `send` over a `fetch` that answers
500, not a double that pretends to have failed.

**The mail** is `src/emails/coven-invitation.tsx`, rendered twice by
`renderParts` as HTML and plain text. The plain-text part carries the
`/invite/<token>` link, because story 4's browser flow reads the token from
the mailed message. `InvitationSender` (`identity/types.ts`) gained
`workspaceInvitation(to, token, { name, role, inviterName })` beside
`siteInvitation(to, token, { name })`; the
real one is built in `src/lib/invitation-mail.ts` and shares the admin one's
link, whose origin Better Auth resolves from the request.

**In GraphQL**, `coven` adds what `identity` cannot name to `Invitation`: an
`InvitableRole` enum (`viewer`, `member`), `Invitation.role` and
`Invitation.workspace`, and the `createInvitation(workspaceId, email, role)`
mutation. `workspace` reads through the `membershipsByUser` loader, so it
answers a coven the caller belongs to and nothing else, and a site-tier
invitation answers none for both. No field carries the token, its hash or a
link; the existing field-list test in
`tests/modules/identity/graphql/admin-invitations.test.ts` pins that.

Story 4's flow walks sending an invitation; accepting it is story 6's, whose workspace branch M7.5 added.

### Listing and revoking in a coven (M7.6)

Three more services in `@/modules/coven`, each opening with
`assertMembership(session, workspaceId, { member: ['invite'] })`, which only
owners hold. Never `member: read`: members hold that since M6.13, and the
pending rows carry the addresses of people who have not joined.

- **`listPendingWorkspaceInvitations(session, workspaceId, page)`** and
  **`countPendingWorkspaceInvitations(session, workspaceId, start)`** read
  `findPendingWorkspaceInvitationPage` / `findPendingWorkspaceInvitationCount`:
  newest first, the site tier's pager under the `Membership` proof. Since
  M10.34 the rows are the coven's open invitations, pending or declined (the
  names kept, so no caller changes). The members
  page calls them directly (a server component); there is no GraphQL read.
- **`revokeWorkspaceInvitation(session, workspaceId, id)`** looks the row up
  with `findInvitationInWorkspace` and then stamps it through
  `revokeInvitation(membership, id)`, inside `withAudit`. A missing id, a
  malformed one, another coven's, and a revoked or lapsed invitation are
  `NotFound`, as the admin tier's is. A **declined** invitation is revoked like
  a pending one, even past its expiry (M10.34): that is the owner's Remove, and
  the service needed no change, since the writer decides what is open. An **accepted** invitation is a
  `ValidationError` on `id` whose message points to the members list: the
  person is a member now, and removing them is a membership action. The
  by-id lookup exists only to tell those two apart.
- **A pending invitation outlives its inviter.** Demoting or removing the
  member who sent it changes nothing about the row, as for the admin tier;
  an owner still lists and revokes it.

In GraphQL, `revokeInvitation(workspaceId: ID!, id: ID!): Invitation!` goes
through the service.

### Accepting from the account page (M10.32)

An invitation reached its person one way, the mailed link, so a mail lost to
a spam filter left them on `/coven` reading that someone must invite them,
when someone had. Since M10.32 the account page's Invitations section lists the
pending coven invitations addressed to the signed-in account's verified email,
each with an Accept, and the accept runs by id as well as by token. The `/coven`
landing and the account menu say how many wait and link to that section; the
first build listed them on the landing, and the owner moved them on 2026-10-13. The site tier is
not listed and cannot be accepted by id: an admin invitation's link is a
bearer token for the site's highest privilege, and the worst case of a coven
invitation is one coven's seat
([`m10.32-accept-from-the-landing.md`](../design-decisions/m10.32-accept-from-the-landing.md)).

**The reads.** Five finders in the repository's `invitations.ts` take no
proof, for the token read's reason, with the session row in the token's
place: each ANDs `heldVerifiedBySession(session)`, the predicate the accept
write already holds, and the workspace tier.
`findReceivedInvitationPage(session, page)` and
`findReceivedInvitationCount(session, start)` page the pending ones into a
live coven, newest first, as the other two pending lists are ordered.
`findReceivedInvitation(session, id)` answers one row in any state, so the
service can say accepted, declined, revoked or expired, and nothing for an id the
address does not hold. `findReceivedInvitationCovens(session, ids)` and
`findReceivedInvitationInviters(session, ids)` answer the name and slug of
each coven and the name of each inviter, for the page's ids alone and
nothing else of either row, so a page costs three statements whatever its
size ([`membership-proof.md`](membership-proof.md), "The reads that take no
proof").

**The write.** `acceptReceivedInvitation(id)` is the token write with the
address in the token's place: it stamps `accepted_at` and `accepted_by` on a
pending workspace-tier row by id, only while the session's user holds the
invited address, verified, and the coven is live. The token write is
unchanged.

**The service.** `acceptInvitationById(session, id)` in `identity`'s
`invitation-acceptance.ts` shares every check and every effect of
`acceptInvitation(session, token)`, the row read by id instead of by token:
the seat or the revived seat, `invited_by`, the `canCreateWorkspace` grant
declared `via: 'invitation'`, and the recheck after a race. An id the
address does not hold, an unverified match, a site-tier id, a deleted row or
coven and a malformed id are `NotFound` alike, so an id read off an owner's
list tells a stranger nothing; an accepted, declined, revoked or expired row is
`Forbidden` in the link's own words. `listReceivedInvitations(session, page)`
and `countReceivedInvitations(session, start)`, in `received-invitations.ts`,
shape the rows for the account page, which calls them directly as a server
component (the count also goes to `viewerOf`, once per shell page, for the menu and
the landing's notice); there is no GraphQL read, as for the other two lists. The one
mutation is `acceptInvitationById(id: ID!): Invitation!`
([`components/received-invitations.md`](../components/received-invitations.md)).

**What the link still proves that the list does not.** A verified address
proves the mailbox was the person's when it was verified; the link proves it
still is at invitation time. An address passed on since could accept a coven
invitation meant for its new holder, which the site-tier exclusion bounds to
one coven. A member who already has a coven is redirected from `/coven` as
before, and can read the list on the account page; they can decline an
invitation they do not want since M10.34.

### Declining from the account page (M10.34)

An invitation could only be accepted, revoked by the coven or left to lapse,
so someone who did not want a seat had no answer to give, and the coven's
owner read the invitation as pending until the clock ran out. Since M10.34 the
account page's Invitations section has a Decline beside each Accept, and the
owner sees the answer ([`components/received-invitations.md`](../components/received-invitations.md),
[`components/pending-invitations.md`](../components/pending-invitations.md)).
The owner made it one task rather than a column task and a behaviour task: the
column is nullable and nothing would read it until the behaviour landed with it.

- **The write.** `declineReceivedInvitation(id)` above. Migration
  `0071_sudden_namorita.sql` adds the nullable column and the two CHECKs, and
  drops nothing.
- **The service.** `declineInvitationById(session, id)` in `identity`'s
  `invitation-acceptance.ts` runs the accept by id's checks over the same
  read, so an id the address does not hold, an unverified match, a site-tier
  id, a deleted row or coven and a malformed id are `NotFound` alike, and an
  accepted, declined, revoked or expired row is `Forbidden` in the link's own
  words. Then it stamps the row inside `withAudit` and grants and seats
  nothing: no membership, no `canCreateWorkspace`. If the stamp matches no row,
  because an accept or a revoke committed since the checks, it reads the row
  again and reports why.
- **A declined link says so.** `InvitationRefusal` gained `declined`, and the
  dead-link order is now **accepted, declined, revoked, expired**. The
  invitee's answer outranks the owner's Remove that may follow it, so a
  declined link keeps saying "This invitation was declined. If you change your
  mind, ask whoever sent it for a new one." after the owner clears the row,
  instead of turning into "withdrawn". The by-token accept refuses it with that
  reason too.
- **Gone from the invitee, kept for the owner.** The pending filter now
  excludes declined rows, so the account page's list and the shell's count
  drop it at once. The owner's list uses the new open filter instead, so it
  keeps the row, marked declined, past its expiry until they remove it.
- **In GraphQL**, `Invitation.declinedAt` and the mutation
  `declineInvitationById(id: ID!): Invitation!`, open to any signed-in account
  with the service deciding, as `acceptInvitationById` is. There is still no
  GraphQL list.
- **Asked for again.** A declined invitation is final: to join, the person asks
  the owner to invite them again, which writes a new row with its own token.
  Nothing un-declines one.

## Invitation acceptance details

`src/modules/identity/services/invitation-acceptance.ts` is the one accept service for both tiers of `invitations`. Holding the token names the invitation, and the session's verified address is what admits. No message names a workspace, since the reader is not yet a member of it (claude-docs/auth/admin-users.md, "Inviting an admin").

- **Dead-link order.** A link reports one reason: accepted before declined before revoked before expired, so a link in two states always reports the same one. An act beats the clock, and the invitee's answer beats the owner's Remove that may follow a decline. Accepted and declined cannot coexist: the writers match a pending row only and a CHECK holds it. The database's CHECK ties a role to a workspace, so a row with one has both.
- **Deleted coven.** A link into a deleted coven is refused as `closed`, after the dead-link and address checks, so an accepted invitation into a since-deleted coven still says accepted and a stranger learns nothing of the coven. The person never sees an Accept that fails on click; the repository write's own live-workspace check is the backstop. Workspaces are only soft-deleted, so no live coven means a deleted one and no finder of deleted rows is needed. The account page lists live covens only, so an id into a deleted one reads as none; only the link names the reason.
- **Pause.** While admin changes are paused, an invitation is accepted only if the primary admin sent it. Another admin's waits for the resume, so one a rogue admin sent cannot be redeemed meanwhile.
- **Two ways in.** The link's token and the account page's id share one check body so they cannot drift. The id read is the session's own (a coven invitation to its verified address, in SQL), so another address's id, a site-tier id, a deleted row and a malformed id all read as none. An id is not a link, so no message says "open the whole link". The writer's own match is the last word: an accept, a revoke or a second decline that committed since the checks leaves nothing to stamp.
- **Site tier.** Accepting grants the named site role (curator or admin) with the creation flag the users CHECK holds both to, declared `via: 'invitation'` with the invitation's note so the trigger on `users` records it as the accepting user's act; the invitation is stamped `acceptedAt` and `acceptedBy` in the same transaction. An account already holding that role or a higher one has the invitation stamped and nothing granted, so nothing is recorded: an invitation never lowers a role.
- **Workspace tier.** It seats the person at the invited role. A removed member's row is revived, since `(workspace_id, user_id)` is the key and a second insert would collide; a live member is seated nowhere and the invitation only stamped. It also sets `canCreateWorkspace`, declared the same way, which re-grants it to a person an admin revoked; one who holds it gets no ledger row. The live seat is read before the transaction. If the row is soft-deleted since the read, the stamp rolls back with it.
- **Decline.** `declineInvitationById` kills the invitation from now on: its link reports declined, the coven's owner sees it marked declined until they remove it, and nothing is granted or seated.
- **Card kind.** A `kind = 'card'` row has no address, coven or role. The accept predicate admits any account whose `users.email_verified` is true and says nothing of the address; it is ANDed with `pendingInvitation`, so the first accept stamps the row and a second matches nothing. `checkInvitation` reports an unverified account as `unverified` (the email page) and a used, expired or revoked card with its own reason, none naming a batch. Accepting sets `canCreateWorkspace` only, with `via: 'card'` in the privilege ledger: no seat and no site role. The by-id path and the received list read address-kind workspace rows only, so a card is never returned by them.
- **Card arrivals.** `findCardArrivalPage` and `findCardArrivalCount` (site admin only) answer "which accounts arrived by card, when, and from which batch" from the `invitations` rows alone: accepted card rows ordered by `accepted_at`, newest first. `revokeInvitationCardBatch` touches pending cards only; `findCardBatchPage`, `findCardBatchCount` and `findCardBatchTotals` list one row per batch with its counts, so an accepted card row, the permanent record of an arrival, is never changed. `insertInvitationCards` takes plaintext tokens from `newCardToken` (`src/lib/invitation-token.ts`: 16 characters, 57-symbol alphabet without `0`, `O`, `1`, `l`, `I`) and stores only their hashes.
- **Short link.** `/i/[token]` is public in `src/proxy.ts` and renders the same `InvitationPanel` as `/invite/[token]`.

## Coven invitation service details

`src/modules/coven/services/invitations.ts` is the workspace tier of `invitations`: who may invite is this service's; the token's hash, the expiry and the workspace the row names are the repository's named write's.

- Inviting stamps the session's user, mails the token to the address through `sender` after the commit (so a mailed link always names a row) and stores its hash alone. The row it answers carries no token. A failed send is the transport's to log: the invitation stays pending and can be revoked and sent again. The mail names who sent it; the session holds the id alone, so the name is read when sending.
- A second invitation to an address already invited replaces the pending one: that one is stamped revoked by the session's user in the same write as the new one, so a failed insert leaves it pending, only the newest link works and its role is the one that applies. Another coven's invitation, an accepted or lapsed one, and the site tier's are left alone.
- `role` may not be `owner`, which is granted afterwards on the members page. The email is refused when malformed, unmailable, or a live member's already.
- Listing pending invitations is for owners only: the rows carry the addresses of people who have not joined, and members read the roll, so the check is `member: invite`, never `member: read`. A pending invitation outlives its inviter's demotion or removal, as the admin tier's does.
- Revoking kills the link from now on and keeps the row for the audit. An invitation already revoked or lapsed is no longer pending, so it is answered as not found, as the admin tier's is. An accepted one is refused on `id`: the person is a member and is removed on the members page instead. Two tabs revoking at once, or the link lapsing in between, leave nothing pending to stamp.
