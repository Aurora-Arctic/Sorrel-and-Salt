import PageNav from '@/components/PageNav';
import PageWithNav from '@/components/PageWithNav';
import { PanelSkeleton } from '@/components/Skeleton/panel';
import TabbedPage from '@/components/TabbedPage';
import { ACCOUNT_SIGN_IN_PATH, ACCOUNT_TABS } from '@/lib/sign-in';

/** The Sign-In tab's body: its menu and the four sections the page has. */
export const AccountSignInPanelSkeleton = () => (
  <PageWithNav as="div" headless>
    <PageNav
      label="On This Page"
      entries={[
        { href: '#sign-in-methods', label: 'Sign-In Methods' },
        { href: '#password', label: 'Password' },
        { href: '#two-factor', label: 'Two-Factor Sign-In' },
        { href: '#passkeys', label: 'Passkeys' },
      ]}
    />
    {Array.from({ length: 4 }, (_, at) => (
      <PanelSkeleton key={at} />
    ))}
  </PageWithNav>
);

export const AccountSignInSkeleton = () => (
  <TabbedPage as="div" title="Account" tabs={ACCOUNT_TABS} open={ACCOUNT_SIGN_IN_PATH} framed>
    <AccountSignInPanelSkeleton />
  </TabbedPage>
);
