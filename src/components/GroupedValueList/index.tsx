import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import StackTable, { GroupChip } from '../DataTable';
import { noMatchText } from '../../lib/text';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import GroupedValueListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupedValueListProps } from './types';
import './index.scss';

// A curated vocabulary's filter, table and pager: grouped — `/admin/categories`'
// (M5.6, MB.178), `/admin/forms`' (M5.6a) and `/admin/deities`' (MB.132) — or
// flat, with no group column or group filter, `/admin/celestial-bodies`' and
// `/admin/zodiac-signs`' (MB.95, folded in at MB.115). One for every such
// vocabulary, as GroupList is for their groups. Render-only: the page reads
// one page of the vocabulary under the address's filter through the service
// and hands it here. The filter is a GET form to the page itself, so a
// filtered page is an address. Each Edit is an address — the page opens its
// modal from the URL, as it does for the Add beside its heading — so a modal
// can be linked to and Back closes it. On a phone the table turns into cards
// (claude-docs/components/grouped-value-list.md).

const GroupedValueList = ({
  kind,
  values,
  filter,
  groups = [],
  previousHref,
  nextHref,
  position,
}: GroupedValueListProps): ReactElement => {
  const { title, label, plural, group } = KINDS[kind];
  // An empty list says how to fill it; a filtered one with no rows, which
  // filters left none: the name, and the group by its name.
  const groupName = groups.find(({ slug }) => slug === filter.group)?.name ?? filter.group;
  const empty = noMatchText(
    plural,
    [
      filter.query && `“${filter.query}”`,
      group && filter.group && `the ${group.label.toLowerCase()} ${groupName}`,
    ].filter((part): part is string => Boolean(part)),
    `There are no ${plural} yet. Add one with Add ${label}.`,
  );
  return (
    // The kind's modifier, so a rule one kind's rows need — the category
    // chip's padding — stays that kind's.
    <ListFrame className={`grouped-value-list--${kind}`}>
      {/* Keyed by the filter shown, so another one starts the form again from it. */}
      <GroupedValueListFilter
        key={`${filter.query}\n${filter.group}`}
        kind={kind}
        filter={filter}
        groups={groups}
      />

      <ListBody>
        {/* A flat kind has no group column. Roomy for the categories alone,
            whose groups are drawn in chips taller than a line of text. */}
        <StackTable
          columns={[
            { heading: 'Name', cell: (entry) => entry.name },
            group && {
              heading: group.label,
              cell: (entry) => <GroupChip name={entry.groupName} colors={entry.groupColors} />,
            },
            {
              heading: 'Description',
              className: 'grouped-value-list__description',
              cell: (entry) => entry.description,
            },
            {
              heading: 'Edit',
              hiddenHeading: true,
              action: 'corner',
              cell: (entry) => <EditLink href={entry.editHref} name={entry.name} />,
            },
          ]}
          rows={values}
          rowKey={(entry) => entry.id}
          empty={empty}
          aria-label={title}
          className={kind === 'category' ? 'data-table--roomy' : undefined}
        />

        <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
      </ListBody>
    </ListFrame>
  );
};

export default GroupedValueList;
