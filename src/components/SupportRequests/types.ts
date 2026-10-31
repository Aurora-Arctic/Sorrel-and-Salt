import type { Route } from 'next';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export type SupportKind = 'accessibility' | 'bug' | 'question';
export type SupportStatus = 'open' | 'resolved';

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
  kind: SupportKind;
  subject: string;
  status: SupportStatus;
  sender: SupportSender | null;
  assignee: SupportPerson | null;
  curatorVisible: boolean;
  errorCode: number | null;
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
}

/** A request opened to its message, replies and, for an admin, the sender's time-outs. */
export interface SupportRequestDetailEntry extends SupportRequestEntry {
  message: string;
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
  /** Blank is every kind. */
  kind: SupportKind | '';
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
}

/** What Create Issue writes into the new issue: never the sender. */
export interface IssueLinkRequest {
  id: string;
  subject: string;
  message: string;
  path: string | null;
}
