import type { Route } from 'next';
import type { SupportAboutParam, SupportSenderGroup, SupportView } from '../../lib/support-path';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export type SupportAbout = SupportAboutParam;
export type SupportStatus = 'open' | 'waiting_on_sender' | 'resolved' | 'closed';

export interface SupportPerson {
  id: string;
  name: string;
}

export interface SupportSender extends SupportPerson {
  email: string | null;
}

export interface SupportRequestEntry {
  id: string;
  about: SupportAbout;
  subject: string;
  status: SupportStatus;
  sender: SupportSender | null;
  signedOut: boolean;
  anonymised: boolean;
  assignee: SupportPerson | null;
  curatorVisible: boolean;
  errorCode: number | null;
  errorReference: string | null;
  createdAt: Date;
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
  until: Date | null;
  note: string;
  liftedAt: Date | null;
  createdAt: Date;
  setBy: SupportPerson | null;
  liftedBy: SupportPerson | null;
}

export interface SupportRequestDetailEntry extends SupportRequestEntry {
  message: string;
  path: string | null;
  issueUrl: string | null;
  resolvedBy: SupportPerson | null;
  resolvedAt: Date | null;
  replies: SupportReplyEntry[];
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
