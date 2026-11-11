import type { Route } from 'next';
import type { ReactElement } from 'react';
import type { ModalHeading } from '../Modal/types';
import type { UserRole } from '../../lib/session';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export interface UserListEntry {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  canCreateWorkspace: boolean;
  createdAt: Date;
  /** The numbers of the terms, disclaimer and code of ethics versions they agreed to most recently; null when they never agreed. */
  agreedTermsVersion: number | null;
  agreedDisclaimerVersion: number | null;
  agreedEthicsVersion: number | null;
  providers: readonly string[];
  /** Whether they hold at least one passkey, which is not an account and so not among the providers. */
  hasPasskey: boolean;
  emailVerified: boolean;
  primaryAdmin: boolean;
  openHref: Route;
  heading: ModalHeading;
  /** The support time-out standing on them, `until` null for one with no end; absent when none stands. */
  supportTimeout?: { until: Date | null };
  /** The pause standing on their site access, `until` null for one with no end; absent when none stands. */
  accessPause?: { until: Date | null };
}

export interface UserListProps extends Partial<PagerHrefs<Route>> {
  users: readonly UserListEntry[];
  /** The name-or-email filter as asked, blank for none. */
  query: string;
  /** Whether the list is narrowed to the users awaiting approval. */
  awaitingApproval: boolean;
  /** The role the list is narrowed to, absent for every role. */
  role?: UserRole;
  /** Whether the list is narrowed to the users a support time-out stands on. */
  timedOut?: boolean;
  paused?: boolean;

  position?: PagePosition;
  /** Whether impersonation is registered here, so each non-keeper row offers it. */
  canImpersonate?: boolean;
}

export interface UserListFilterProps {
  query: string;
  awaitingApproval: boolean;
  role?: UserRole;
  timedOut?: boolean;
  paused?: boolean;
}

export type UserListFilterValue = UserListFilterProps;

export interface HistoryLinkProps {
  email: string;
  /** The user's name, completing the link's accessible name. */
  name: string;
}

export interface ImpersonateButtonProps {
  userId: string;
  /** The user's name, completing the button's accessible name. */
  name: string;
}

/** What a row's creation control does: approve a user awaiting it, or revoke it. */
type CreationAction = 'approve' | 'revoke';

/** What a row's role control does: make a user a keeper, or stop one being one. */
export interface RoleControlProps {
  userId: string;
  /** The user's name, completing the button's accessible name and the question. */
  name: string;
  /** Whether the user's address is verified; a promotion warns when it is not. */
  emailVerified: boolean;
  /** Whether this is the primary keeper, whose Change Role says why it cannot be used. */
  primaryAdmin: boolean;
  /**
   * Whether keeper changes are paused for the viewing admin: paused,
   * and the viewer not the primary keeper, whom the pause exempts. Change
   * Role then says why it cannot be used.
   */
  paused?: boolean;
  role: UserRole;
  /** Drawn in the user's modal, so it asks over the modal's body. */
  inModal?: boolean;
}

export interface CreationControlProps {
  userId: string;
  /** The user's name, completing the button's accessible name and the question. */
  name: string;
  emailVerified: boolean;
  /**
   * Whether keeper changes are paused for the viewing keeper, coven creation
   * included: its Approve or Revoke then
   * says why it cannot be used.
   */
  paused?: boolean;
  action: CreationAction;
  /** Drawn in the user's modal, so it asks over the modal's body. */
  inModal?: boolean;
}

export interface PauseControlProps {
  paused: boolean;
  canToggle: boolean;
}

export interface LockedControlProps {
  label: string;
  accessibleName?: string;
  className: string;
  reason: string;
}

export interface ProviderLogoProps {
  id: string;
}

export type SignInMarksProps = Pick<UserListEntry, 'providers' | 'hasPasskey'>;

export interface OwnLoginMarkProps {
  label: string;
  icon: ReactElement;
}

export interface UntilMarkProps {
  standing: string;
  /** When it ends; null for none. */
  until: Date | null;
}

export interface MarkProps {
  value: boolean;
  label: string;
  hint?: boolean;
  tip?: string;
}
