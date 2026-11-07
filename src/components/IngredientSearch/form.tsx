'use client';

import {
  type ReactElement,
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import FilterForm from '../FilterForm';
import IngredientSearchBox from './search-box';
import type { IngredientSearchFormProps } from './types';

// The search row: FilterForm around the search box, then the consumer's own fields. It shares
// the text typed with them through `useSearchText`, so a field that applies on change carries
// the name typed but not yet searched (claude-docs/components/ingredient-search.md).

/** The text in the box, held outside the render tree so only a field that asks for it redraws on a keystroke. */
interface TextStore {
  text: string;
  listeners: Set<() => void>;
}

const SearchText = createContext<TextStore>({ text: '', listeners: new Set() });

const subscribeTo = (store: TextStore) => (listener: () => void) => {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
};

const noText = () => '';

/**
 * The text in the search box now, searched or not: for a field in the filter slot to carry.
 * With `live` false the field is not redrawn as the text changes, and gets an empty string.
 */
export function useSearchText(live = true): string {
  const store = useContext(SearchText);
  const read = live ? () => store.text : noText;
  return useSyncExternalStore(subscribeTo(store), read, read);
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
  const [store] = useState<TextStore>(() => ({ text: query, listeners: new Set() }));
  useLayoutEffect(() => {
    if (store.text === text) return;
    store.text = text;
    store.listeners.forEach((listener) => listener());
  }, [store, text]);
  return (
    <SearchText.Provider value={store}>
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
