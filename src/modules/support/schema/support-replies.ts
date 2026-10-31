import { sql } from 'drizzle-orm';
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';
import { supportRequests } from './support-requests';

// One reply to a request; the author is `created_by`. A request can take more than one, so a reply is a row and not a column on the request.
export const supportReplies = pgTable(
  'support_replies',
  {
    id: idColumn(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => supportRequests.id),
    body: text('body').notNull(),
    ...auditColumns,
  },
  (table) => [
    // A request's replies, read in order.
    index('support_replies_request_idx')
      .on(table.requestId, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ],
);
