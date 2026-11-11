import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { INVITABLE_ROLES } from '../../../lib/invitable-roles';
import { MAX_NOTE_LENGTH } from '../../../lib/invitation-cards/limits';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns, userRole, users } from '../../identity/schema/users';
import { workspaceRole, workspaces } from './workspaces';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// A default, not a policy: omitting an expiry must not mean forever (claude-docs/db/invitations.md, "Invitations").
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// Three shapes: `address` (two tiers, as `ingredients` is), `card`, and a site-tier row. Only the token's hash is stored (claude-docs/design-decisions/auth.md, "Workspace and admin invitations are one two-tier table").
export const invitations = namedWrites(
  pgTable(
    'invitations',
    {
      id: idColumn(),
      workspaceId: uuid('workspace_id').references(() => workspaces.id),
      // Not a foreign key: an invitee may have no account yet.
      // Null on a card, which is bound to no address; the shape check requires one on an address row.
      email: text('email'),
      role: workspaceRole('role'),
      tokenHash: text('token_hash').notNull(),
      expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
      acceptedAt: timestamp('accepted_at'),
      acceptedBy: uuid('accepted_by').references(() => users.id),
      // Who revoked is `updated_by`: revoking is the last write a row takes.
      revokedAt: timestamp('revoked_at'),
      // The invitee's no, coven invitations only; the steward's Remove afterwards stamps `revoked_at`.
      declinedAt: timestamp('declined_at'),
      // A card carries its batch's note, copied onto every card of the batch as the expiry is.
      note: text('note'),
      siteRole: userRole('site_role'),
      // Text with a check, not an enum, so adding a kind needs no enum migration.
      kind: text('kind').notNull().default('address'),
      // The mint a card came from; null on an address row. Not a foreign key: a batch has no table, only its cards.
      batchId: uuid('batch_id'),
      // A card's place in its batch from 1, in the order the PDF lays the fronts out; null on an address row and on an older card.
      position: smallint('position'),
      // A card minted for beta testers, set on every card of its batch at minting and never changed; false on an address row.
      beta: boolean('beta').notNull().default(false),
      ...auditColumns,
    },
    (table) => [
      // A workspace and a role together, or neither; a card is outside it.
      check(
        'invitations_tier',
        sql`${table.kind} = 'card' or (${table.workspaceId} is null) = (${table.role} is null)`,
      ),
      check(
        'invitations_position_card_only',
        sql`${table.position} is null or ${table.kind} = 'card'`,
      ),
      check(
        'invitations_position_positive',
        sql`${table.position} is null or ${table.position} >= 1`,
      ),
      check('invitations_beta_card_only', sql`not ${table.beta} or ${table.kind} = 'card'`),
      // Only a card's note is capped; an address row's note has no length limit.
      check(
        'invitations_card_note_length',
        sql`${table.kind} <> 'card' or char_length(${table.note}) <= ${sql.raw(String(MAX_NOTE_LENGTH))}`,
      ),
      check('invitations_kind_known', sql`${table.kind} in ('address', 'card')`),
      // An address row names its address; a card names none of address, coven, role or site role.
      check(
        'invitations_kind_shape',
        sql`(${table.kind} = 'address' and ${table.email} is not null) or (${table.kind} = 'card' and num_nonnulls(${table.email}, ${table.workspaceId}, ${table.role}, ${table.siteRole}) = 0)`,
      ),
      // The allowed set, not `<> 'owner'`: a fourth value would be silently invitable.
      check(
        'invitations_role_invitable',
        sql`${table.role} is null or ${table.role} in (${sql.raw(INVITABLE_ROLES.map((role) => `'${role}'`).join(', '))})`,
      ),
      check(
        'invitations_site_role_tier',
        sql`${table.kind} = 'card' or (${table.workspaceId} is null) = (${table.siteRole} is not null)`,
      ),
      // Compared as text, not as the enum: Postgres refuses a `curator` literal cast
      // in the transaction that adds it (55P04), which drizzle-kit hits on a
      // database migrated before both.
      check(
        'invitations_site_role_invitable',
        sql`${table.siteRole} is null or ${table.siteRole}::text in ('user', 'curator', 'admin')`,
      ),
      // A keeper invitation is accepted by its link or not at all.
      check(
        'invitations_declined_coven',
        sql`${table.declinedAt} is null or ${table.workspaceId} is not null`,
      ),
      check(
        'invitations_answered_once',
        sql`num_nonnulls(${table.acceptedAt}, ${table.declinedAt}) <= 1`,
      ),
      // One hash must resolve to at most one row across both tiers.
      liveUnique('invitations_token_hash_unique', table, table.tokenHash),
    ],
  ),
);
