import type { Route } from 'next';

// Typed routes make `Route` a union with no dynamic addresses, so a stand-in href such as
// `/coven/fixture-coven` is not a `Route` alone. The call site is still checked through `T`; only the
// return widens, as in `src/app/invite/[token]/page.tsx`.
export const route = <T extends string>(href: Route<T>): Route => href as Route;
