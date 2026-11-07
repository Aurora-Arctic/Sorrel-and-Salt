import { pgTable, text } from 'drizzle-orm/pg-core';
import { namedWrites } from '../../../db/table-marks';
import { idColumn, liveUnique, seedKeyColumn, seedKeyUnique } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';

// Seeded: its title and lede change, its key never does. Marked `namedWrites`: reached only through its own update.
export const documents = namedWrites(
  pgTable(
    'documents',
    {
      id: idColumn(),
      // What the document is addressed by in code, such as `privacy`; never shown.
      key: text('key').notNull(),
      title: text('title').notNull(),
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
