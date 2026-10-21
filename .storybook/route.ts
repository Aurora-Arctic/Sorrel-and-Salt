import type { Route } from 'next';

// Typed routes (next.config `typedRoutes`) make `Route` a union that has no dynamic
// addresses in it, so a stand-in href such as `/coven/fixture-coven` is not a `Route` on
// its own. The call site is still checked against the real address list through `T`; only
// the return widens, the same helper `src/app/invite/[token]/page.tsx` uses.
export const route = <T extends string>(href: Route<T>): Route => href as Route;
