import type { supportReplies } from './schema/support-replies';
import type { supportRequests } from './schema/support-requests';
import type { supportTimeouts } from './schema/support-timeouts';

export type { SupportRequestFilter } from '../../db/repository';

export type SupportRequestRow = typeof supportRequests.$inferSelect;
export type SupportReplyRow = typeof supportReplies.$inferSelect;
export type SupportTimeoutRow = typeof supportTimeouts.$inferSelect;

export type SupportAbout = SupportRequestRow['about'];
export type SupportStatus = SupportRequestRow['status'];

/**
 * How a reply's notice reaches the sender. Built per request by the GraphQL context, as `InvitationSender` is, because a service
 * may not import the origin resolution the link needs.
 */
export interface SupportNotifier {
  /** Mails `to` that a reply to the request headed `subject` is waiting on `/account/support`. Carries no reply text; never throws on a failed send. */
  replyWaiting(to: string, subject: string): Promise<void>;
}
