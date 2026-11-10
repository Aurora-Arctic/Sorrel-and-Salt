import type { SupportDialogKind } from '../../lib/support-path';
import type { supportReplies } from './schema/support-replies';
import type { supportRequests } from './schema/support-requests';
import type { supportTimeouts } from './schema/support-timeouts';

export type { StandingTimeout, SupportRequestFilter } from '../../db/repository';

export type SupportRequestRow = typeof supportRequests.$inferSelect;
export type SupportReplyRow = typeof supportReplies.$inferSelect;
export type SupportTimeoutRow = typeof supportTimeouts.$inferSelect;

export type SupportAbout = SupportRequestRow['about'];
export type SupportStatus = SupportRequestRow['status'];

/**
 * The origin a support time-out mail links from, which the mail job carries. Handed to the service by the GraphQL context, because
 * a service may not import the origin resolution the link needs.
 */
export interface TimeoutNotifier {
  /** The origin a mailed link is built on. @throws {Error} where none resolves. */
  origin(): Promise<string>;
}

export type SupportTimeoutMail = {
  kind: 'support-time-out';
  timeoutId: string;
  origin: string;
};

export interface SupportNotifier {
  /** The origin a mailed link is built on, which a job that mails later carries with it. @throws {Error} where none resolves. */
  origin(): Promise<string>;
}

export type SupportStatusMail = {
  kind: 'received' | 'resolved';
  requestId: string;
  origin: string;
};

export type RetentionStage = 'notice' | 'close' | 'anonymise';

/**
 * What one support-retention batch run is given: its stage, its page of request ids, the job's `now` in milliseconds, so every
 * batch of one day reads the same cutoffs, and the origin the notices link from. Ids, a kind, a number and the site origin.
 */
export interface RetentionBatch {
  kind: RetentionStage;
  ids: string[];
  now: number;
  origin: string;
}

/** What the Support dialog offers a visitor: `until` is set only for a dated `timedOut`, and null for one with no end date. */
export interface SupportDialogAnswer {
  kind: SupportDialogKind;
  until: Date | null;
}

/** What the mailed-link page shows of a signed-out request: its public thread and nothing staff hold, with no address, token or hash. */
export type SupportRequestView = Pick<
  SupportRequestRow,
  'id' | 'about' | 'status' | 'subject' | 'message' | 'createdAt'
> & {
  replies: Pick<SupportReplyRow, 'id' | 'authorRole' | 'body' | 'createdAt'>[];
};
