import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { auditColumns, revisionColumn } from '../../identity/schema/users';
import { documents } from './documents';

export const documentVersionStatus = pgEnum('document_version_status', ['draft', 'published']);

// One version of a document's text, numbered from 1 per document. A document has at most one open draft; publishing dates it, and a
// published version is never edited again. Marked `namedWrites`: reached only through the draft methods.
export const documentVersions = namedWrites(
  pgTable(
    'document_versions',
    {
      id: idColumn(),
      documentId: uuid('document_id')
        .notNull()
        .references(() => documents.id),
      number: integer('number').notNull(),
      body: text('body').notNull(),
      status: documentVersionStatus('status').notNull().default('draft'),
      // Set when the draft is published, null while it is a draft.
      publishedAt: timestamp('published_at'),
      revision: revisionColumn(),
      ...auditColumns,
    },
    (table) => [
      liveUnique('document_versions_number_unique', table, table.documentId, table.number),
      uniqueIndex('document_versions_one_draft')
        .on(table.documentId)
        .where(sql`${table.status} = 'draft' and ${table.deletedAt} is null`),
      check(
        'document_versions_published_at_with_status',
        sql`(${table.status} = 'published') = (${table.publishedAt} is not null)`,
      ),
    ],
  ),
);
