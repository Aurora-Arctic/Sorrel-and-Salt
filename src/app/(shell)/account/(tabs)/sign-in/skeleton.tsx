import TabbedPage from '@/components/TabbedPage';
import { ACCOUNT_SIGN_IN_PATH } from '@/lib/sign-in';
import { AccountSignInPanelSkeleton } from '../panels';
import { ACCOUNT_TABS } from '../tabs';

export const AccountSignInSkeleton = () => (
  <TabbedPage as="div" title="Account" tabs={ACCOUNT_TABS} open={ACCOUNT_SIGN_IN_PATH} framed>
    <AccountSignInPanelSkeleton />
  </TabbedPage>
);
