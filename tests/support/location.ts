import { vi } from 'vitest';

/**
 * Stands a recording `assign` in for the page's `location.assign`, which a test cannot spy on (a browser's own
 * is unforgeable and happy-dom's is a getter). `origin` and `href` carry over by name, as a spread of
 * `window.location` loses them. Undone by `vi.unstubAllGlobals()`.
 */
export function stubLocationAssign(assign: (url: string) => void): void {
  vi.stubGlobal('location', {
    origin: window.location.origin,
    href: window.location.href,
    assign,
  });
}
