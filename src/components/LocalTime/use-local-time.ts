import { useSyncExternalStore } from 'react';

// The local zone never changes while a page is open, so there is nothing to subscribe to.
const subscribe = (): (() => void) => () => undefined;

/**
 * `print` in the viewer's own zone, or `timeZone` where given, as plain text: for a tip or hidden text, which take a string
 * where `LocalTime` draws a `<time>`. The server and hydration print UTC; once hydrated it prints the viewer's zone, read as an
 * external store so the two renders never mismatch.
 */
export function useLocalTime(
  print: (zone: string | undefined) => string,
  timeZone?: string,
): string {
  return useSyncExternalStore(
    subscribe,
    () => print(timeZone),
    () => print('UTC'),
  );
}
