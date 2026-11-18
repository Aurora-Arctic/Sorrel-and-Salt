'use client';

import type { ReactElement } from 'react';
import { useSearchDraft } from './use-filter-draft';
import { SearchField } from '../Field/search-field';
import FilterForm from './index';
import type { NameFilterProps } from './types';

// A filter that opens with a name search, applied by the magnifier or Enter, with room after it for controls that apply at once.

const NameFilter = ({
  label,
  action,
  query,
  searchHref,
  shown = [],
  children,
}: NameFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useSearchDraft(query);

  return (
    <FilterForm
      label={label}
      action={action}
      searchHref={() => searchHref(draftQuery.trim())}
      shown={[query, ...shown]}
    >
      <SearchField
        label="Name"
        name="query"
        placeholder="Search Names"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      {children?.(draftQuery.trim())}
    </FilterForm>
  );
};

export default NameFilter;
