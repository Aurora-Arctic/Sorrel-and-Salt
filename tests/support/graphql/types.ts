import type { Context } from '@/graphql/types';

/** One error as the route sends it: `extensions` is what `maskError` attached. */
export interface WireError {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; fieldErrors?: { path: (string | number)[]; message: string }[] };
}

/** A GraphQL response body, as the browser receives it. */
export interface Answer<T> {
  data?: T | null;
  errors?: WireError[];
}

/** The rest of a request's context, which a test hands `run` in place of the fresh one. */
export type ContextOverrides = Partial<Omit<Context, 'session'>>;
