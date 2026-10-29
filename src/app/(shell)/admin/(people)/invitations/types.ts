import type {
  AdminInvitationsCursor,
  AdminInvitationsFilter,
} from '../../../../../components/AdminInvitations/types';

export interface AdminInvitationsPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<InvitationsSearchParams>;
}

/**
 * The tab's address: its filter (`email` and the `expiring` flag), at most one cursor, and the
 * invite form open over it by `?invite`'s presence.
 */
export interface InvitationsSearchParams {
  email?: string | string[];
  expiring?: string | string[];
  after?: string | string[];
  before?: string | string[];
  invite?: string | string[];
}

/** Where the address puts the tab: its filter, and the page it shows. */
export interface InvitationsPlace {
  filter: AdminInvitationsFilter;
  cursor: AdminInvitationsCursor;
}
