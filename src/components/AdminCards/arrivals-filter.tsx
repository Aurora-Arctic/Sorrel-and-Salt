'use client';

import { type ReactElement, useState } from 'react';
import { SearchField } from '../Field';
import FilterForm from '../FilterForm';
import { ARRIVALS_PATH, arrivalsHref } from './href';
import type { ArrivalsFilterProps } from './types';

// The Sign-Ups tab's filter, on the shared FilterForm: one box, sent by the magnifier or Enter from the first page.
// Before hydration the form submits natively (`query=`).
const ArrivalsFilterForm = ({ filter }: ArrivalsFilterProps): ReactElement => {
  const [query, setQuery] = useState(filter.query);

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
        placeholder="Search sign-ups"
        hint="Matches part of an account's name or email, or the start of a batch number."
        value={query}
        onChange={setQuery}
      />
    </FilterForm>
  );
};

export default ArrivalsFilterForm;
