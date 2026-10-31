'use client';

import { type ReactElement, useState } from 'react';
import { SearchField } from '../Field';
import FilterForm from '../FilterForm';
import { ARRIVALS_PATH, arrivalsHref } from './href';
import type { ArrivalsFilterProps } from './types';

// The Sign-Ups tab's filter, on the shared FilterForm: both boxes are held until the magnifier or Enter in either
// sends them together, from the first page. Before hydration the form submits natively (`query=`, `batch=`).
const ArrivalsFilterForm = ({ filter }: ArrivalsFilterProps): ReactElement => {
  const [query, setQuery] = useState(filter.query);
  const [batch, setBatch] = useState(filter.batch);

  return (
    <FilterForm
      label="Filter Card Sign-Ups"
      action={ARRIVALS_PATH}
      searchHref={() => arrivalsHref({ query: query.trim(), batch: batch.trim() })}
      shown={[filter.query, filter.batch]}
    >
      <SearchField
        label="Name or Email"
        name="query"
        placeholder="Search users"
        value={query}
        onChange={setQuery}
      />
      <SearchField
        label="Batch"
        name="batch"
        placeholder="Search batches"
        value={batch}
        onChange={setBatch}
      />
    </FilterForm>
  );
};

export default ArrivalsFilterForm;
