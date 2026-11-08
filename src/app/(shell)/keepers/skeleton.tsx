import { AdminPageSkeleton, withSkeletons } from '@/components/AdminNav/skeleton';
import { ADMIN_PAGES } from '@/components/AdminNav/sections';
import { BusinessCardsBodySkeleton } from '@/components/BusinessCards/skeleton';
import TabbedPage from '@/components/TabbedPage';
import type { SupportRequestsFilter } from '@/components/SupportRequests/types';
import { SupportListSkeleton } from '@/components/SupportRequests/skeleton';
import { supportHref, supportViewTabs } from '@/components/SupportRequests/href';
import { DEFAULT_SUPPORT_VIEW, SUPPORT_VIEWS, type SupportView } from '@/lib/support-path';
import SkeletonText from '@/components/Skeleton/text';
import PageHeader from '@/components/PageHeader';
import { AdminContentsPending } from '@/components/AdminNav/contents';
import Skeleton from '@/components/Skeleton';
import { HelpArticlePageSkeleton } from '@/components/HelpArticleForm/skeleton';

// The curator's lede and sections whatever the role, since the skeleton cannot know it.
export const KeepersSkeleton = () => (
  <div className="admin-index">
    <PageHeader
      title={<SkeletonText>Keepers</SkeletonText>}
      lede={
        <SkeletonText>
          Here you answer the help requests people send. Pick a page below, or from the links at the
          top of any Keepers page.
        </SkeletonText>
      }
    />
    <AdminContentsPending managesPeople={false} />
  </div>
);

export const KeepersHelpSkeleton = () => <AdminPageSkeleton page="help" open="/keepers/help" />;
export const KeepersHelpNewSkeleton = () => <HelpArticlePageSkeleton editing={false} />;
export const KeepersHelpEditSkeleton = () => <HelpArticlePageSkeleton editing />;
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
// The documents' layout: a column the editor's width, no action, the tab row beneath the heading.
// The Email Updates page is a bare section: a heading and its status, with no lede.
const MailingSkeleton = () => (
  <section className="document-mailing">
    <Skeleton shape="line" quiet />
    <Skeleton shape="block" count={2} quiet />
  </section>
);
const DocumentsSkeleton = ({ open, mailing }: { open: string; mailing?: boolean }) => {
  const tabs = withSkeletons(ADMIN_PAGES.documents.tabs);
  return (
    <div className="document-editor-column">
      <TabbedPage
        as="div"
        title={ADMIN_PAGES.documents.label}
        tabs={tabs}
        open={open}
        action={null}
        tabsBelow
      >
        {mailing ? <MailingSkeleton /> : tabs.find((tab) => tab.href === open)?.skeleton}
      </TabbedPage>
    </div>
  );
};
// The editor's draft is not known yet, so the first document's tab stands open.
export const KeepersDocumentSkeleton = () => <DocumentsSkeleton open="/keepers/documents/terms" />;
export const KeepersEmailUpdatesSkeleton = () => (
  <DocumentsSkeleton open="/keepers/documents" mailing />
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
