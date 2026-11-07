import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';
import type { UserRole } from '../../lib/session';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** One listed user: the row's own facts and the providers read beside it. */
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
  /** Provider ids, as the service sorted them. */
  providers: readonly string[];
  emailVerified: boolean;
  /** Whether this is the primary keeper, whom no one can revoke. */
  primaryAdmin: boolean;
  /** This page with the user’s modal open over it, `?user=<id>`. */
  openHref: Route;
  /** The modal’s head, shown at once on a press: the one the loaded modal carries. */
  heading: ModalHeading;
  /** The support time-out standing on them, `until` null for one with no end; absent when none stands. */
  supportTimeout?: { until: Date | null };
  /** The pause standing on their site access, `until` null for one with no end; absent when none stands. */
  accessPause?: { until: Date | null };
}

export interface UserListProps extends Partial<PagerHrefs<Route>> {
  /** This page's users, in the list's order. */
  users: readonly UserListEntry[];
  /** The name-or-email filter as asked, blank for none. */
  query: string;
  /** Whether the list is narrowed to the users awaiting approval. */
  awaitingApproval: boolean;
  /** The role the list is narrowed to, absent for every role. */
  role?: UserRole;
  /** Whether the list is narrowed to the users a support time-out stands on. */
  timedOut?: boolean;
  /** Whether the list is narrowed to the users a site access pause stands on. */
  paused?: boolean;

  /** Where this page stands, the pager's "Page X of Y"; none when left out. */
  position?: PagePosition;
  /** Whether impersonation is registered here, so each non-keeper row offers it. */
  canImpersonate?: boolean;
}

/** The filter the page shows, which the form starts from and compares against. */
export interface UserListFilterProps {
  query: string;
  awaitingApproval: boolean;
  role?: UserRole;
  timedOut?: boolean;
  paused?: boolean;
}

/** The filter as the address carries it: what `userListHref` writes. */
export type UserListFilterValue = UserListFilterProps;

/** A row's link to its user's privilege history. */
export interface HistoryLinkProps {
  /** The user's address, which the ledger's search is opened with. */
  email: string;
  /** The user's name, completing the link's accessible name. */
  name: string;
}

/** A row’s name, the link that opens its user’s modal. */
export interface UserLinkProps {
  href: Route;
  heading: ModalHeading;
  name: string;
}

export interface ImpersonateButtonProps {
  userId: string;
  /** The user's name, completing the button's accessible name. */
  name: string;
}

/** What a row's creation control does: approve a user awaiting it, or revoke it. */
export type CreationAction = 'approve' | 'revoke';

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
  /** The role the user holds now, which Change Role does not offer. */
  role: UserRole;
  /** Drawn in the user's modal, so it asks over the modal's body. */
  inModal?: boolean;
}

export interface CreationControlProps {
  userId: string;
  /** The user's name, completing the button's accessible name and the question. */
  name: string;
  /** Whether the user's address is verified; Approve warns when it is not. */
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

/** The pause on keeper grants and revokes, as the page read it. */
export interface PauseControlProps {
  paused: boolean;
  /** Whether the viewing keeper is the primary keeper, the only one who may flip it. */
  canToggle: boolean;
}

/** A control in view but unusable, and the reason it says why. */
export interface LockedControlProps {
  label: string;
  /** The button's accessible name, opening with `label`. */
  accessibleName?: string;
  className: string;
  reason: string;
}

/** A linked sign-in provider in the Logins cell, by its roster id. */
export interface ProviderLogoProps {
  id: string;
}

/** A yes-or-no drawn as a check or a cross, with its word for a screen reader. */
export interface UntilMarkProps {
  /** What stands, opening the hidden text: "Timed out" or "Paused". */
  standing: string;
  /** When it ends; null for none. */
  until: Date | null;
}

export interface MarkProps {
  value: boolean;
  /** The word the mark stands for: "Verified", "Yes". */
  label: string;
  /** Whether a tip bubble shows the word on hover too, where the heading does not say it. */
  hint?: boolean;
  /** The tip bubble's own words, where they differ from `label`; a bubble shows them on hover. */
  tip?: string;
}
