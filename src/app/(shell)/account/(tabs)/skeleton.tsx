import TabbedPage from '@/components/TabbedPage';
import { ACCOUNT_PATH } from '@/lib/sign-in';
import { AccountPanelSkeleton } from './panels';
import { ACCOUNT_TABS } from './tabs';

export const AccountSkeleton = () => (
  <TabbedPage as="div" title="Account" tabs={ACCOUNT_TABS} open={ACCOUNT_PATH} framed>
    <AccountPanelSkeleton />
  </TabbedPage>
);
