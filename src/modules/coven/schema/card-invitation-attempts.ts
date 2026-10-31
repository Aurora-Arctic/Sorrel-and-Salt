import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';
import { invitations } from './invitations';

// One signed-in account's refused opens of one card link, for one reason, with a count: a repeat open adds to `attempts` rather than a row.
// Written only through its named upsert (claude-docs/db/invitations.md, "Card attempts").
export const cardInvitationAttempts = namedWrites(
  pgTable(
    'card_invitation_attempts',
    {
      id: idColumn(),
      invitationId: uuid('invitation_id')
        .notNull()
        .references(() => invitations.id),
      userId: uuid('user_id')
        .notNull()
        .references(() => users.id),
      // Text with a check, not an enum, so adding a reason needs no enum migration.
      reason: text('reason').notNull(),
      attempts: integer('attempts').notNull().default(1),
      lastAttemptedAt: timestamp('last_attempted_at').notNull().defaultNow(),
      ...auditColumns,
    },
    (table) => [
      check(
        'card_invitation_attempts_reason_known',
        sql`${table.reason} in ('revoked', 'expired', 'accepted')`,
      ),
      check('card_invitation_attempts_count_positive', sql`${table.attempts} >= 1`),
      liveUnique(
        'card_invitation_attempts_card_user_reason_unique',
        table,
        table.invitationId,
        table.userId,
        table.reason,
      ),
      // The per-card count and list.
      index('card_invitation_attempts_invitation_idx')
        .on(table.invitationId)
        .where(sql`${table.deletedAt} is null`),
    ],
  ),
);
