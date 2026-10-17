import { listHref } from './list-href';
import { list, oneOf, single, someOf, trimmed } from './search-params';
import type { ListHrefParams } from './types';
import type { Route } from 'next';

// A search's parameters as one typed table (M8.13). Each entry holds the name
// the address carries, how that is read, how a value is written back, and the
// GraphQL variable it becomes. The page's read, every link, the pager and the
// filter form all go through the table's four functions, so a new filter is
// one new entry and none of those change. Before this, each of them listed
// the parameters by hand and a filter was added in five places.

type Raw = string | string[] | undefined;
type Written = string | readonly string[] | boolean | undefined;

/**
 * One parameter. Methods rather than properties, so an entry typed for its
 * own value (`SearchParam<string[]>`) is accepted where the table takes any.
 */
export interface SearchParam<Value> {
  /** The name in the address. */
  name: string;
  /** The name of the GraphQL variable (or service filter field) it becomes. */
  variable: string;
  /** The value from what the address held; a hand-edited one reads as no filter. */
  read(raw: Raw): Value;
  /** The value as `listHref` writes it; a blank one is left out of the address. */
  write(value: Value): Written;
  /** The value as the variable's value; `undefined` for no filter. */
  toVariable(value: Value): unknown;
}

export function searchParam<Value>(entry: SearchParam<Value>): SearchParam<Value> {
  return entry;
}

/** Free text, trimmed; blank is no filter. */
export const textParam = (name: string, variable: string): SearchParam<string> => ({
  name,
  variable,
  read: trimmed,
  write: (value) => value,
  toVariable: (value) => value || undefined,
});

/** One of a fixed set, or `''` for none. */
export const choiceParam = <T extends string>(
  name: string,
  values: readonly T[],
  variable: string,
): SearchParam<T | ''> => ({
  name,
  variable,
  read: (raw) => oneOf(values, single(raw)) ?? '',
  write: (value) => value,
  toVariable: (value) => value || undefined,
});

/** Any number of a fixed set, written as repeated parameters; empty is no filter. */
export const listParam = <T extends string>(
  name: string,
  values: readonly T[],
  variable: string,
): SearchParam<T[]> => ({
  name,
  variable,
  read: (raw) => someOf(values, list(raw)),
  write: (value) => value,
  toVariable: (value) => (value.length > 0 ? value : undefined),
});

type Entries = Record<string, SearchParam<unknown>>;

/** The filter a table reads: one field per entry, of that entry's value. */
export type SearchFilter<E extends Entries> = {
  [K in keyof E]: E[K] extends SearchParam<infer Value> ? Value : never;
};

/** The cursor, which belongs to the filter it was read under. */
export interface SearchCursor {
  after?: string | undefined;
  before?: string | undefined;
}

export function defineSearchParams<E extends Entries>(entries: E) {
  const keys = Object.keys(entries) as (keyof E & string)[];
  const entry = (key: keyof E & string) => entries[key] as SearchParam<unknown>;

  return {
    entries,

    /** The filter an address holds. */
    read(params: object): SearchFilter<E> {
      const raw = params as Record<string, Raw>;
      return Object.fromEntries(
        keys.map((key) => [key, entry(key).read(raw[entry(key).name])]),
      ) as SearchFilter<E>;
    },

    /** The address of `path` under `filter`, in table order, then `extra` (a cursor, a modal). */
    href(path: string, filter: Partial<SearchFilter<E>>, extra: ListHrefParams = {}): Route {
      const written: Record<string, Written> = {};
      for (const key of keys) {
        const value = filter[key];
        if (value !== undefined) written[entry(key).name] = entry(key).write(value);
      }
      return listHref(path, { ...written, ...extra });
    },

    /** The variables for a query: a blank is `undefined`, so it is left out. */
    variables(filter: SearchFilter<E>): Record<string, unknown> {
      return Object.fromEntries(
        keys.map((key) => [entry(key).variable, entry(key).toVariable(filter[key])]),
      );
    },

    /**
     * `place` with `change` applied and the cursor dropped. A cursor names a
     * spot in one filter's results, so under another it is a wrong page or an
     * error; the first page is the only honest one.
     */
    changed(
      place: Partial<SearchFilter<E>> & SearchCursor,
      change: Partial<SearchFilter<E>>,
    ): Partial<SearchFilter<E>> {
      const { after: _after, before: _before, ...filter } = place;
      return { ...filter, ...change } as Partial<SearchFilter<E>>;
    },
  };
}
