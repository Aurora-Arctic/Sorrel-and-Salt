import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns, users } from './users';

// `workspace_invitations`' lifetime, for its reason (claude-docs/db/invitations.md,
// "Invitations"): a default, so omitting one cannot mean forever.
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// An admin names an address and the link is mailed to it (story 62): shaped
// like `workspace_invitations` without the workspace or the role, since
// accepting grants exactly one thing. Only the hash is stored, and there must
// never be a plaintext column. Marked `namedWrites` (MB.198): written only
// through the writer's named insert, accept and revoke, because the row is
// what authorises a grant (claude-docs/db/invitations.md, "Admin invitations").
export const adminInvitations = namedWrites(
  pgTable(
    'admin_invitations',
    {
      id: uuid('id')
        .default(sql`pg_catalog.gen_random_uuid()`)
        .primaryKey(),
      // Not a foreign key: an invitee may have no account yet.
      email: text('email').notNull(),
      tokenHash: text('token_hash').notNull(),
      expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
      acceptedAt: timestamp('accepted_at'),
      acceptedBy: uuid('accepted_by').references(() => users.id),
      // Who revoked is `updated_by`: revoking is the last write a row takes.
      revokedAt: timestamp('revoked_at'),
      // Why the person is being invited; optional, as the role ledger's is.
      note: text('note'),
      ...auditColumns,
    },
    (table) => [
      // The acceptance lookup; one hash must resolve to at most one row. Partial
      // per rule 4, though nothing ever re-proposes a random hash.
      uniqueIndex('admin_invitations_token_hash_unique')
        .on(table.tokenHash)
        .where(sql`${table.deletedAt} is null`),
    ],
  ),
);
