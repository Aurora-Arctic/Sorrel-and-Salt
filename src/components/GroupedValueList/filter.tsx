'use client';

import { type ReactElement, useMemo } from 'react';
import { FilterSelectField } from '../Field/filter-select-field';
import { useApplyFilter } from '../FilterForm';
import NameFilter from '../FilterForm/name-filter';
import { groupedValuesHref } from './href';
import { KINDS } from './kinds';
import type { GroupedValueListFilterProps } from './types';

// A curated vocabulary's filter: a name search and, for a grouped kind, its group; the group applies
// once a choice settles, carrying the unsearched name. The server draws a native `<select>`, so before
// hydration the magnifier submits `query=&group=` (claude-docs/components/grouped-value-list.md, "Contracts").

const GroupedValueListFilter = ({
  kind,
  filter,
  groups,
}: GroupedValueListFilterProps): ReactElement => {
  const { path, title, group } = KINDS[kind];
  const apply = useApplyFilter();
  const choices = useMemo(
    () => groups.map((each) => ({ value: each.slug, label: each.name })),
    [groups],
  );

  return (
    <NameFilter
      label={`Filter ${title}`}
      action={path}
      query={filter.query}
      searchHref={(query) => groupedValuesHref(kind, { query, group: filter.group })}
      shown={[filter.group]}
    >
      {(query) =>
        group && (
          <FilterSelectField
            label={group.label}
            name={group.param}
            all={`All ${group.plural}`}
            options={choices}
            defaultValue={filter.group}
            onChange={(chosen) => apply(groupedValuesHref(kind, { query, group: chosen }))}
            typeahead
          />
        )
      }
    </NameFilter>
  );
};

export default GroupedValueListFilter;
