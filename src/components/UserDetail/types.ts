import type { ReactNode } from 'react';
import type { WorkspaceRole } from '@/modules/coven';
import type { SupportTimeoutEntry } from '../SupportRequests/types';
import type { UserListEntry } from '../UserList/types';

/**
 * The user the modal is open on: the row's own facts, which the body shows again in full, and
 * what Impersonate needs. One definition with the list's, so a fact added to the table reaches
 * the modal.
 */
export type UserDetailUser = Pick<
  UserListEntry,
  | 'id'
  | 'name'
  | 'email'
  | 'emailVerified'
  | 'role'
  | 'primaryAdmin'
  | 'canCreateWorkspace'
  | 'providers'
  | 'createdAt'
  | 'agreedTermsVersion'
  | 'agreedDisclaimerVersion'
  | 'agreedEthicsVersion'
>;

export interface UserCoven {
  workspaceId: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface UserDetailProps {
  user: UserDetailUser;
  memberships: readonly UserCoven[];
  timeouts?: SupportTimeoutEntry[];
  /**
   * The user's access pauses, newest first; the Site Access section shows when this is given, which is never for the
   * primary keeper or the viewing admin's own account.
   */
  pauses?: AccessPauseEntry[];
  canImpersonate?: boolean;
  /**
   * Whether keeper changes are locked for the viewing keeper, as the list reads it: the role
   * and creation controls then say why they cannot be used.
   */
  changesPaused?: boolean;
}

export interface AccessPausePerson {
  id: string;
  name: string;
}

export interface AccessPauseEntry {
  id: string;
  /** When it ends by itself; null for a pause with no end date. */
  until: Date | null;
  note: string | null;
  createdAt: Date;
  liftedAt: Date | null;
  /** The keeper who set it; null if no live account holds the id. */
  setBy: AccessPausePerson | null;
  /** The keeper who lifted it; null while it stands, or if no live account holds the id. */
  liftedBy: AccessPausePerson | null;
}

/** How long a pause is set for: a day, a week or a month from now, until a picked day, or with no end date. */
export type PauseSpan = 'day' | 'week' | 'month' | 'date' | 'none';

export interface PauseFieldsProps {
  span: PauseSpan;
  onSpan: (span: PauseSpan) => void;
  /** The picked day, `YYYY-MM-DD`, read only when `span` is `date`. */
  day: string;
  onDay: (day: string) => void;
  note: string;
  onNote: (note: string) => void;
  noteHint: string;
  notePlaceholder: string;
  /** Marks the note and the message required, for a sanction that must say why: a site pause or a support time-out, never a coven pause. */
  noteRequired?: boolean;
  message: string;
  onMessage: (message: string) => void;
  messageLabel: string;
  messagePlaceholder: string;
}

export type StandingPause = Pick<AccessPauseEntry, 'until'> &
  Partial<Pick<AccessPauseEntry, 'note' | 'createdAt' | 'setBy'>>;

export interface PausePanelCopy {
  noteHint: string;
  notePlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  /** The question Pause Access asks, given the end chosen; null for no end date. */
  pauseQuestion: (end: Date | null) => ReactNode;
  liftQuestion: (until: Date | null) => ReactNode;
  paused: string;
  lifted: string;
}

export interface PausePanelProps {
  title: string;
  name: string;
  standing: StandingPause | undefined;
  earlier: readonly AccessPauseEntry[];
  copy: PausePanelCopy;
  /** Marks the note and the message required and holds Pause Access until both have text: a site pause needs one, a coven pause does not. */
  noteRequired?: boolean;
  /** Sends the pause, until an end or with none, with its note. */
  pause: (until: Date | null, note: string | undefined, message: string | null) => Promise<unknown>;
  lift: () => Promise<unknown>;
  onChanged?: () => void;
}
