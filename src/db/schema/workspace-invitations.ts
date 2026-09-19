import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { users } from './users';
import { workspaceRole, workspaces } from './workspaces';

// A default, not a policy — a caller may pass its own `expiresAt`; the column
// exists so omitting one cannot mean forever (claude-docs/db.md, "Invitations").
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// An owner generates a link, shown once; only the hash is stored and there
// must never be a plaintext column. The lifecycle columns stay separate rather
// than one `status` enum so expiry, revocation and acceptance are told apart —
// see above.
export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    // Not a foreign key: an invitee has no account yet.
    email: text('email').notNull(),
    // The enum `workspace_members.role` stores; the CHECK below narrows it.
    role: workspaceRole('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
    acceptedAt: timestamp('accepted_at'),
    acceptedBy: uuid('accepted_by').references(() => users.id),
    revokedAt: timestamp('revoked_at'),
    ...auditColumns,
  },
  (table) => [
    // `viewer` or `member` only, in the database so no write path can forget it.
    // The allowed set rather than `<> 'owner'`: a fourth value would be silently
    // invitable under the negative form.
    check('workspace_invitations_role_invitable', sql`role in ('viewer', 'member')`),
    // The acceptance lookup; one hash must resolve to at most one row. Partial
    // per rule 4, though nothing ever re-proposes a random hash.
    uniqueIndex('workspace_invitations_token_hash_unique')
      .on(table.tokenHash)
      .where(sql`${table.deletedAt} is null`),
  ],
);
