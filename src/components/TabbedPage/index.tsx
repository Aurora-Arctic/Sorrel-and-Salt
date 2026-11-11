import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import TabLinks from './tab-links';
import { TabAction, TabPanel, TabSwitchProvider } from './tab-switch';
import type { TabbedPageProps } from './types';
import './index.scss';
import { cx } from '@/lib/class-names';

// A page in tabs: its heading with a row of links, one per tab, on the same line (or beneath it, with `tabsBelow`), the open tab's action at the line's end,
// and its content beneath. Each tab is at its own address (claude-docs/components/tabbed-page.md, "What a tabbed page is").
const TabbedPage = ({
  as: Tag = 'main',
  title,
  tabs,
  open,
  tabsBelow,
  action,
  framed,
  children,
}: TabbedPageProps): ReactElement => (
  <Tag
    className={cx(
      'tabbed-page',
      framed && 'tabbed-page--framed',
      tabsBelow && 'tabbed-page--tabs-below',
    )}
  >
    <TabSwitchProvider>
      <PageHeader
        title={title}
        action={
          <>
            {/* One tab has nowhere to switch to, so no row is drawn. */}
            {tabs.length > 1 && (
              <nav aria-label={title} className="tabbed-page__tabs">
                <TabLinks tabs={tabs} open={open} />
              </nav>
            )}
            <TabAction>{action}</TabAction>
          </>
        }
      />
      <TabPanel>{children}</TabPanel>
    </TabSwitchProvider>
  </Tag>
);

export default TabbedPage;
