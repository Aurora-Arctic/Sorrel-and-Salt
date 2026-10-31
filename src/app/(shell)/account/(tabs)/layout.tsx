import type { ReactNode } from 'react';
import TabbedPage from '../../../../components/TabbedPage';
import { ACCOUNT_TABS } from '../../../../lib/sign-in';

// The account as a tabbed page (claude-docs/components/tabbed-page.md). No guard here: a layout does not re-run on a tab press,
// so each page runs `requireSession()` itself. The route group leaves the unverified-email page outside the tabs.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <TabbedPage title="Account" tabs={ACCOUNT_TABS} framed>
      {children}
    </TabbedPage>
  );
}
