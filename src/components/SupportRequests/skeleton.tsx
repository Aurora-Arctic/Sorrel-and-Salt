import type { ReactElement } from 'react';
import { DEFAULT_SUPPORT_VIEW } from '../../lib/support-path';
import Skeleton from '../Skeleton';
import { ListFilterFrame, ListBodySkeleton } from '../ListFrame/skeleton';
import SupportRequestsFilter from './filter';

/** The support list's rows with nothing in them yet: the table's headings over blank rows. */
export const SupportListBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Support Requests"
    rowKind="support"
    tableClassName="data-table--nowrap"
    headings={[
      'About',
      'Subject',
      'Status',
      'Sender',
      'Assignee',
      'Curators',
      'Error #',
      'Created',
      'Last From Sender',
    ]}
  />
);

/** The support list's placeholder: its filter row over the body. */
export const SupportListSkeleton = (): ReactElement => (
  <section className="support-requests" aria-label="Support Requests">
    <ListFilterFrame
      filter={
        <SupportRequestsFilter
          filter={{ about: '', view: DEFAULT_SUPPORT_VIEW, errorCode: '', sender: '' }}
        />
      }
    >
      <SupportListBodySkeleton />
    </ListFilterFrame>
  </section>
);

/** A request's dialog with nothing in it yet: a few lines of its message over the reply box. */
export const SupportDetailSkeleton = (): ReactElement => (
  <>
    <Skeleton shape="line" count={3} />
    <Skeleton shape="block" count={2} quiet />
  </>
);
