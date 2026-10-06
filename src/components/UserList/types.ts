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
  /** The page before this one, absent on the first. */
  previousHref?: string;
  /** The page after this one, absent on the last. */
  nextHref?: string;
}
