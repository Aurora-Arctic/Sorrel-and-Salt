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
  `revokedAt`, `note` (nullable), + the full six-column audit spread.
  `email` is text and **not** a foreign key: an invitee may have no account
  yet, which is the point of inviting them. `note` says why the person is
  being invited, optional as a privilege change's `note` is in
  `user_privilege_changes`; either tier may carry one, and the workspace tier's UI need
  not offer it.
- **`invitations_tier`**, `(workspace_id is null) = (role is null)`: a row is
  in one tier, a workspace and the role it is invited to, or neither.
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
- **Four lifecycle columns, not one `status` enum.** `expiresAt` is a clock
  comparison, `revokedAt` is an owner's or an admin's act, and
  `acceptedAt`/`acceptedBy` are the redeemer's. Story 7 wants all three told
  apart with a deterministic answer when two apply at once, and collapsing
  them is exactly the shape MB.30 rejected in Better Auth's plugin, which
  answers every dead link with one `INVITATION_NOT_FOUND`
  ([`mb.30-organization-plugin.md`](../design-decisions/mb.30-organization-plugin.md)).
  M7.7 owns the classification; the table owns keeping the evidence apart.
  There is no `revokedBy`: revoking is the last write a row takes, so
  `updated_by` is who revoked. No constraint pairs `acceptedAt` with
  `acceptedBy`, since one named write sets both.

### Admin invitations (MB.69), now the site tier

MB.69 built story 62's table, `admin_invitations`: the workspace table's
shape without the workspace or the role, since accepting grants exactly one
thing, and with the note. Its rows are the site tier now, a null workspace
and role, copied by MB.201's migration with their ids, stamps and notes, and
its named writes and token read became the ones below, by tier. M2.9's two
objections to reusing the workspace table, that it was scoped and that its
check refused anything but a workspace role, are what the nullable pair
answers.

### Written and read by tier (MB.202)

The row is what authorises a membership or a grant, so a generic insert would
let any service mint its own user an invitation and accept it. The table is
marked `namedWrites` in its schema file, which takes it off every generic
writer method ([`write-path.md`](write-path.md#table-marks-mb198), "Table
marks"; MB.198). In their place, in the repository's `invitations.ts`, which
`writerFor` spreads into the writer:

- **`insertInvitation(membership, values)`** writes a workspace invitation
  into the proof's workspace with the role `values` names, which the type
  requires and confines to `viewer` or `member`.
  **`insertInvitation(admin, values)`**, under the `SiteAdmin` proof, writes
  the null pair. Either takes the email, the token, the note and an optional
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
  and the pause on admin grants, are the service's.
- **`revokeInvitation(membership, id)`** stamps `revoked_at` now on a row in
  the proof's workspace, and **`revokeInvitation(admin, id)`** on a
  site-tier row. By id rather than token: an owner or an admin revokes from
  a list, and neither holds the token. Each reaches only its own tier: a
  workspace proof cannot revoke a site invitation by id, nor the site proof
  a workspace's, nor one workspace's proof another's, each asserted by
  direct id against a row the right proof then revokes.

Both stamps match a **pending** row only: live, neither accepted nor revoked,
and unexpired. So no invitation is accepted twice, a revoked or expired link
cannot be redeemed even by a service that forgot to check, and neither stamp
overwrites the other; a call that matches nothing returns no row, as MB.62's
resume does.

**The token goes in, never the hash.** `hashToken` in the repository's
`tokens.ts`, hex SHA-256, is the only place a hash is made, so a caller
never holds one: a hash read out of a dumped row and passed where a token
goes is hashed again and matches nothing, and the accept cannot be reached
with an invitation's id, which the lists show. SHA-256 unsalted rather than
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
  is what admits. It returns expired, revoked and accepted rows alike: the
  accept service rejects each with its own message (M7.7), and can only tell
  them apart if it sees them.
- **`findPendingInvitationsInWorkspace(membership)`**, the members page's
  pending list (M7.6), and **`findPendingSiteInvitationPage(admin, filter, page)`**,
  `/admin/invitations`' (MB.70): each tier's pending rows under its own proof.
  The workspace's pages newest first with a count, as the site tier does,
  through a workspace page finder and count finder that M7.6 adds under the
  `Membership` proof; until M7.6 lands the finder is unpaged. The site tier's is a cursor page (a page of results that resumes
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
`createInvitation` / `revokeInvitation`, owner only, role chosen (M7.2,
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
   `sender.workspaceInvitation(email, token, { name, role })`: after the commit,
   so a mailed link always names a row.

**A second pending invitation to an address already invited is accepted**, as
the admin tier's is: each mail carries its own token and any one accepts. What
the first leaves pending, the owner revokes (M7.6). **A failed send leaves the
invitation pending**: `send` in `src/lib/mail.ts` never throws and logs with
`console.error`, so the mutation succeeds and the owner can revoke and
re-invite. The test for it runs the real `send` over a `fetch` that answers
500, not a double that pretends to have failed.

**The mail** is `src/emails/coven-invitation.tsx`, rendered twice by
`renderParts` as HTML and plain text. The plain-text part carries the
`/invite/<token>` link, because story 4's acceptance test reads the token from
it. `InvitationSender` (`identity/types.ts`) gained
`workspaceInvitation(to, token, { name, role })` beside `siteInvitation`; the
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

Story 4's acceptance test passes `createInvitation` now and stops at
`acceptInvitation`, which has no workspace branch until M7.5.
