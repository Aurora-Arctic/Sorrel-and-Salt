import { listHref } from './list-href';
import { list, oneOf, single, someOf, trimmed } from './search-params';
import type { ListHrefParams } from './types';
import type { Route } from 'next';

// A search's parameters as one typed table: each entry holds the name the address carries, how it is read and written back, and the
// GraphQL variable it becomes. The read, links, pager and filter form all go through its four functions, so a new filter is one entry.

/** Slug to id, per lookup name: what a page reads once to turn the address's slugs into ids. */
export type SearchLookups = Readonly<Record<string, ReadonlyMap<string, string>>>;

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
  /**
   * The value as the variable's value; `undefined` for no filter. `lookups`
   * are what the page read to translate with, such as a slug's id; an entry
   * that needs none ignores them.
   */
  toVariable(value: Value, lookups?: SearchLookups): unknown;
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

/**
 * Any number of free-text values as repeated parameters (`?forms=Oil&forms=Tincture`), trimmed, blanks and case-folded repeats dropped.
 * For an autofill vocabulary, so unlike `listParam` an uncurated value stays valid. Repeated, not comma-joined, as text may hold a comma.
 */
export const textListParam = (name: string, variable: string): SearchParam<string[]> => ({
  name,
  variable,
  read: (raw) => {
    const seen = new Set<string>();
    return list(raw).filter((value) => {
      const folded = value.toLocaleLowerCase();
      if (seen.has(folded)) return false;
      seen.add(folded);
      return true;
    });
  },
  write: (value) => value,
  toVariable: (value) => (value.length > 0 ? value : undefined),
});

/**
 * Any number of slugs as repeated parameters (`?categories=a&categories=b`), trimmed, repeats dropped. The variable is the ids the
 * page's `lookupKey` lookup holds; a slug it does not hold (a renamed one) is dropped and the rest still filter. Slugs, as an id means nothing to a reader.
 */
export const slugListParam = (
  name: string,
  variable: string,
  lookupKey: string,
): SearchParam<string[]> => ({
  name,
  variable,
  read: (raw) => [...new Set(list(raw))],
  write: (value) => value,
  toVariable: (value, lookups) => {
    const ids = value.flatMap((slug) => lookups?.[lookupKey]?.get(slug) ?? []);
    return ids.length > 0 ? ids : undefined;
  },
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

    /**
     * The variables for a query: a blank is `undefined`, so it is left out.
     * `lookups` go to every entry; only a slug entry reads them.
     */
    variables(filter: SearchFilter<E>, lookups?: SearchLookups): Record<string, unknown> {
      return Object.fromEntries(
        keys.map((key) => [entry(key).variable, entry(key).toVariable(filter[key], lookups)]),
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
