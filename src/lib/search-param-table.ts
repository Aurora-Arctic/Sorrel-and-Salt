import { listHref } from './list-href';
import { list, oneOf, single, someOf, trimmed } from './search-params';
import type { ListHrefParams } from './types';
import type { Route } from 'next';

export type SearchLookups = Readonly<Record<string, ReadonlyMap<string, string>>>;

type Raw = string | readonly string[] | undefined;
type Written = string | readonly string[] | boolean | undefined;

/** Methods rather than properties, so an entry typed for its own value is accepted where the table takes any. */
export interface SearchParam<Value> {
  name: string;
  variable: string;
  /** The value from what the address held; a hand-edited one reads as no filter. */
  read(raw: Raw): Value;
  /** The value as `listHref` writes it; a blank one is left out of the address. */
  write(value: Value): Written;
  /** `lookups` are what the page read to translate with, such as a slug's id; an entry that needs none ignores them. */
  toVariable(value: Value, lookups?: SearchLookups): unknown;
}

export function searchParam<Value>(entry: SearchParam<Value>): SearchParam<Value> {
  return entry;
}

export const textParam = (name: string, variable: string): SearchParam<string> => ({
  name,
  variable,
  read: trimmed,
  write: (value) => value,
  toVariable: (value) => value || undefined,
});

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

/** For an autofill vocabulary, so unlike `listParam` an uncurated value stays valid. Repeated, not comma-joined, as text may hold a comma. */
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

/** An on/off switch: `1` is on and off stays out of the address. `toVariable` turns the flag into the value its query takes when that is not `true`. */
export const flagParam = (
  name: string,
  variable: string = name,
  toVariable: (on: boolean) => unknown = (on) => on || undefined,
): SearchParam<boolean> => ({
  name,
  variable,
  read: (raw) => single(raw) === '1',
  write: (on) => (on ? '1' : undefined),
  toVariable,
});

/** The variable is the ids the page's `lookupKey` lookup holds; a slug it does not hold (a renamed one) is dropped and the rest still filter. Slugs, as an id means nothing to a reader. */
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

export type SearchFilter<E extends Entries> = {
  [K in keyof E]: E[K] extends SearchParam<infer Value> ? Value : never;
};

export interface SearchCursor {
  after?: string | undefined;
  before?: string | undefined;
}

export function defineSearchParams<E extends Entries>(entries: E) {
  const keys = Object.keys(entries) as (keyof E & string)[];
  const entry = (key: keyof E & string) => entries[key] as SearchParam<unknown>;

  return {
    entries,

    read(params: object): SearchFilter<E> {
      const raw = params as Record<string, Raw>;
      return Object.fromEntries(
        keys.map((key) => [key, entry(key).read(raw[entry(key).name])]),
      ) as SearchFilter<E>;
    },

    href(path: string, filter: Partial<SearchFilter<E>>, extra: ListHrefParams = {}): Route {
      const written: Record<string, Written> = {};
      for (const key of keys) {
        const value = filter[key];
        if (value !== undefined) written[entry(key).name] = entry(key).write(value);
      }
      return listHref(path, { ...written, ...extra });
    },

    /** `lookups` go to every entry; only a slug entry reads them. */
    variables(filter: SearchFilter<E>, lookups?: SearchLookups): Record<string, unknown> {
      return Object.fromEntries(
        keys.map((key) => [entry(key).variable, entry(key).toVariable(filter[key], lookups)]),
      );
    },

    /** A cursor names a spot in one filter's results, so under another it is a wrong page or an error. */
    changed(
      place: Partial<SearchFilter<E>> & SearchCursor,
      change: Partial<SearchFilter<E>>,
    ): Partial<SearchFilter<E>> {
      const { after: _after, before: _before, ...filter } = place;
      return { ...filter, ...change } as Partial<SearchFilter<E>>;
    },
  };
}
