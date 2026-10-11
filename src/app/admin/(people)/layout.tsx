import TabbedPage from '../../../components/TabbedPage';
import { ADMIN_PAGES } from '../../../components/AdminNav/sections';
import type { AdminLayoutProps } from '../types';

// The People page's heading and tabs, which stay put while a tab's content
// swaps beneath them (MB.115; claude-docs/components/tabbed-page.md). No
// guard and no read here: `../layout.tsx` and each tab's page call the
// guard, and a layout does not re-run on a tab press, so a guard here would
// add nothing.
export default function PeopleLayout({ children }: AdminLayoutProps) {
  const { label, tabs } = ADMIN_PAGES.people;
  return (
    <TabbedPage title={label} tabs={tabs}>
      {children}
    </TabbedPage>
  );
}
