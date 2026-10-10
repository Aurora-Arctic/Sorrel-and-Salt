import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns, users } from '../../identity/schema/users';
import { workspaceRole, workspaces } from './workspaces';

// A default, not a policy: a caller may pass its own `expiresAt`, and the
// column exists so omitting one cannot mean forever
// (claude-docs/db/invitations.md, "Invitations").
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// Every invitation, in two tiers as `ingredients` is (MB.201): a row naming a
// workspace and a role invites into that coven, and a row with neither is a
// site-tier invitation, which grants admin, as a null workspace is a
// compendium entry. In `coven` with the workspace it mostly names; the admin
// tier reaches it as admin curation reaches `ingredients`
// (claude-docs/design-decisions/mb.201-two-tier-invitations.md). Only the
// token's hash is stored, and there must never be a plaintext column. Marked
// `namedWrites` (MB.198): the row is what authorises a membership or a grant,
// so it is written only through its named insert, accept and revoke.
export const invitations = namedWrites(
  pgTable(
    'invitations',
    {
      id: uuid('id')
        .default(sql`pg_catalog.gen_random_uuid()`)
        .primaryKey(),
      // Null on the site tier, with `role`: the tier check pairs them.
      workspaceId: uuid('workspace_id').references(() => workspaces.id),
      // Not a foreign key: an invitee may have no account yet.
      email: text('email').notNull(),
      // The enum `workspace_members.role` stores; the role check narrows it.
      role: workspaceRole('role'),
      tokenHash: text('token_hash').notNull(),
      expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
      acceptedAt: timestamp('accepted_at'),
      acceptedBy: uuid('accepted_by').references(() => users.id),
      // Who revoked is `updated_by`: revoking is the last write a row takes.
      revokedAt: timestamp('revoked_at'),
      // Why the person is being invited; optional, and either tier may carry one.
      note: text('note'),
      ...auditColumns,
    },
    (table) => [
      // A workspace and a role together, or neither: a row is in one tier.
      check('invitations_tier', sql`(${table.workspaceId} is null) = (${table.role} is null)`),
      // `viewer` or `member` only, in the database so no write path can forget
      // it. The allowed set rather than `<> 'owner'`: a fourth value would be
      // silently invitable under the negative form.
      check(
        'invitations_role_invitable',
        sql`${table.role} is null or ${table.role} in ('viewer', 'member')`,
      ),
      // The acceptance lookup, across both tiers: one hash must resolve to at
      // most one row. Partial per rule 4, though nothing re-proposes a random hash.
      uniqueIndex('invitations_token_hash_unique')
        .on(table.tokenHash)
        .where(sql`${table.deletedAt} is null`),
    ],
  ),
);
