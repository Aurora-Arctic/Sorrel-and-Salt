import type {
  AdminInvitationsCursor,
  AdminInvitationsFilter,
} from '../../../../../components/AdminInvitations/types';

export interface AdminInvitationsPageProps {
  searchParams: Promise<InvitationsSearchParams>;
}

export interface InvitationsSearchParams {
  email?: string | string[];
  expiring?: string | string[];
  after?: string | string[];
  before?: string | string[];
  invite?: string | string[];
}

export interface InvitationsPlace {
  filter: AdminInvitationsFilter;
  cursor: AdminInvitationsCursor;
}
