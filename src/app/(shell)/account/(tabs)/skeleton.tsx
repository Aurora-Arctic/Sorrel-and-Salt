import PageNav from '@/components/PageNav';
import PageWithNav from '@/components/PageWithNav';
import { PanelSkeleton } from '@/components/Skeleton/panel';
import TabbedPage from '@/components/TabbedPage';
import { ACCOUNT_PATH, ACCOUNT_TABS } from '@/lib/sign-in';

/** The Account tab's body: its menu and the three sections the page has. */
export const AccountPanelSkeleton = () => (
  <PageWithNav as="div" headless>
    <PageNav
      label="On This Page"
      entries={[
        { href: '#account-name', label: 'Name' },
        { href: '#account-email', label: 'Email' },
        { href: '#account-invitations', label: 'Invitations' },
      ]}
    />
    <PanelSkeleton />
    <PanelSkeleton />
    <PanelSkeleton />
  </PageWithNav>
);

export const AccountSkeleton = () => (
  <TabbedPage as="div" title="Account" tabs={ACCOUNT_TABS} open={ACCOUNT_PATH} framed>
    <AccountPanelSkeleton />
  </TabbedPage>
);
