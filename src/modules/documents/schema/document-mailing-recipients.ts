import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';
import { documentMailings } from './document-mailings';

// One account in a mailing, with the time its mail went out: one row per account, so a retried batch mails no one twice. Marked
// `namedWrites`: rows are added and stamped sent by their own methods alone.
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
      // Null until the mail has gone out.
      sentAt: timestamp('sent_at'),
      ...auditColumns,
    },
    (table) => [
      liveUnique(
        'document_mailing_recipients_mailing_user_unique',
        table,
        table.mailingId,
        table.userId,
      ),
    ],
  ),
);
