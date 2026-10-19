import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import type { TabPanelLoadingProps } from './types';

// What a tab's panel shows while the tab just pressed is on its way
// (MB.115): the shared `Skeleton` of the list it stands in for, in place of
// the old tab's content, beneath the page's heading and tabs, which stay where
// they are: the filter row where the tab has one, a table's heading and six
// rows, and the pager, or the grid of cards. A list's body draws it too,
// without the tabs (ListFrame).
const TabPanelLoading = ({
  filter = false,
  shape = 'table',
}: TabPanelLoadingProps): ReactElement => <Skeleton shape={shape} filter={filter} />;

export default TabPanelLoading;
