import { check, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';
import { documentMailings } from './document-mailings';

// One row per account, so a retried batch mails no one twice. Marked `namedWrites`: rows are added and stamped sent by their own methods alone.
export const documentMailingRecipients = namedWrites(
  pgTable(
    'document_mailing_recipients',
    {
      id: idColumn(),
      mailingId: uuid('mailing_id')
        .notNull()
        .references(() => documentMailings.id),
      // Goes with the account it names: a hard-deleted provisional account takes its rows.
      userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
      sentAt: timestamp('sent_at'),
      // Set instead of `sent_at` for an account that can never be mailed (gone, or its address refused for good); null otherwise.
      skippedAt: timestamp('skipped_at'),
      ...auditColumns,
    },
    (table) => [
      check(
        'document_mailing_recipients_sent_or_skipped',
        sql`num_nonnulls(${table.sentAt}, ${table.skippedAt}) <= 1`,
      ),
      liveUnique(
        'document_mailing_recipients_mailing_user_unique',
        table,
        table.mailingId,
        table.userId,
      ),
    ],
  ),
);
