import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns } from '../../identity/schema/users';
import { workspaces } from './workspaces';

// A coven's current address and at most one old one, the address it held before its latest rename; the live-only unique index keeps
// two live rows from sharing an address. Cascades, since the app soft-deletes a coven and only a fixture or a manual fix hard-deletes it.
/** The index that keeps a retired slug reserved to one workspace. */
export const WORKSPACE_SLUGS_SLUG_UNIQUE = 'workspace_slugs_slug_unique';

export const workspaceSlugs = namedWrites(
  pgTable(
    'workspace_slugs',
    {
      id: idColumn(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      slug: text('slug').notNull(),
      ...auditColumns,
    },
    (table) => [liveUnique(WORKSPACE_SLUGS_SLUG_UNIQUE, table, table.slug)],
  ),
);
