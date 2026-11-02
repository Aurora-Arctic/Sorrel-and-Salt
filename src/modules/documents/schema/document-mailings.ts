import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';
import { documentVersions } from './document-versions';

// `replaced` marks a mailing that a newer mailing of the same document stopped before it finished.
export const documentMailingStatus = pgEnum('document_mailing_status', [
  'sending',
  'sent',
  'replaced',
]);

// A published version emailed to every account, at most once per version. Marked `namedWrites`: its status and finish time are
// stamped by its own methods alone.
export const documentMailings = namedWrites(
  pgTable(
    'document_mailings',
    {
      id: idColumn(),
      documentVersionId: uuid('document_version_id')
        .notNull()
        .references(() => documentVersions.id),
      // What changed, in the admin's words, as the mail carries it.
      summary: text('summary').notNull(),
      status: documentMailingStatus('status').notNull().default('sending'),
      recipientCount: integer('recipient_count').notNull(),
      finishedAt: timestamp('finished_at'),
      ...auditColumns,
    },
    (table) => [liveUnique('document_mailings_version_unique', table, table.documentVersionId)],
  ),
);
