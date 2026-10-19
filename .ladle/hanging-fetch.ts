import { useLayoutEffect } from 'react';

// A story for a loading state needs a request that never answers, so the wait
// can be looked at as long as needed. While the story is mounted, a request
// whose path starts with `prefix` is left pending; every other request goes to
// the real `fetch`, which the workshop has no server to answer. The original is
// put back on unmount, so no other story sees the stand-in. The GraphQL client
// and Better Auth's client both look `fetch` up on each call, never at import.

/** Leaves requests under `prefix` pending for as long as the story is mounted. */
export function useHangingFetch(prefix: string): void {
  useLayoutEffect(() => {
    const original = window.fetch;
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname.startsWith(prefix)) return new Promise<Response>(() => undefined);
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, [prefix]);
}
