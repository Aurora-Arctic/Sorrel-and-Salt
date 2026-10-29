'use client';

import { type ReactElement, useMemo, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { groupedValuesHref } from './href';
import { KINDS } from './kinds';
import type { GroupedValueListFilterProps } from './types';

// A curated vocabulary's filter: a name search and, for a grouped kind, its group; the group applies
// once a choice settles, carrying the unsearched name. The server draws a native `<select>`, so before
// hydration the magnifier submits `query=&group=` (claude-docs/components/grouped-value-list.md, "Source notes").

const GroupedValueListFilter = ({
  kind,
  filter,
  groups,
}: GroupedValueListFilterProps): ReactElement => {
  const { path, title, group } = KINDS[kind];
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const apply = useApplyFilter();
  const choices = useMemo(
    () => groups.map((each) => ({ value: each.slug, label: each.name })),
    [groups],
  );

  /** The filter shown with the group given, the name typed carried, from the first page. */
  const hrefWith = (chosen: string) =>
    groupedValuesHref(kind, { query: draftQuery.trim(), group: chosen });

  return (
    <FilterForm
      label={`Filter ${title}`}
      action={path}
      searchHref={() => hrefWith(filter.group)}
      shown={[filter.query, filter.group]}
    >
      <SearchField
        label="Name"
        name="query"
        placeholder="Search names"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      {group && (
        <FilterSelectField
          label={group.label}
          name={group.param}
          all={`All ${group.plural}`}
          options={choices}
          defaultValue={filter.group}
          onChange={(chosen) => apply(hrefWith(chosen))}
          typeahead
        />
      )}
    </FilterForm>
  );
};

export default GroupedValueListFilter;
