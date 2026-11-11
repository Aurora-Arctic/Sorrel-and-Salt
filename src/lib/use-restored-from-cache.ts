import { useEffect, useRef } from 'react';

/**
 * Runs `onRestore` when the browser brings the page back from its back-forward cache, where state
 * set before leaving would otherwise still show. Listens only while `enabled`.
 */
export function useRestoredFromCache(onRestore: () => void, enabled = true): void {
  const latest = useRef(onRestore);
  useEffect(() => {
    latest.current = onRestore;
  });
  useEffect(() => {
    if (!enabled) return;
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) latest.current();
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, [enabled]);
}
