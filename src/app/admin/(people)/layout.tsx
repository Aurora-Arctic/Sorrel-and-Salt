import TabbedPage from '../../../components/TabbedPage';
import { ADMIN_PAGES } from '../../../components/AdminNav/sections';
import type { TabbedLayoutProps } from '../types';

// The People page's heading and tabs, which stay put while the open tab's
// action, the `@action` slot, and its content swap beside and beneath them
// (MB.115; claude-docs/components/tabbed-page.md). No guard and no read here:
// `../layout.tsx` and each tab's page call the guard, and a layout does not
// re-run on a tab press, so a guard here would add nothing.
export default function PeopleLayout({ action, children }: TabbedLayoutProps) {
  const { label, tabs } = ADMIN_PAGES.people;
  return (
    <TabbedPage title={label} tabs={tabs} action={action}>
      {children}
    </TabbedPage>
  );
}
