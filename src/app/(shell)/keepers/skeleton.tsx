import { AdminPageSkeleton, withSkeletons } from '@/components/AdminNav/skeleton';
import { ADMIN_PAGES } from '@/components/AdminNav/sections';
import { BusinessCardsBodySkeleton } from '@/components/BusinessCards/skeleton';
import TabbedPage from '@/components/TabbedPage';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

export const KeepersSkeleton = () => (
  <div className="admin-index">
    <PageHeader
      title="Keepers"
      lede="Here you answer the help requests people send, and manage who uses the site. Pick a page below, or from the links at the top of any Keepers page."
    />
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
// The page draws no action and is one narrow column, centred; its single tab draws no tab row.
export const BusinessCardsSkeleton = () => (
  <div className="admin-index business-cards-skeleton">
    <TabbedPage
      as="div"
      title={ADMIN_PAGES.businessCards.label}
      tabs={withSkeletons(ADMIN_PAGES.businessCards.tabs)}
      open="/keepers/business-cards"
      action={null}
    >
      <BusinessCardsBodySkeleton />
    </TabbedPage>
  </div>
);
