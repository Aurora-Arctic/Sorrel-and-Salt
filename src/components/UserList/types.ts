import type { UserRole } from '../../lib/session';

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
}

export interface UserListProps {
  /** This page's users, in the list's order. */
  users: readonly UserListEntry[];
  /** The name-or-email filter as asked, blank for none. */
  query: string;
  /** Whether the list is narrowed to the users awaiting approval. */
  awaitingApproval: boolean;
  /** The role the list is narrowed to, absent for every role. */
  role?: UserRole;
  /** The page before this one, absent on the first. */
  previousHref?: string;
  /** The page after this one, absent on the last. */
  nextHref?: string;
  /** Whether impersonation is registered here, so each non-admin row offers it (MB.53). */
  canImpersonate?: boolean;
}

/** The filter the page shows, which the form starts from and compares against. */
export interface UserListFilterProps {
  query: string;
  awaitingApproval: boolean;
  role?: UserRole;
}

/** The filter as the address carries it: what `userListHref` writes. */
export type UserListFilterValue = UserListFilterProps;

/** A row's link to its user's privilege history (MB.200). */
export interface HistoryLinkProps {
  /** The user's address, which the ledger's search is opened with. */
  email: string;
  /** The user's name, completing the link's accessible name. */
  name: string;
}

export interface ImpersonateButtonProps {
  userId: string;
  /** The user's name, completing the button's accessible name. */
  name: string;
}

/** What a row's creation control does: approve a user awaiting it, or revoke it (M5.8). */
export type CreationAction = 'approve' | 'revoke';

/** Where a creation control is: offering its action, asking to confirm, or waiting on the answer. */
export type CreationStep = 'idle' | 'confirming' | 'sending';

export interface CreationControlProps {
  userId: string;
  /** The user's name, completing the button's accessible name and the question. */
  name: string;
  /** Whether the user's address is verified; Approve warns when it is not (MB.205). */
  emailVerified: boolean;
  action: CreationAction;
}
