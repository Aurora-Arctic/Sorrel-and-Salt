import type { ReactNode } from 'react';
import TabbedPage from '../../../../components/TabbedPage';
import { getSession } from '../../../../lib/request-session';
import { ACCOUNT_TABS } from '../../../../lib/sign-in';
import { SUPPORT_LIST_PATH } from '../../../../lib/support-path';

// The account as a tabbed page (claude-docs/components/tabbed-page.md). No guard here: a layout does not re-run on a tab press,
// so each page runs `requireSession()` itself. The route group leaves the unverified-email page outside the tabs.
// An anonymous sender has no account or sign-in methods to show, so it gets the Support tab alone, and one tab draws no row.
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const anonymous = (await getSession())?.anonymous === true;
  const tabs = anonymous
    ? ACCOUNT_TABS.filter((tab) => tab.href === SUPPORT_LIST_PATH)
    : ACCOUNT_TABS;
  return (
    <TabbedPage title="Account" tabs={tabs} framed>
      {children}
    </TabbedPage>
  );
}
