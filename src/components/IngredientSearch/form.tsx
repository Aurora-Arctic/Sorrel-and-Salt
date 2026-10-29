'use client';

import { type ReactElement, createContext, useContext, useState } from 'react';
import FilterForm from '../FilterForm';
import IngredientSearchBox from './search-box';
import type { IngredientSearchFormProps } from './types';

// The search row: FilterForm around the search box, then the consumer's own fields. It shares
// the text typed with them through `useSearchText`, so a field that applies on change carries
// the name typed but not yet searched (claude-docs/components/ingredient-search.md).

const SearchText = createContext('');

/** The text in the search box now, searched or not: for a field in the filter slot to carry. */
export function useSearchText(): string {
  return useContext(SearchText);
}

export const IngredientSearchForm = ({
  label,
  action,
  query,
  shown,
  searchHref,
  pickHref,
  pickHeading,
  pickPlace,
  source,
  clear,
  className,
  children,
}: IngredientSearchFormProps): ReactElement => {
  const [text, setText] = useState(query);
  return (
    <SearchText.Provider value={text}>
      <FilterForm
        label={label}
        action={action}
        searchHref={() => searchHref(text.trim())}
        shown={shown}
        clear={clear}
        sorrel
        className={className}
      >
        <IngredientSearchBox
          text={text}
          onText={setText}
          searchHref={searchHref}
          pickHref={pickHref}
          pickHeading={pickHeading}
          pickPlace={pickPlace}
          source={source}
        />
        {children}
      </FilterForm>
    </SearchText.Provider>
  );
};
