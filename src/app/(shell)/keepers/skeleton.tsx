import { AdminPageSkeleton } from '@/components/AdminNav/skeleton';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

export const KeepersSkeleton = () => (
  <div className="admin-index">
    <PageHeader title="Keepers" />
    <Skeleton shape="line" count={5} quiet />
  </div>
);

export const UsersSkeleton = () => <AdminPageSkeleton page="people" open="/keepers/users" />;
export const PrivilegeChangesSkeleton = () => (
  <AdminPageSkeleton page="people" open="/keepers/privilege-changes" />
);
export const KeepersInvitationsSkeleton = () => (
  <AdminPageSkeleton page="invitations" open="/keepers/invitations" />
);
export const InvitationCardsSkeleton = () => (
  <AdminPageSkeleton page="invitations" open="/keepers/invitation-cards" />
);
export const CardSignUpsSkeleton = () => (
  <AdminPageSkeleton page="invitations" open="/keepers/card-sign-ups" />
);
export const KeepersSupportSkeleton = () => (
  <AdminPageSkeleton page="support" open="/keepers/support" />
);
// The editor's draft is not known yet, so the first document's tab stands open.
export const KeepersDocumentSkeleton = () => (
  <AdminPageSkeleton page="documents" open="/keepers/documents/terms" tabsBelow />
);
export const KeepersEmailUpdatesSkeleton = () => (
  <AdminPageSkeleton page="documents" open="/keepers/documents" tabsBelow />
);
