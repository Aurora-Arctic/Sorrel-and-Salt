import { formLabel } from '@/modules/ingredients/validation/form-label';
import { EditLink } from '../IconTip';
import type { ReactElement } from 'react';
import StackTable, { GroupChip, updatedColumn } from '../DataTable';
import { noMatchText } from '../../lib/text';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import GroupedValueListFilter from './filter';
import { KINDS } from './kinds';
import type { GroupedValueListProps } from './types';
import './index.scss';

// A curated vocabulary's filter, table and pager: grouped (categories, forms, deities) or flat, with no
// group column or filter (celestial bodies, zodiac signs); render-only. Filter and each Edit are
// addresses, so Back closes a modal (claude-docs/components/grouped-value-list.md).

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
  // A form's name is shown in title case; the other kinds' names as saved.
  const shown = (name: string): string => (kind === 'form' ? formLabel(name) : name);
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
            {
              heading: 'Name',
              // A deity's other names under its name, since the filter and the picker
              // find it by them too.
              cell: (entry) =>
                entry.otherNames && entry.otherNames.length > 0 ? (
                  <>
                    {shown(entry.name)}{' '}
                    <span className="grouped-value-list__other-names">
                      Also called {entry.otherNames.join(', ')}
                    </span>
                  </>
                ) : (
                  shown(entry.name)
                ),
            },
            group && {
              heading: group.label,
              cell: (entry) => (
                <GroupChip
                  name={entry.groupName}
                  colors={entry.groupColors}
                  icon={kind === 'form' ? (entry.groupIcon ?? null) : undefined}
                />
              ),
            },
            {
              heading: 'Description',
              className: 'grouped-value-list__description',
              cell: (entry) => entry.description,
            },
            updatedColumn(),
            {
              heading: 'Edit',
              hiddenHeading: true,
              action: 'corner',
              cell: (entry) => (
                <EditLink
                  href={entry.editHref}
                  name={shown(entry.name)}
                  heading={entry.editHeading}
                />
              ),
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
