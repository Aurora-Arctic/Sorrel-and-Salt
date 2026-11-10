'use client';

import type { ReactElement } from 'react';
import NameFilter from '../FilterForm/name-filter';
import { groupsHref, groupsPath } from './href';
import { KINDS } from './kinds';
import type { GroupListFilterProps } from './types';

// A group list's filter: a name search alone. A GET form, so before hydration the magnifier submits `query=`. The list
// keys this by the search shown, so a page showing another draws it afresh.

const GroupListFilter = ({ kind, filter }: GroupListFilterProps): ReactElement => (
  <NameFilter
    label={`Filter ${KINDS[kind].title}`}
    action={groupsPath(kind)}
    query={filter.query}
    searchHref={(query) => groupsHref(kind, { query })}
  />
);

export default GroupListFilter;
