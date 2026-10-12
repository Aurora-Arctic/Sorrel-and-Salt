'use client';

import { type ReactElement, useState } from 'react';
import { SearchField } from '../Field';
import FilterForm from '../FilterForm';
import { groupsHref, groupsPath } from './href';
import { KINDS } from './kinds';
import type { GroupListFilterProps } from './types';

// A group list's filter (MB.115): a name search alone, as a flat value list's
// is (GroupedValueListFilter, on the celestial bodies), applied by the magnifier at
// the end of its box or Enter, with no Filter button beside it, the owner's
// call at MB.115's review. `FilterForm` holds the form, Clear and the soft
// navigation; this holds what the box says. A GET form to the page itself,
// so before hydration the magnifier submits natively as `query=`, which the
// page reads as the same search. The list keys this by the search shown, so
// a page showing another, Back say, draws it afresh from that one.

const GroupListFilter = ({ kind, filter }: GroupListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(filter.query);

  return (
    <FilterForm
      label={`Filter ${KINDS[kind].title}`}
      action={groupsPath(kind)}
      searchHref={() => groupsHref(kind, { query: draftQuery.trim() })}
      shown={[filter.query]}
    >
      <SearchField
        label="Name"
        name="query"
        placeholder="Search names"
        value={draftQuery}
        onChange={setDraftQuery}
      />
    </FilterForm>
  );
};

export default GroupListFilter;
