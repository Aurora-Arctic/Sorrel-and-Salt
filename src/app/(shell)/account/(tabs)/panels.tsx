import PageNav from '@/components/PageNav';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';
import { PanelSkeleton } from '@/components/Skeleton/panel';

// What each account tab's panel draws while it is on its way: the tab's menu and the sections the page has.

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

/** The Support Requests tab's body: the New Request button, then the list's rows. */
export const AccountSupportPanelSkeleton = () => (
  <PageWithNav as="div" headless>
    <div className="lede">
      <Skeleton shape="line" quiet />
    </div>
    <Skeleton shape="block" quiet />
    <Skeleton shape="line" count={6} quiet />
  </PageWithNav>
);
