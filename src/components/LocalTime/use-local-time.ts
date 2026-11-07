import { useSyncExternalStore } from 'react';

// The local zone never changes while a page is open, so there is nothing to subscribe to.
const subscribe = (): (() => void) => () => undefined;

/** As plain text, for a tip or hidden text, which take a string where `LocalTime` draws a `<time>`. */
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
