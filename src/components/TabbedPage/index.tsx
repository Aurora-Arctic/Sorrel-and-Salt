import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import TabLinks from './tab-links';
import { TabAction, TabPanel, TabSwitchProvider } from './tab-switch';
import type { TabbedPageProps } from './types';
import './index.scss';

// A page in tabs: its heading with a row of links, one per tab, on the same line, the open tab's action at the line's end,
// and its content beneath. Each tab is at its own address (claude-docs/components/tabbed-page.md, "Component notes").
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
