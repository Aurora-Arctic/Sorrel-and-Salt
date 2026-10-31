import type { ReactNode } from 'react';
import TabbedPage from '../../../../components/TabbedPage';
import { ACCOUNT_SIGN_IN_TABS } from '../../../../lib/sign-in';

// The account's ways in as a tabbed page (claude-docs/components/tabbed-page.md). No guard here: a
// layout does not re-run on a tab press, so each page runs `requireSession()` itself.
export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <TabbedPage title="Sign-In" tabs={ACCOUNT_SIGN_IN_TABS}>
      {children}
    </TabbedPage>
  );
}
