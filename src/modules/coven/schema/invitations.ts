import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns, userRole, users } from '../../identity/schema/users';
import { workspaceRole, workspaces } from './workspaces';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// A default, not a policy: a caller may pass its own `expiresAt`, and the
// column exists so omitting one cannot mean forever
// (claude-docs/db/invitations.md, "Invitations").
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// Every invitation, in three shapes. An `address` row is in two tiers as `ingredients` is: a row naming a workspace and a role invites into that coven, and a row with
// neither is a site-tier invitation granting the site role it names. A `card` row is bound to no address, coven or site role. Only the token's hash is stored, never plaintext, and the row is
// written only through its named insert, accept, decline and revoke (claude-docs/design-decisions/mb.201-two-tier-invitations.md).
export const invitations = namedWrites(
  pgTable(
    'invitations',
    {
      id: idColumn(),
      // Null on the site tier, with `role`: the tier check pairs them.
      workspaceId: uuid('workspace_id').references(() => workspaces.id),
      // Not a foreign key: an invitee may have no account yet.
      // Null on a card, which is bound to no address; the shape check requires one on an address row.
      email: text('email'),
      // The enum `workspace_members.role` stores; the role check narrows it.
      role: workspaceRole('role'),
      tokenHash: text('token_hash').notNull(),
      expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
      acceptedAt: timestamp('accepted_at'),
      acceptedBy: uuid('accepted_by').references(() => users.id),
      // Who revoked is `updated_by`: revoking is the last write a row takes.
      revokedAt: timestamp('revoked_at'),
      // The invitee's no: a coven invitation only, answered once. Who
      // declined is the address it was sent to, held verified by the session
      // that wrote it; the owner's Remove afterwards stamps `revoked_at`.
      declinedAt: timestamp('declined_at'),
      // Why the person is being invited; optional, and either tier may carry one.
      note: text('note'),
      // The site role a site-tier invitation grants, `curator` or `admin`;
      // null on a coven invitation, which grants `role` instead.
      siteRole: userRole('site_role'),
      // `address` is invited by mail; `card` is a printed code any verified account may redeem once. Text with a check, not an enum, so
      // adding a kind needs no enum migration.
      kind: text('kind').notNull().default('address'),
      // The mint a card came from; null on an address row. Not a foreign key: a batch has no table, only its cards.
      batchId: uuid('batch_id'),
      ...auditColumns,
    },
    (table) => [
      // A workspace and a role together, or neither: a row is in one tier.
      // A card is outside it: it names neither.
      check(
        'invitations_tier',
        sql`${table.kind} = 'card' or (${table.workspaceId} is null) = (${table.role} is null)`,
      ),
      check('invitations_kind_known', sql`${table.kind} in ('address', 'card')`),
      // An address row names its address; a card names none of address, coven, role or site role.
      check(
        'invitations_kind_shape',
        sql`(${table.kind} = 'address' and ${table.email} is not null) or (${table.kind} = 'card' and num_nonnulls(${table.email}, ${table.workspaceId}, ${table.role}, ${table.siteRole}) = 0)`,
      ),
      // `viewer` or `member` only, in the database so no write path can forget
      // it. The allowed set rather than `<> 'owner'`: a fourth value would be
      // silently invitable under the negative form.
      check(
        'invitations_role_invitable',
        sql`${table.role} is null or ${table.role} in ('viewer', 'member')`,
      ),
      // A site role on the site tier and only there; a card has none.
      check(
        'invitations_site_role_tier',
        sql`${table.kind} = 'card' or (${table.workspaceId} is null) = (${table.siteRole} is not null)`,
      ),
      // The allowed set, as for `role`, so `user` grants nothing. Compared as
      // text: as the enum, each literal is cast to `user_role`, and Postgres
      // refuses `curator` in the transaction that adds it (55P04), which
      // drizzle-kit runs with this migration on a database migrated before both.
      check(
        'invitations_site_role_invitable',
        sql`${table.siteRole} is null or ${table.siteRole}::text in ('curator', 'admin')`,
      ),
      // Only a coven invitation is declined: an admin invitation is never
      // listed to its invitee, so it is accepted by its link or not at all.
      check(
        'invitations_declined_coven',
        sql`${table.declinedAt} is null or ${table.workspaceId} is not null`,
      ),
      // Answered once: an invitation is accepted or declined, never both.
      check(
        'invitations_answered_once',
        sql`num_nonnulls(${table.acceptedAt}, ${table.declinedAt}) <= 1`,
      ),
      // The acceptance lookup, across both tiers: one hash must resolve to at
      // most one row. Partial per rule 4, though nothing re-proposes a random hash.
      liveUnique('invitations_token_hash_unique', table, table.tokenHash),
    ],
  ),
);
