import TabbedPage from '../../components/TabbedPage';
import { ADMIN_PAGES } from '../../components/AdminNav/sections';
import type { TabbedLayoutProps, TabbedPageKey } from './types';

// A tabbed admin page's heading and tabs, which stay put while the open tab's
// action, the `@action` slot, and its content swap beside and beneath them
// (MB.115; claude-docs/components/tabbed-page.md). No guard and no read here:
// `layout.tsx` and each tab's page call the guard, and a layout does not
// re-run on a tab press, so a guard here would add nothing. A factory rather
// than a component, because Next wants each route group's layout as its own
// default export.
export function tabbedLayout(key: TabbedPageKey) {
  const { label, tabs } = ADMIN_PAGES[key];
  return function AdminTabbedLayout({ action, children }: TabbedLayoutProps) {
    return (
      <TabbedPage title={label} tabs={tabs} action={action}>
        {children}
      </TabbedPage>
    );
  };
}
