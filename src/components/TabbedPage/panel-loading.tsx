import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import type { TabPanelLoadingProps } from './types';

// What a tab's panel shows while the pressed tab is on its way: the shared `Skeleton` of the list it stands in for, under the page's
// heading and tabs, which stay put (claude-docs/components/tabbed-page.md, "Pressing a tab").
const TabPanelLoading = ({
  filter = false,
  shape = 'table',
}: TabPanelLoadingProps): ReactElement => <Skeleton shape={shape} filter={filter} />;

export default TabPanelLoading;
