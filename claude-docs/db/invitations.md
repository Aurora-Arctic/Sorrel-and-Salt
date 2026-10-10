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
  `token_hash`. The schema test pins this as a property of the whole table
  rather than of one column ("the only column whose name mentions a token is
  the hash"), so a later `invite_token` reddens it.
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

The finders:

- **`findInvitationByToken(token)`** returns the live row the token names,
  on either tier, under no proof for the accept's reason: holding the token
  is what admits. It returns expired, revoked and accepted rows alike: the
  accept service rejects each with its own message (M7.7), and can only tell
  them apart if it sees them.
- **`findPendingInvitationsInWorkspace(membership)`**, the members page's
  pending list (M7.6), and **`findPendingSiteInvitations(admin)`**,
  `/admin/users`' (MB.70): each tier's pending rows under its own proof.
  Unordered, since a page sorts the handful it holds. No list of past
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
the workspace or on `/admin` by tier (M7.5, MB.70).
