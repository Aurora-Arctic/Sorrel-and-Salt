import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { SIGNED_OUT_SENDER_ID } from '../../../lib/support-sender';
import { idColumn } from '../../../db/schema-parts';
import { auditColumns, users } from '../../identity/schema/users';

export const supportRequestAbout = pgEnum('support_request_about', [
  'accessibility',
  'bug',
  'account',
  'compendium',
  'privacy',
  'feedback',
  'question',
]);
export const supportRequestStatus = pgEnum('support_request_status', [
  'open',
  'waiting_on_sender',
  'resolved',
  'closed',
]);

// A message a signed-in account sends to whoever runs the site. The sender is `created_by`, so no second sender column can drift from it,
// and there is no workspace id: a request is the account's, not a coven's.
export const supportRequests = pgTable(
  'support_requests',
  {
    id: idColumn(),
    about: supportRequestAbout('about').notNull(),
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
    // When the sender last wrote, and when staff last replied or noted; the admin views sort on the first.
    lastSenderActivityAt: timestamp('last_sender_activity_at'),
    lastStaffActivityAt: timestamp('last_staff_activity_at'),
    closedAt: timestamp('closed_at'),
    // The closed request this one follows up, when a sender wrote on a closed one.
    linkedFrom: uuid('linked_from').references((): AnyPgColumn => supportRequests.id),
    // The digest Next gives an error page, so a request can be matched to the server log line.
    errorReference: text('error_reference'),
    // The address of a signed-out visitor who sent this; null on a request an account sent.
    senderEmail: text('sender_email'),
    ...auditColumns,
  },
  (table) => [
    // A request belongs to an account or to an address, never both: the signed-out sender account stands as `created_by` exactly when an address is set.
    check(
      'support_requests_one_sender',
      sql`(${table.senderEmail} is not null) = (${table.createdBy} = ${sql.raw(`'${SIGNED_OUT_SENDER_ID}'`)})`,
    ),
    // The admin list: open ahead of resolved, newest first.
    index('support_requests_status_created_idx')
      .on(table.status, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
    // The Needs Staff view: a status, oldest sender activity first.
    index('support_requests_status_sender_activity_idx')
      .on(table.status, table.lastSenderActivityAt)
      .where(sql`${table.deletedAt} is null`),
    // Retention reads closed requests by when they closed.
    index('support_requests_closed_at_idx').on(table.closedAt),
  ],
);
