import { vi } from 'vitest';

// A test cannot spy on `location.assign` (a browser's is unforgeable, happy-dom's a getter); `origin` and `href` carry over by name, as a spread loses them. Undone by `vi.unstubAllGlobals()`.
export function stubLocationAssign(assign: (url: string) => void): void {
  vi.stubGlobal('location', {
    origin: window.location.origin,
    href: window.location.href,
    assign,
  });
}
