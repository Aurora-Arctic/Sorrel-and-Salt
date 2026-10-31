import type { Route } from 'next';
import type { ReactNode, RefObject } from 'react';
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
  /** Provider ids, as the service sorted them. */
  providers: readonly string[];
  emailVerified: boolean;
  /** Whether this is the primary admin, whom no one can revoke. */
  primaryAdmin: boolean;
  /** This page with the user’s modal open over it, `?user=<id>`. */
  openHref: Route;
  /** The modal’s head, shown at once on a press: the one the loaded modal carries. */
  heading: ModalHeading;
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

  /** Where this page stands, the pager's "Page X of Y"; none when left out. */
  position?: PagePosition;
  /** Whether impersonation is registered here, so each non-admin row offers it. */
  canImpersonate?: boolean;
  /**
   * The pause on admin changes and whether this admin may flip it:
   * while paused, a viewer who may not has every Change Role locked. The
   * switch itself is the page's, beside its heading.
   */
  adminChanges?: PauseControlProps;
}

/** The filter the page shows, which the form starts from and compares against. */
export interface UserListFilterProps {
  query: string;
  awaitingApproval: boolean;
  role?: UserRole;
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

/** Where a confirmed action is: offering itself, asking to confirm, or waiting on the answer. */
export type ConfirmStep = 'idle' | 'confirming' | 'sending';

/**
 * An action that asks first, in a modal: what its button and the modal say,
 * and the write it sends. The creation and role controls, Impersonate, the
 * pause switch and the invitations' Revoke each build one.
 */
export interface ConfirmedActionProps {
  /** The row's button and the modal's confirm, one word or two. */
  label: string;
  /** The row's button's accessible name, opening with `label`. */
  accessibleName: string;
  /** The modal's confirm, when it says something other than the row's button does. */
  confirmLabel?: string;
  openClass: string;
  /** The row's button is off, for a form whose answer is not yet complete. */
  disabled?: boolean;
  /** The modal's heading, in title case. */
  title: string;
  /** The modal's question, the user's name in bold. */
  question: ReactNode;
  /** A warning under the question, which the confirm is described by; none when absent. */
  warning?: string;
  /** The confirm's label while the write is out. */
  busy: string;
  confirmClass: string;
  /** Whether the modal offers an optional reason, sent with the write. */
  withNote?: boolean;
  /** The write; `note` is the reason as typed, trimmed, or absent. A refusal rejects. */
  send: (note?: string) => Promise<unknown>;
  /** What follows a success, the confirm still busy; absent, the page is read again. */
  onSent?: () => void;
  /**
   * The sentence a refusal shows; absent, the service's own, read from the
   * GraphQL error.
   */
  refusal?: string | ((error: unknown) => string);
  /**
   * Said in the page's status region after a success, for a screen reader:
   * the result the page then shows, in words. Absent for a control whose
   * success leaves the page, which says it by arriving.
   */
  announcement?: string;
  /** A choice the modal asks beside the question, such as a role to move to; the caller holds its state. */
  choices?: ReactNode | ((sending: boolean) => ReactNode);
  /** Close the modal on success, for a control the re-read does not replace. */
  closeOnSent?: boolean;
  /**
   * Drawn inside the user's modal: asks through its confirm layer and says a refusal in a plain notice, unless `refusalInModal` says otherwise
   * (claude-docs/components/user-list.md, "Inside a modal").
   */
  inModal?: boolean;
  /**
   * How a refusal is said inside a modal: a plain notice (default), or the callout under the control; outside a modal it is always the callout
   * (claude-docs/components/user-list.md, "Inside a modal").
   */
  refusalInModal?: 'notice' | 'callout';
}

/** `ConfirmedAction`'s confirm and Cancel, under its question. */
export interface ConfirmAnswersProps {
  label: string;
  busy: string;
  confirmClass: string;
  /** The warning's id, which the confirm is described by; none without one. */
  describedBy?: string;
  sending: boolean;
  confirmRef: RefObject<HTMLButtonElement | null>;
  cancelRef: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}

/** What a row's role control does: make a user an admin, or stop one being one. */
export interface RoleControlProps {
  userId: string;
  /** The user's name, completing the button's accessible name and the question. */
  name: string;
  /** Whether the user's address is verified; a promotion warns when it is not. */
  emailVerified: boolean;
  /** Whether this is the primary admin, whose Change Role says why it cannot be used. */
  primaryAdmin: boolean;
  /**
   * Whether admin changes are paused for the viewing admin: paused,
   * and the viewer not the primary admin, whom the pause exempts. Change
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
   * Whether admin changes are paused for the viewing admin, coven creation
   * included: its Approve or Revoke then
   * says why it cannot be used.
   */
  paused?: boolean;
  action: CreationAction;
  /** Drawn in the user's modal, so it asks over the modal's body. */
  inModal?: boolean;
}

/** The pause on admin grants and revokes, as the page read it. */
export interface PauseControlProps {
  paused: boolean;
  /** Whether the viewing admin is the primary admin, the only one who may flip it. */
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

/** A linked sign-in provider in the Sign-In Methods cell, by its roster id. */
export interface ProviderLogoProps {
  id: string;
}

/** A yes-or-no drawn as a check or a cross, with its word for a screen reader. */
export interface MarkProps {
  value: boolean;
  /** The word the mark stands for: "Verified", "Yes". */
  label: string;
  /** Whether a tip bubble shows the word on hover too, where the heading does not say it. */
  hint?: boolean;
}
