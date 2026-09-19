import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { users } from './users';
import { workspaceRole, workspaces } from './workspaces';

// How long an unopened invitation stays good. §5 names no figure: seven days
// survives a Friday mailing plus a holiday, and is short enough that a
// forwarded link found in an old inbox is dead. A *default*, not a policy —
// M7.3 may pass its own `expiresAt`; the column exists so that omitting one
// cannot produce an invitation valid forever.
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// DESIGN.md §5, story 4 — an owner generates a link, the link is shown once,
// and a leaked database row is not a way in.
//
// **Only the hash is stored, and that is this table's reason for existing.**
// There is no plaintext column and there must never be one: M7.2 generates the
// token with `crypto.randomBytes` and hashes it, M7.3 returns the URL exactly
// once in the mutation response, and every later read matches a hash against
// this column.
//
// The four lifecycle columns are deliberately separate rather than one `status`
// enum — story 7 wants expiry, revocation and acceptance told apart, with a
// deterministic answer when two apply at once. M7.7 owns the classification;
// this table owns keeping the evidence apart. No constraint pairs `acceptedAt`
// with `acceptedBy`: §5 names one CHECK here and it is the role one below
// (claude-docs/db.md, "Invitations").
export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    // The address the invitation was sent to, not a foreign key: an invitee
    // has no account yet, which is the whole point of inviting them.
    email: text('email').notNull(),
    // The same enum `workspace_members.role` stores, because an accepted
    // invitation becomes a membership at that role verbatim. The narrowing to
    // the invitable subset is the CHECK below, not a second enum.
    role: workspaceRole('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
    acceptedAt: timestamp('accepted_at'),
    acceptedBy: uuid('accepted_by').references(() => users.id),
    revokedAt: timestamp('revoked_at'),
    ...auditColumns,
  },
  (table) => [
    // DESIGN.md §5: `viewer` or `member` only. In the database because a check
    // in the service can be forgotten by the next code path that writes here.
    //
    // Written as the allowed set rather than `role <> 'owner'`: a fourth enum
    // value added later would be silently invitable under the negative form and
    // silently refused under this one, and refusing is the safe default for a
    // column that decides what a stranger holding a link may do. Ownership is
    // granted afterwards by an existing owner (M6.13).
    check('workspace_invitations_role_invitable', sql`role in ('viewer', 'member')`),
    // The lookup the acceptance path runs: M7.5 hashes a presented token and
    // finds the row by it. The uniqueness is load-bearing — one hash must
    // resolve to at most one invitation, or redeeming it is a coin toss between
    // rows that may name different roles.
    //
    // Partial per CLAUDE.md rule 4, though the usual argument is weak here:
    // no caller ever re-proposes a particular random hash. Applied anyway —
    // the rule is absolute and the predicate costs nothing.
    uniqueIndex('workspace_invitations_token_hash_unique')
      .on(table.tokenHash)
      .where(sql`${table.deletedAt} is null`),
  ],
);
