import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import TabLinks from './tab-links';
import { TabAction, TabPanel, TabSwitchProvider } from './tab-switch';
import type { TabbedPageProps } from './types';
import './index.scss';

// A page in tabs (MB.115, on the owner's call): its heading with the row of
// links, one per tab, beside it on the same line (MB.7), the open tab's
// action at the line's end, and the open tab's content beneath. Each tab is
// at its own address, so it can be bookmarked and its `?edit=` and cursor
// links keep working; a route group's shared layout renders this, so pressing
// a tab swaps only the action and the content
// (claude-docs/components/tabbed-page.md).
// The row is a `nav` named for the page, not a `role="tablist"`: each tab is
// a navigation to another address, not a panel shown in place, and a tablist
// promises arrow keys it would not have. No client directive: the links,
// which must know which tab is open, and the switch they share with the
// action and the panel are the client parts; the action and the content pass
// through them from the server.
// A page with a single tab (a member who cannot invite sees only Members) draws no row.
// The row rides in `PageHeader`'s trailing children with the action, a
// fragment spreading into the header's flex row in the order heading, tabs,
// action, so the header needs no slot of its own for it.
const TabbedPage = ({ title, tabs, action, children }: TabbedPageProps): ReactElement => (
  <main className="tabbed-page">
    <TabSwitchProvider>
      <PageHeader
        title={title}
        action={
          <>
            {/* One tab has nowhere to switch to, so no row is drawn. */}
            {tabs.length > 1 && (
              <nav aria-label={title} className="tabbed-page__tabs">
                <TabLinks tabs={tabs} />
              </nav>
            )}
            <TabAction>{action}</TabAction>
          </>
        }
      />
      <TabPanel>{children}</TabPanel>
    </TabSwitchProvider>
  </main>
);

export default TabbedPage;
