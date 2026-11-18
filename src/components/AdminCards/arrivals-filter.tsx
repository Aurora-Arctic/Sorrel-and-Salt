'use client';

import type { ReactElement } from 'react';
import { useSearchDraft } from '../FilterForm/use-filter-draft';
import { SearchField } from '../Field/search-field';
import FilterForm from '../FilterForm';
import { ARRIVALS_PATH, arrivalsHref } from './href';
import type { ArrivalsFilterProps } from './types';

// Before hydration the form submits natively (query=).
const ArrivalsFilterForm = ({ filter }: ArrivalsFilterProps): ReactElement => {
  const [query, setQuery] = useSearchDraft(filter.query);

  return (
    <FilterForm
      label="Filter Card Sign-Ups"
      action={ARRIVALS_PATH}
      searchHref={() => arrivalsHref({ query: query.trim() })}
      shown={[filter.query]}
    >
      <SearchField
        label="Name, Email or Batch"
        name="query"
        placeholder="Search Sign-Ups"
        hint="Matches part of an account's name or email, or the start of a batch number."
        value={query}
        onChange={setQuery}
      />
    </FilterForm>
  );
};

export default ArrivalsFilterForm;
