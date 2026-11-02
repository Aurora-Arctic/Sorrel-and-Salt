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
>;

/** One live coven the user belongs to, as the service answered it. */
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
  /** The user's support time-outs, newest first; the Time-Out section shows when this is given. */
  timeouts?: SupportTimeoutEntry[];
  /**
   * The user's access pauses, newest first; the Site Access section shows when this is given, which is never for the
   * primary admin or the viewing admin's own account.
   */
  pauses?: AccessPauseEntry[];
  /** Whether impersonation is registered here; off by default. */
  canImpersonate?: boolean;
  /**
   * Whether admin changes are locked for the viewing admin, as the list reads it: the role
   * and creation controls then say why they cannot be used.
   */
  changesPaused?: boolean;
}

/** An account named on a pause: who set it or lifted it. */
export interface AccessPausePerson {
  id: string;
  name: string;
}

/** One pause on a user's access to the site, as the user modal draws it. */
export interface AccessPauseEntry {
  id: string;
  /** When the pause ends by itself; null for a pause with no end date. */
  until: Date | null;
  note: string | null;
  /** When it was set. */
  createdAt: Date;
  liftedAt: Date | null;
  /** The admin who set it; null if no live account holds the id. */
  setBy: AccessPausePerson | null;
  /** The admin who lifted it; null while it stands, or if no live account holds the id. */
  liftedBy: AccessPausePerson | null;
}

/** How long a pause is set for: a day, a week or a month from now, until a picked day, or with no end date. */
export type PauseSpan = 'day' | 'week' | 'month' | 'date' | 'none';

/** The fields that set a pause, held by the form that draws them. */
export interface PauseFieldsProps {
  span: PauseSpan;
  onSpan: (span: PauseSpan) => void;
  /** The picked day, `YYYY-MM-DD`, read only when `span` is `date`. */
  day: string;
  onDay: (day: string) => void;
  note: string;
  onNote: (note: string) => void;
  /** Who reads the note, beneath the field. */
  noteHint: string;
  notePlaceholder: string;
}
