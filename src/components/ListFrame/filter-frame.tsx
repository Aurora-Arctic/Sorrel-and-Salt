'use client';

import type { ReactElement, ReactNode } from 'react';
import FilterForm from '../FilterForm';
import ListFrame from '.';

// A list page's frame with nothing in it yet: the filter row with its controls disabled over the
// body. A client module, because the filter form takes a function for its href and a server
// component cannot hand one across.
export const ListFilterFrame = ({
  filter,
  children,
}: {
  filter: string;
  children: ReactNode;
}): ReactElement => (
  <ListFrame disabled>
    <FilterForm label={filter} action="/" searchHref={() => '/'} shown={[]}>
      <input name="q" type="search" aria-label="Search" />
    </FilterForm>
    {children}
  </ListFrame>
);
