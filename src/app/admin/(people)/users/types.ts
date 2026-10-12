import type { Route } from 'next';
import type { ModalHeading } from '../../../../components/Modal/types';
import type { UserCoven, UserDetailUser } from '../../../../components/UserDetail/types';

export interface AdminUsersPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<UsersSearchParams>;
}

/** The page's address: the filter, at most one cursor, and the user whose modal is open. */
export interface UsersSearchParams {
  query?: string | string[];
  awaiting?: string | string[];
  role?: string | string[];
  after?: string | string[];
  before?: string | string[];
  /** The id of the user whose modal is open over the list (M9.19). */
  user?: string | string[];
}

/** The user `?user=` opens, as the page read them: the modal's head and its body's props. */
export interface OpenedUser {
  heading: ModalHeading;
  user: UserDetailUser;
  memberships: readonly UserCoven[];
}

export interface UserDialogProps {
  /** The list the modal opened over, its filter and cursor kept: closing returns there. */
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way (M9.18). */
  opened?: OpenedUser;
  /** Whether impersonation is registered here, so the body offers it (MB.53). */
  canImpersonate: boolean;
  /** Whether admin changes are locked for this admin (MB.63), as the list's controls read it. */
  changesPaused: boolean;
}
