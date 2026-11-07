import type { SupportRequestsFilter } from '@/components/SupportRequests/types';
import TabbedPage from '@/components/TabbedPage';
import { SupportListSkeleton } from '@/components/SupportRequests/skeleton';
import { supportHref, supportViewTabs } from '@/components/SupportRequests/href';
import { DEFAULT_SUPPORT_VIEW, SUPPORT_VIEWS, type SupportView } from '@/lib/support-path';
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
const SUPPORT_FILTER: SupportRequestsFilter = {
  about: '',
  view: DEFAULT_SUPPORT_VIEW,
  errorCode: '',
  sender: '',
};
// Two views drawn with a one-digit count and the rest with none, which stands the tabs as wide as the page's.
const PLACEHOLDER_COUNTS = Object.fromEntries(
  SUPPORT_VIEWS.map(({ value }, index) => [value, index < 2 ? 1 : 0]),
) as Record<SupportView, number>;

export const KeepersSupportSkeleton = () => (
  <TabbedPage
    as="div"
    title="Support"
    tabs={supportViewTabs(SUPPORT_FILTER, PLACEHOLDER_COUNTS).map((tab) => ({
      ...tab,
      skeleton: <SupportListSkeleton />,
    }))}
    open={supportHref(SUPPORT_FILTER)}
    tabsBelow
  >
    <SupportListSkeleton />
  </TabbedPage>
);
// The editor's draft is not known yet, so the first document's tab stands open.
export const KeepersDocumentSkeleton = () => (
  <AdminPageSkeleton page="documents" open="/keepers/documents/terms" tabsBelow />
);
export const KeepersEmailUpdatesSkeleton = () => (
  <AdminPageSkeleton page="documents" open="/keepers/documents" tabsBelow />
);
export const BusinessCardsSkeleton = () => (
  <AdminPageSkeleton page="businessCards" open="/keepers/business-cards" />
);
