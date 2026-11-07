import type { Route } from 'next';
import type { ReactNode, RefObject } from 'react';
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
  query: string;
  awaitingApproval: boolean;
  role?: UserRole;
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
  name: string;
}

export interface UserLinkProps {
  href: Route;
  heading: ModalHeading;
  name: string;
}

export interface ImpersonateButtonProps {
  userId: string;
  name: string;
}

export type CreationAction = 'approve' | 'revoke';

export type ConfirmStep = 'idle' | 'confirming' | 'sending';

export interface ConfirmedActionProps {
  label: string;
  accessibleName: string;
  confirmLabel?: string;
  openClass: string;
  disabled?: boolean;
  confirmDisabled?: boolean;
  title: string;
  question: ReactNode;
  warning?: string;
  busy: string;
  confirmClass: string;
  withNote?: boolean;
  send: (note?: string) => Promise<unknown>;
  onSent?: () => void;
  refusal?: string | ((error: unknown) => string);
  announcement?: string;
  choices?: ReactNode | ((sending: boolean) => ReactNode);
  closeOnSent?: boolean;
  /**
   * Drawn inside the user's modal: asks through its confirm layer and says a refusal in a plain notice, unless `refusalInModal` says otherwise
   * (claude-docs/components/user-list.md, "Contracts").
   */
  inModal?: boolean;
  /**
   * How a refusal is said inside a modal: a plain notice (default), or the callout under the control; outside a modal it is always the callout
   * (claude-docs/components/user-list.md, "Contracts").
   */
  refusalInModal?: 'notice' | 'callout';
}

export interface ConfirmAnswersProps {
  label: string;
  busy: string;
  confirmClass: string;
  /** The warning's id, which the confirm is described by; none without one. */
  describedBy?: string;
  sending: boolean;
  disabled?: boolean;
  confirmRef: RefObject<HTMLButtonElement | null>;
  cancelRef: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}

/** What a row's role control does: make a user a keeper, or stop one being one. */
export interface RoleControlProps {
  userId: string;
  name: string;
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

export interface UntilMarkProps {
  standing: string;
  until: Date | null;
}

export interface MarkProps {
  value: boolean;
  label: string;
  hint?: boolean;
  tip?: string;
}
