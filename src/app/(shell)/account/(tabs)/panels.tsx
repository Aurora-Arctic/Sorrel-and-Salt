import PageNav from '@/components/PageNav';
import { ACCOUNT_NAV, SIGN_IN_NAV } from './nav';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';
import { PanelSkeleton } from '@/components/Skeleton/panel';

// What each account tab's panel draws while it is on its way: the tab's menu and the sections the page has.

/** The Account tab's body: its menu and the three sections the page has. */
export const AccountPanelSkeleton = () => (
  <PageWithNav as="div" headless>
    <PageNav label="On This Page" entries={ACCOUNT_NAV} />
    <PanelSkeleton />
    <PanelSkeleton />
    <PanelSkeleton />
  </PageWithNav>
);

/** The Sign-In tab's body: its menu and the four sections the page has. */
export const AccountSignInPanelSkeleton = () => (
  <PageWithNav as="div" headless>
    <PageNav label="On This Page" entries={SIGN_IN_NAV} />
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
