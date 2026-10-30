import TabbedPage from '../../../components/TabbedPage';
import { ADMIN_PAGES } from '../../../components/AdminNav/sections';
import type { TabbedLayoutProps, TabbedPageKey } from './types';

// A tabbed admin page's heading and tabs, which stay while the tab's action and content swap
// (claude-docs/components/tabbed-page.md). No guard here: the pages call it, as a layout does not
// re-run on a tab press. A factory because Next wants each route group's layout as its default export.
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
