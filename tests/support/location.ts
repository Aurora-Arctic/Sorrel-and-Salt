import { expect, type Mock, vi } from 'vitest';
import { getSnapshot } from '@/lib/navigation/store';

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

/**
 * Records, at each call of `load` (a stubbed `assign` or `reload`), whether the page had already reported it was
 * leaving (src/lib/navigation/store.ts), which is what keeps the bar and the busy hint up through a full page load.
 * Clears the report first, as a restore from the back-forward cache does, so the record starts on a page not leaving.
 */
export function leavingAtEachLoad(load: Mock): boolean[] {
  window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
  // Precondition: nothing has reported leaving yet, so a true below was set by the code under test.
  expect(getSnapshot()).toBe(false);
  const seen: boolean[] = [];
  load.mockImplementation(() => {
    seen.push(getSnapshot());
  });
  return seen;
}

/** Stands a recording `reload` in for the page's `location.reload`, as `stubLocationAssign` does for `assign`. */
export function stubLocationReload(reload: () => void): void {
  vi.stubGlobal('location', {
    origin: window.location.origin,
    href: window.location.href,
    reload,
  });
}
