// Imports nothing: `validation.ts` reaches this file through `errors.ts`, and a
// validation schema may reach no package but zod — so a type that needs a
// table or a library goes in `session.ts` or its own module's `types.ts`
// (claude-docs/modules.md, "Where types live").

/** A connection field's arguments, as the Relay plugin hands them to a resolver. */
export interface ConnectionArgs {
  first?: number | null;
  last?: number | null;
  after?: string | null;
  before?: string | null;
}

/**
 * A position in a list: each part of the row's sort key, as Postgres prints
 * it, and its id as the tie-break. Never an offset, so a row inserted or
 * deleted ahead of it cannot shift the page under a reader. The parts are text
 * because a `timestamptz` read into a JS `Date` loses its microseconds. How
 * many parts a list's key has is the list's to check, not the codec's.
 */
export interface Cursor {
  key: readonly string[];
  id: string;
}

/** What a repository page finder is asked for. */
export interface PageRequest {
  after?: Cursor;
  before?: Cursor;
  /** Rows to fetch: the page plus one, whose presence says another page follows. */
  limit: number;
  /** Walking backwards (`last`): rows come nearest-first and the page reverses them. */
  inverted: boolean;
}

/**
 * One row of a page, with the position it was found at, and whatever else the
 * finder carries beside it — `Edge` — which becomes a field of its edge.
 */
export type PageEntry<T, Edge extends object = {}> = { cursor: Cursor; node: T } & Edge;

/**
 * A list's size under its filter, and how many of its rows come before a
 * page's first — null on an empty page, which has no first row. Counted from
 * a key and never used to seek, so it labels a page and never finds one.
 */
export interface PageCount {
  totalCount: number;
  countBefore: number | null;
}

export interface Page<T, Edge extends object = {}> {
  edges: ({ cursor: string; node: T } & Edge)[];
  pageInfo: {
    startCursor: string | null;
    endCursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type ProviderId = 'google' | 'discord' | 'facebook' | 'microsoft';

export interface SocialProvider {
  id: ProviderId;
  label: string;
}

/** One of a user's provider accounts: the row id `/unlink-account` takes, and its provider. */
export interface LinkedAccount {
  id: string;
  providerId: ProviderId;
}

/** One rule a value broke, pathed to the input field it is about. */
export interface ValidationIssue {
  /** In the shape of the operation's input — `['folkNames', 2]`; empty for no one field. */
  path: (string | number)[];
  message: string;
}

export type Message = { to: string; subject: string; text: string; html: string };

export type Outgoing = { url: string; headers: Record<string, string>; body: unknown };

/** Optional when the document declares no variables, required when it does. */
export type VariablesArg<TVariables> =
  TVariables extends Record<string, never> ? [variables?: TVariables] : [variables: TVariables];

/** What is read off each error in the chain; `cause` is typed on `Error` only from ES2022's lib. */
export interface ChainedError {
  cause?: unknown;
  code?: unknown;
  constraint_name?: unknown;
}
