import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';

export const supportRequestKind = pgEnum('support_request_kind', [
  'accessibility',
  'bug',
  'question',
]);
export const supportRequestStatus = pgEnum('support_request_status', ['open', 'resolved']);

// A message a signed-in account sends to whoever runs the site. The sender is `created_by`, so no second sender column can drift from it,
// and there is no workspace id: a request is the account's, not a coven's.
export const supportRequests = pgTable(
  'support_requests',
  {
    id: idColumn(),
    kind: supportRequestKind('kind').notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    // The page it was sent from, with the segment after `/coven/` redacted.
    path: text('path').notNull(),
    // The HTTP status of the error page it was sent from.
    errorCode: integer('error_code'),
    status: supportRequestStatus('status').notNull().default('open'),
    assignedTo: uuid('assigned_to').references(() => users.id),
    // Whether a curator may read it without being assigned it.
    curatorVisible: boolean('curator_visible').notNull().default(false),
    issueUrl: text('issue_url'),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolvedAt: timestamp('resolved_at'),
    ...auditColumns,
  },
  (table) => [
    // The admin list: open ahead of resolved, newest first.
    index('support_requests_status_created_idx')
      .on(table.status, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ],
);
