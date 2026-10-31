import type { Route } from 'next';
import type { SupportAboutParam } from '../../lib/support-path';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export type SupportAbout = SupportAboutParam;
export type SupportStatus = 'open' | 'waiting_on_sender' | 'resolved' | 'closed';

/** An account named on a request, as the page shows it. */
export interface SupportPerson {
  id: string;
  name: string;
}

/** The account that sent a request: named, with the address staff reply to. */
export interface SupportSender extends SupportPerson {
  email: string;
}

/** One row of the list. */
export interface SupportRequestEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  status: SupportStatus;
  sender: SupportSender | null;
  assignee: SupportPerson | null;
  curatorVisible: boolean;
  errorCode: number | null;
  /** The error page's digest, to match the server log. */
  errorReference: string | null;
}

export interface SupportReplyEntry {
  id: string;
  body: string;
  author: SupportPerson | null;
  createdAt: Date;
}

export interface SupportTimeoutEntry {
  id: string;
  until: Date;
  note: string | null;
  liftedAt: Date | null;
  /** When it was set. */
  createdAt: Date;
  /** The admin who set it; null if no live account holds the id. */
  setBy: SupportPerson | null;
  /** The admin who lifted it; null while it stands, or if no live account holds the id. */
  liftedBy: SupportPerson | null;
}

/** A request opened to its message, replies and, for an admin, the sender's time-outs. */
export interface SupportRequestDetailEntry extends SupportRequestEntry {
  message: string;
  /** When it was sent. */
  createdAt: Date;
  path: string | null;
  issueUrl: string | null;
  resolvedBy: SupportPerson | null;
  resolvedAt: Date | null;
  replies: SupportReplyEntry[];
  /** Past and active, newest first; empty for a curator, who is not shown them. */
  timeouts: SupportTimeoutEntry[];
}

/** What the list is narrowed by, as its address carries it. */
export interface SupportRequestsFilter {
  /** Blank is everything. */
  about: SupportAbout | '';
  /** Blank is every status. */
  status: SupportStatus | '';
  /** An HTTP status, as typed; blank is none. */
  errorCode: string;
}

export interface SupportRequestsCursor {
  after?: string;
  before?: string;
}

/** Who is looking: what they may do follows the role, and a curator's reply follows the assignment. */
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
  /** The request `?request=` opens; none when the address names none. */
  opened?: SupportRequestDetailEntry;
  /** The curators and admins a request may be assigned to. */
  assignees?: SupportPerson[];
}

export interface SupportRequestsFilterProps {
  filter: SupportRequestsFilter;
}

export interface SupportDetailProps {
  request: SupportRequestDetailEntry;
  viewer: SupportViewer;
  assignees: SupportPerson[];
  /** The address that opens a user's modal over this page; none for a curator, who has no user modal. */
  userHref?: (id: string) => Route;
}
