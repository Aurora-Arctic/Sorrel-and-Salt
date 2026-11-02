import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns } from '../../identity/schema/users';
import { supportRequests } from './support-requests';

export const supportReplyAuthorRole = pgEnum('support_reply_author_role', ['sender', 'staff']);
export const supportReplyVisibility = pgEnum('support_reply_visibility', ['public', 'internal']);

// One message on a request; the author is `created_by`. A request can take more than one, so a reply is a row and not a column on the request.
export const supportReplies = pgTable(
  'support_replies',
  {
    id: idColumn(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => supportRequests.id),
    body: text('body').notNull(),
    // Which side wrote it. Rows from before senders could write are staff and public.
    authorRole: supportReplyAuthorRole('author_role').notNull().default('staff'),
    // An internal note is staff-only: never read by the sender and never mailed.
    visibility: supportReplyVisibility('visibility').notNull().default('public'),
    ...auditColumns,
  },
  (table) => [
    // A request's replies, read in order.
    index('support_replies_request_idx')
      .on(table.requestId, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ],
);
