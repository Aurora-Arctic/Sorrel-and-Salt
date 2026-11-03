import { pgTable, text } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique, seedKeyColumn, seedKeyUnique } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';

// A document the site publishes under its own name, one row per document and seeded: its title and lede change, its key never does.
// The text is in `document_versions`. Marked `namedWrites`: reached only through its own update.
export const documents = namedWrites(
  pgTable(
    'documents',
    {
      id: idColumn(),
      // What the document is addressed by in code, such as `privacy`; never shown.
      key: text('key').notNull(),
      title: text('title').notNull(),
      // One sentence saying what the document covers.
      lede: text('lede').notNull(),
      seedKey: seedKeyColumn(),
      ...auditColumns,
    },
    (table) => [
      liveUnique('documents_key_unique', table, table.key),
      seedKeyUnique('documents_seed_key_unique', table),
    ],
  ),
);
