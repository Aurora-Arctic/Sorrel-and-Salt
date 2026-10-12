import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import StackTable, { GroupChip } from '../DataTable';
import type { GroupKind } from '../GroupForm/types';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';

import { noMatchText } from '../../lib/text';
import GroupListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupListFilter as Filter, GroupListProps } from './types';
import './index.scss';

// A group page's table and pager (M5.6b), for every group vocabulary, a deity's
// traditions included (MB.132).
// Render-only: the page reads one page of groups through the service and hands
// it here. A category group's name is drawn in its own chip, which is how a
// reader meets the pair. A name search heads the list for a kind whose page
// hands it a `filter`: the traditions', thirty-five in the seed (MB.115), and
// not the category or form groups', eight and six. Each Edit is an address —
// the page opens its modal from the URL — so a modal can be linked to and
// Back closes it. The table turns each row into a card at phone width
// (claude-docs/components/group-list.md).

/**
 * What an empty list says: how to fill it, with the page header's Add, named
 * as that button is (`group-page.tsx`); or, searched with no rows, the search
 * that left none, as every admin list says it.
 */
function emptyMessage(kind: GroupKind, filter: Filter | undefined): string {
  const { plural, add } = KINDS[kind];
  return noMatchText(
    plural,
    filter?.query ? [`“${filter.query}”`] : [],
    `There are no ${plural} yet. Add one with ${add}.`,
  );
}

const GroupList = ({
  kind,
  groups,
  previousHref,
  nextHref,
  position,
  filter,
}: GroupListProps): ReactElement => (
  <ListFrame>
    {/* Keyed by the search shown, so another one starts the form again from it. */}
    {filter && <GroupListFilter key={filter.query} kind={kind} filter={filter} />}

    <ListBody>
      {/* Roomy: a chip and the Edit pencil stand taller than a line of text. */}
      <StackTable
        columns={[
          // A category group's name in its own chip, which is how a reader meets the pair.
          {
            heading: 'Name',
            cell: (group) => (
              <GroupChip name={group.name} colors={kind === 'category' ? group : undefined} />
            ),
          },
          {
            heading: 'Description',
            className: 'group-list__description',
            cell: (group) => group.description,
          },
          {
            heading: 'Edit',
            hiddenHeading: true,
            action: 'corner',
            cell: (group) => (
              <EditLink href={group.editHref} name={group.name} heading={group.editHeading} />
            ),
          },
        ]}
        rows={groups}
        rowKey={(group) => group.id}
        empty={emptyMessage(kind, filter)}
        aria-label={KINDS[kind].title}
        className="data-table--roomy"
      />

      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default GroupList;
