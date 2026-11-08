import type { ReactElement } from 'react';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import HelpOutlineFilterRow from './filter';

/** The chosen guide's sub pages with nothing in them yet: the table's headings over placeholder rows. */
export const HelpOutlineBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Help"
    headings={['Position', 'Sub Page', 'Audience', 'Order', 'Edit']}
    actions={['Order', 'Edit']}
    hidden={['Edit']}
  />
);

/** The keepers' help outline's placeholder: its filter row, at the defaults, over the body. */
export const HelpOutlineSkeleton = (): ReactElement => (
  <ListFilterFrame
    filter={<HelpOutlineFilterRow filter={{ query: '', kind: '', audience: '', shown: 'shown' }} />}
  >
    <HelpOutlineBodySkeleton />
  </ListFilterFrame>
);
