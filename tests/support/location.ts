import { vi } from 'vitest';

/**
 * Stands a recording `assign` in for the page's `location.assign`, which a
 * test cannot spy on (a browser's own is unforgeable and happy-dom's is a
 * getter). `origin` and `href` carry over by name: a spread of `window.location`
 * copies them only where the fields are own properties, which is jsdom's
 * doing, and the GraphQL client builds its URL from `origin`.
 * Undone by `vi.unstubAllGlobals()`.
 */
export function stubLocationAssign(assign: (url: string) => void): void {
  vi.stubGlobal('location', {
    origin: window.location.origin,
    href: window.location.href,
    assign,
  });
}
