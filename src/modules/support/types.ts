import type { supportReplies } from './schema/support-replies';
import type { supportRequests } from './schema/support-requests';
import type { supportTimeouts } from './schema/support-timeouts';

export type { SupportRequestFilter, SupportViewCounts } from '../../db/repository';

export type SupportRequestRow = typeof supportRequests.$inferSelect;
export type SupportReplyRow = typeof supportReplies.$inferSelect;
export type SupportTimeoutRow = typeof supportTimeouts.$inferSelect;

export type SupportAbout = SupportRequestRow['about'];
export type SupportStatus = SupportRequestRow['status'];

/**
 * How the received and resolved mails reach the sender, and the origin a job's mail links from. Built per request by the GraphQL context, as `InvitationSender` is, because a service
 * may not import the origin resolution the link needs.
 */
export interface SupportNotifier {
  /** The origin a mailed link is built on, which a job that mails later carries with it. @throws {Error} where none resolves. */
  origin(): Promise<string>;
  /** Mails the sender that the request arrived, with the 5-working-day promise. `requestId` is null for a signed-out sender, whose mail links to the support page. Never throws on a failed send. */
  received(to: string, subject: string, requestId: string | null): Promise<void>;
  /** Mails the sender that the request is resolved and that a reply reopens it. `requestId` is null for a signed-out sender. Never throws on a failed send. */
  resolved(to: string, subject: string, requestId: string | null): Promise<void>;
}

/** What the Support dialog offers a visitor: `until` is set only for `timedOut`. */
export interface SupportDialogAnswer {
  kind: 'signedOut' | 'unverified' | 'timedOut' | 'form';
  until: Date | null;
}
