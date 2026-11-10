import type { Route } from 'next';
import type { SupportAboutParam, SupportSenderGroup, SupportView } from '../../lib/support-path';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export type SupportAbout = SupportAboutParam;
export type SupportStatus = 'open' | 'waiting_on_sender' | 'resolved' | 'closed';

export interface SupportPerson {
  id: string;
  name: string;
}

/** The account that sent a request: named, with the address a keeper replies to; a curator
 * is given none. */
export interface SupportSender extends SupportPerson {
  email: string | null;
}

export interface SupportRequestEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  status: SupportStatus;
  sender: SupportSender | null;
  /** Sent by a signed-out visitor: the sender is a shared stand-in account and `sender.email`
   * is the visitor's own address. */
  signedOut: boolean;
  anonymised: boolean;
  assignee: SupportPerson | null;
  curatorVisible: boolean;
  errorCode: number | null;
  errorReference: string | null;
  createdAt: Date;
  /** When the sender last wrote on it: their newest message, or the request itself when it
   * has no follow-up. */
  lastFromSenderAt: Date;
  senderReplied: boolean;
  betaTester: boolean;
  /** It is resolved, and the sender resolved it themselves rather than staff. */
  resolvedBySender: boolean;
}

export interface SupportReplyEntry {
  id: string;
  body: string;
  author: SupportPerson | null;
  createdAt: Date;
  /** A staff-only note: never sent to the sender. */
  internal: boolean;
  fromSender: boolean;
}

export interface SupportTimeoutEntry {
  id: string;
  /** When the time-out ends by itself; null for one with no end date. */
  until: Date | null;
  note: string;
  liftedAt: Date | null;
  createdAt: Date;
  /** The keeper who set it; null if no live account holds the id. */
  setBy: SupportPerson | null;
  /** The keeper who lifted it; null while it stands, or if no live account holds the id. */
  liftedBy: SupportPerson | null;
}

/** A request's assignee, as its detail gives it: `paused` while a site access pause stands on them, which leaves them out of the picker. */
export interface SupportAssignee extends SupportPerson {
  paused?: boolean;
}

export interface SupportRequestDetailEntry extends SupportRequestEntry {
  assignee: SupportAssignee | null;
  message: string;
  path: string | null;
  issueUrl: string | null;
  resolvedBy: SupportPerson | null;
  resolvedAt: Date | null;
  replies: SupportReplyEntry[];
  /** Past and active, newest first; empty for a curator, who is not shown them. */
  timeouts: SupportTimeoutEntry[];
}

export interface SupportRequestsFilter {
  about: SupportAbout | '';
  view: SupportView;
  errorCode: string;
  sender: SupportSenderGroup | '';
}

export interface SupportRequestsCursor {
  after?: string;
  before?: string;
}

export interface SupportViewer {
  id: string;
  role: 'admin' | 'curator';
}

export interface SupportRequestsProps extends Partial<PagerHrefs<Route>> {
  requests: SupportRequestEntry[];
  viewer: SupportViewer;
  filter?: SupportRequestsFilter;
  cursor?: SupportRequestsCursor;
  position?: PagePosition;
  opened?: SupportRequestDetailEntry;
  assignees?: SupportPerson[];
}

export interface SupportRequestsFilterProps {
  filter: SupportRequestsFilter;
}

export interface SupportDetailProps {
  request: SupportRequestDetailEntry;
  viewer: SupportViewer;
  assignees: SupportPerson[];
  userHref?: (id: string) => Route;
}
