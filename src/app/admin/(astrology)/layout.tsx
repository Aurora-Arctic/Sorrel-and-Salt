import TabbedPage from '../../../components/TabbedPage';
import { ADMIN_PAGES } from '../../../components/AdminNav/sections';
import type { AdminLayoutProps } from '../types';

// The Astrology page's heading and tabs, which stay put while a tab's content
// swaps beneath them (MB.115; claude-docs/components/tabbed-page.md). No
// guard and no read here: `../layout.tsx` and each tab's page call the
// guard, and a layout that read the session would hold every tab press until
// it had, where the tab's `loading.tsx` should show at once.
export default function AstrologyLayout({ children }: AdminLayoutProps) {
  const { label, tabs } = ADMIN_PAGES.astrology;
  return (
    <TabbedPage title={label} tabs={tabs}>
      {children}
    </TabbedPage>
  );
}
