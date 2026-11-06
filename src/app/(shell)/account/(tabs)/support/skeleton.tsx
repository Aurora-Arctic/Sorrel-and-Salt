import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';
import TabbedPage from '@/components/TabbedPage';
import { ACCOUNT_TABS } from '@/lib/sign-in';
import { SUPPORT_LIST_PATH } from '@/lib/support-path';

/** The Support Requests tab's body: the New Request button, then the list's rows. */
export const AccountSupportPanelSkeleton = () => (
  <PageWithNav as="div" headless>
    <Skeleton shape="block" quiet />
    <Skeleton shape="line" count={6} quiet />
  </PageWithNav>
);

export const AccountSupportSkeleton = () => (
  <TabbedPage as="div" title="Account" tabs={ACCOUNT_TABS} open={SUPPORT_LIST_PATH} framed>
    <AccountSupportPanelSkeleton />
  </TabbedPage>
);
