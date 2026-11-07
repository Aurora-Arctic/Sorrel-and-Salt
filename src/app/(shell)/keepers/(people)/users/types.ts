import type { Route } from 'next';
import type { ModalHeading } from '../../../../../components/Modal/types';
import type { AccessPauseEntry } from '../../../../../components/UserDetail/types';
import type { SupportTimeoutEntry } from '../../../../../components/SupportRequests/types';
import type { UserCoven, UserDetailUser } from '../../../../../components/UserDetail/types';

export interface AdminUsersPageProps {
  searchParams: Promise<UsersSearchParams>;
}

export interface UsersSearchParams {
  query?: string | string[];
  awaiting?: string | string[];
  role?: string | string[];
  'timed-out'?: string | string[];
  paused?: string | string[];
  after?: string | string[];
  before?: string | string[];
  user?: string | string[];
  /** The screen that opened the modal, where Close goes back to; none for the list itself. */
  from?: string | string[];
}

export interface OpenedUser {
  heading: ModalHeading;
  user: UserDetailUser;
  memberships: readonly UserCoven[];
  timeouts: SupportTimeoutEntry[];
  /** The user's access pauses; undefined for the primary keeper and the admin's own account, which no one pauses. */
  pauses: AccessPauseEntry[] | undefined;
}

export interface UserDialogProps {
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedUser;
  canImpersonate: boolean;
  changesPaused: boolean;
  /** The modal place it shows in, where the page has another modal; unnamed on the Users page. */
  place?: string;
}
