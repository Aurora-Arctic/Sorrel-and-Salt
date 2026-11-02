/**
 * A formatted string as Testing Library reads the page: every run of whitespace, the no-break space a 12-hour time keeps
 * before its am or pm included, as one plain space. Testing Library and jest-dom normalise the page's text but not the
 * expected string, so an expected time from `src/lib/utc.ts` goes through this; `tests/lib/utc.test.ts` proves the space.
 */
export function printed(text: string): string {
  return text.replace(/\s+/g, ' ');
}
