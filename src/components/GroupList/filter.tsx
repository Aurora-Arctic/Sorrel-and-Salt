'use client';

import { type ReactElement, useState } from 'react';
import { SearchField } from '../Field';
import FilterForm from '../FilterForm';
import { groupsHref, groupsPath } from './href';
import { KINDS } from './kinds';
import type { GroupListFilterProps } from './types';

// A group list's filter: a name search alone, applied by the magnifier or Enter (`FilterForm` holds the
// form, Clear and navigation). A GET form, so before hydration the magnifier submits `query=`. The list
// keys this by the search shown, so a page showing another draws it afresh.

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
