import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';
import ListFrame from '../ListFrame';

/** The help rows with nothing in them yet: the table's headings over placeholder rows. */
export const HelpListBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Help"
    headings={['Title', 'Kind', 'Audience', 'Position', 'Edit']}
    actions={['Edit']}
    hidden={['Edit']}
  />
);

/** The keepers' help list with nothing in it yet. */
export const HelpListSkeleton = (): ReactElement => (
  <ListFrame disabled>
    <HelpListBodySkeleton />
  </ListFrame>
);
