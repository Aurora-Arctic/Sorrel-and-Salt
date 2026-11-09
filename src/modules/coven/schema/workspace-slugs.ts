import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { idColumn, liveUnique } from '../../../db/schema-parts';
import { namedWrites } from '../../../db/table-marks';
import { auditColumns } from '../../identity/schema/users';
import { workspaces } from './workspaces';

// Every address a coven has held, its current one and its old ones together; the live-only unique index keeps two live covens from
// sharing one. Cascades, since the app soft-deletes a coven and only a fixture or a manual fix hard-deletes it.
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
    (table) => [liveUnique('workspace_slugs_slug_unique', table, table.slug)],
  ),
);
