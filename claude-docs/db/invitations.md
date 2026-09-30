## Invitations (M7.1)

`src/modules/coven/schema/workspace-invitations.ts` holds DESIGN.md §5's third workspace
table, reusing the `workspace_role` enum declared beside `workspaces`.
`0012_cultured_ben_grimm.sql` is the migration.

- **`workspace_invitations`** — `id`, `workspaceId`, `email`, `role`,
  `tokenHash`, `expiresAt`, `acceptedAt`, `acceptedBy`, `revokedAt`, + the full
  six-column audit spread. `email` is text and **not** a foreign key: an
  invitee has no account yet, which is the point of inviting them.
- **Only the hash is stored.** There is no plaintext column and there must
  never be one — story 4's requirement is that a leaked database row cannot be
  redeemed. M7.2 generates the token with `crypto.randomBytes` and hashes it,
  M7.3 returns the URL exactly once in the mutation response, and every later
  read matches a hash against `token_hash`. The schema test pins this as a
  property of the whole table rather than of one column ("the only column whose
  name mentions a token is the hash"), so a later `invite_token` reddens it.
- **`workspace_invitations_role_invitable`** is the check constraint DESIGN.md
  §5 requires: `role in ('viewer', 'member')`. Written as the allowed set
  rather than as `role <> 'owner'` deliberately — `workspace_role` has three
  values today, and a fourth added later would be silently _invitable_ under
  the negative form and silently refused under this one. Refusing is the safe
  default for the column that decides what a stranger holding a link may do. In
  the database rather than the service because a service check can be forgotten
  by the next code path that writes the table, and a constraint cannot.
- **Expiry defaults to seven days** (`now() + interval '7 days'`), and the
  column is `NOT NULL`. §5 names no figure, so M7.1 chose one and recorded why
  at the constant: long enough that a link mailed on a Friday survives the
  weekend, short enough that one found in an old inbox is dead. It is a
  default, not a policy — M7.3 may pass its own — and what the `NOT NULL`
  buys is that omitting one cannot produce an invitation valid forever.
- **`workspace_invitations_token_hash_unique`** is the acceptance path's
  lookup, and unique as well as indexed: one hash must resolve to at most one
  invitation, or redeeming it is a coin toss between two rows that may name
  different roles. Partial on `deleted_at IS NULL` per the convention below.
  The usual argument for that predicate is weak here — nothing re-proposes a
  particular random hash — but the rule is absolute and the predicate is free.
- **Four lifecycle columns, not one `status` enum.** `expiresAt` is a clock
  comparison, `revokedAt` is an owner's act, and `acceptedAt`/`acceptedBy` are
  the redeemer's. Story 7 wants all three told apart with a deterministic
  answer when two apply at once, and collapsing them is exactly the shape MB.30
  rejected in Better Auth's plugin, which answers every dead link with one
  `INVITATION_NOT_FOUND` (`design-decisions/mb.30-organization-plugin.md`).
  M7.7 owns the classification; the table owns keeping the evidence apart.
- **No constraint pairs `acceptedAt` with `acceptedBy`.** §5 names one check on
  this table and it is the role one; acceptance is a single service write in
  M7.5, where the pairing is one statement rather than an invariant the
  database has to be taught.
- The table is inert at Wave 3 — nothing queries it until M7.2's token service
  and M7.3's mutation land in Wave 10, which is CLAUDE.md's
  table-task-then-behaviour-task rule working as intended: the DDL is
  constrained while the table is empty.
