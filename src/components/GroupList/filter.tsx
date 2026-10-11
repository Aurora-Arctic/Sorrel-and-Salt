'use client';

import { type ReactElement, useId, useState } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import FilterForm from '../FilterForm';
import { groupsHref, groupsPath } from './href';
import { KINDS } from './kinds';
import type { GroupListFilterProps } from './types';

// A group list's filter (MB.115): a name search alone, as a flat value list's
// is (GroupedValueListFilter, on the planets). `FilterForm` holds the form,
// the Filter button, Clear and the soft navigation; this holds what
// the field says and whether it differs from the search the page shows. A
// GET form to the page itself, so before hydration it submits natively as
// `query=`, which the page reads as no search. The list keys this by the
// search shown, so a page showing another — Back, say — starts it again from
// that one.

const GroupListFilter = ({ kind, filter }: GroupListFilterProps): ReactElement => {
  const query = fieldDescription({ id: `${useId()}-query` });
  const [draftQuery, setDraftQuery] = useState(filter.query);

  return (
    <FilterForm
      label={`Filter ${KINDS[kind].title}`}
      action={groupsPath(kind)}
      href={() => groupsHref(kind, { query: draftQuery.trim() })}
      disabled={draftQuery.trim() === filter.query}
      shown={[filter.query]}
      draft={[draftQuery]}
      onClear={() => setDraftQuery('')}
      navigation="soft"
    >
      <FieldShell label="Name" {...query}>
        <input
          id={query.controlId}
          className="input"
          type="search"
          name="query"
          placeholder="Search names"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
        />
      </FieldShell>
    </FilterForm>
  );
};

export default GroupListFilter;
