import TabbedPage from '@/components/TabbedPage';
import { SUPPORT_LIST_PATH } from '@/lib/support-path';
import { AccountSupportPanelSkeleton } from '../panels';
import { ACCOUNT_TABS } from '../tabs';

export const AccountSupportSkeleton = () => (
  <TabbedPage as="div" title="Account" tabs={ACCOUNT_TABS} open={SUPPORT_LIST_PATH} framed>
    <AccountSupportPanelSkeleton />
  </TabbedPage>
);
