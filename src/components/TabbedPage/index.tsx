import type { ReactElement } from 'react';
import TabLinks from './tab-links';
import type { TabActionsProps, TabbedPageProps } from './types';
import './index.scss';

export { default as TabPanelLoading } from './panel-loading';

// A page in tabs (MB.115, on the owner's call): its heading, a row of links,
// one per tab, and the open tab's content beneath. Each tab is at its own
// address, so it can be bookmarked and its `?edit=` and cursor links keep
// working; a route group's shared layout renders this, so pressing a tab
// swaps only the content beneath (claude-docs/components/tabbed-page.md).
// The row is a `nav` named for the page, not a `role="tablist"`: each tab is
// a navigation to another address, not a panel shown in place, and a tablist
// promises arrow keys it would not have. No client directive: only the
// links, which must know which tab is open, are a client part.
const TabbedPage = ({ title, tabs, children }: TabbedPageProps): ReactElement => (
  <main className="tabbed-page">
    <h1>{title}</h1>
    <nav aria-label={title} className="tabbed-page__tabs">
      <TabLinks tabs={tabs} />
    </nav>
    <div className="tabbed-page__panel">{children}</div>
  </main>
);

// The open tab's own action, at the end of the line above its content:
// Add Category, Invite Admin, Pause Admin Changes. With the tab's content
// rather than beside the page's heading, since it changes from tab to tab
// and the heading does not.
export const TabActions = ({ children }: TabActionsProps): ReactElement => (
  <div className="tabbed-page__actions">{children}</div>
);

export default TabbedPage;
