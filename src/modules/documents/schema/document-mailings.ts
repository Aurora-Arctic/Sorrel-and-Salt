import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';
import { documentVersions } from './document-versions';

// `replaced` marks a mailing that a newer mailing stopped before it finished; `paused` one the mail provider's
// monthly quota stopped, until a keeper resumes it.
export const documentMailingStatus = pgEnum('document_mailing_status', [
  'sending',
  'sent',
  'replaced',
  'paused',
]);

// One email to every account, listing the versions its `document_mailing_items` name. Marked `namedWrites`: its status and
// finish time are stamped by its own methods alone.
export const documentMailings = namedWrites(
  pgTable(
    'document_mailings',
    {
      id: idColumn(),
      // The one version, and its summary, of a mailing written before its versions were items; null on every newer mailing,
      // and read by nothing but the migration that copied them to items.
      documentVersionId: uuid('document_version_id').references(() => documentVersions.id),
      summary: text('summary'),
      status: documentMailingStatus('status').notNull().default('sending'),
      recipientCount: integer('recipient_count').notNull(),
      finishedAt: timestamp('finished_at'),
      ...auditColumns,
    },
    (table) => [liveUnique('document_mailings_version_unique', table, table.documentVersionId)],
  ),
);
