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
