import { foreignKey, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';
import { documentMailings } from './document-mailings';
import { documentVersions } from './document-versions';

// One published version a mailing tells every account about, with what changed in the keeper's words. One email lists every
// item of its mailing, so the mailing covers every document changed since the last email. Marked `namedWrites`: items are
// written by the method that starts their mailing alone.
export const documentMailingItems = namedWrites(
  pgTable(
    'document_mailing_items',
    {
      id: idColumn(),
      mailingId: uuid('mailing_id')
        .notNull()
        .references(() => documentMailings.id),
      documentVersionId: uuid('document_version_id').notNull(),
      summary: text('summary').notNull(),
      ...auditColumns,
    },
    (table) => [
      // Named here: the generated name runs past Postgres's 63 characters, which would cut it short.
      foreignKey({
        name: 'document_mailing_items_version_fk',
        columns: [table.documentVersionId],
        foreignColumns: [documentVersions.id],
      }),
      liveUnique(
        'document_mailing_items_mailing_version_unique',
        table,
        table.mailingId,
        table.documentVersionId,
      ),
    ],
  ),
);
