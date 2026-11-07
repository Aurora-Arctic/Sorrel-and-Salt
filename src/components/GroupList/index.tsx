import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import StackTable, { GroupChip, updatedColumn } from '../DataTable';
import type { GroupKind } from '../GroupForm/types';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';

import { emptyList, noMatchText } from '../../lib/text';
import GroupListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupListFilter as Filter, GroupListProps } from './types';
import './index.scss';

// A group page's table and pager, for every group vocabulary, a deity's traditions included;
// render-only. A name search heads the list only for a kind whose page hands it a `filter`. Each Edit is
// an address, so Back closes its modal (claude-docs/components/group-list.md).

function emptyMessage(kind: GroupKind, filter: Filter | undefined): string {
  const { plural, add } = KINDS[kind];
  return noMatchText(
    plural,
    filter?.query ? [`“${filter.query}”`] : [],
    `${emptyList(plural)} Add one with ${add}.`,
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
          {
            heading: 'Name',
            cell: (group) => (
              <GroupChip
                name={group.name}
                colors={kind === 'category' ? group : undefined}
                icon={kind === 'form' ? (group.icon ?? null) : undefined}
              />
            ),
          },
          {
            heading: 'Description',
            className: 'group-list__description',
            cell: (group) => group.description,
          },
          updatedColumn(),
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
