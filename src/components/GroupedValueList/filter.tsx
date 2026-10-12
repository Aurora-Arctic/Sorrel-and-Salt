'use client';

import { type ReactElement, useMemo, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { groupedValuesHref } from './href';
import { KINDS } from './kinds';
import type { GroupedValueListFilterProps } from './types';

// A curated vocabulary's filter (MB.178, MB.115): a name search, and for a
// grouped kind its group, each applying as it changes rather than on a
// Filter button pressed after them, the owner's call at MB.115's review.
// The group applies once a choice settles, a pick, its clear or leaving the
// box, never while it is typed, carrying the name typed but not yet searched;
// the name on the magnifier or Enter. `FilterForm` holds the form, Clear and
// the soft navigation; this holds what the fields say and what each applies.
// The group is typed into once hydrated, the owner's call (MB.115), but the
// server draws it as a native `<select>` (`FilterSelectField`), so before
// hydration a press on the magnifier submits natively, as `query=&group=`,
// which the page reads as the same filter. The list keys this by the filter
// shown, so a page showing another, Back say, draws it afresh from that one.

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
