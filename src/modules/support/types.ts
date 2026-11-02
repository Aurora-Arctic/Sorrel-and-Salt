import type { supportReplies } from './schema/support-replies';
import type { supportRequests } from './schema/support-requests';
import type { supportTimeouts } from './schema/support-timeouts';

export type { StandingTimeout, SupportRequestFilter, SupportViewCounts } from '../../db/repository';

export type SupportRequestRow = typeof supportRequests.$inferSelect;
export type SupportReplyRow = typeof supportReplies.$inferSelect;
export type SupportTimeoutRow = typeof supportTimeouts.$inferSelect;

export type SupportAbout = SupportRequestRow['about'];
export type SupportStatus = SupportRequestRow['status'];

/**
 * The origin a support mail links from, which the mail job carries. Built per request by the GraphQL context, because a service
 * may not import the origin resolution the link needs.
 */
export interface SupportNotifier {
  /** The origin a mailed link is built on, which a job that mails later carries with it. @throws {Error} where none resolves. */
  origin(): Promise<string>;
}

/** One received or resolved mail, as its job carries it: the request id and the origin, and nothing of the sender's. */
export type SupportStatusMail = {
  kind: 'received' | 'resolved';
  requestId: string;
  origin: string;
};

/** What the Support dialog offers a visitor: `until` is set only for a dated `timedOut`, and null for one with no end date. */
export interface SupportDialogAnswer {
  kind: 'signedOut' | 'unverified' | 'timedOut' | 'form';
  until: Date | null;
}
