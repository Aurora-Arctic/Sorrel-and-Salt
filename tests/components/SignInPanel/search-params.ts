import { useMemo, useSyncExternalStore } from 'react';
import { vi } from 'vitest';

// A stand-in for the address bar's query that `useSearchParams` reads. The panel changes it with
// `history.pushState`, which happy-dom does not report to Next's router, so `installHistory` routes
// the push here and the hook below re-renders on it.
let query = '';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function setQuery(next: string): void {
  query = next;
  listeners.forEach((listener) => listener());
}

export function useSearchParams(): URLSearchParams {
  const current = useSyncExternalStore(
    subscribe,
    () => query,
    () => query,
  );
  return useMemo(() => new URLSearchParams(current), [current]);
}

/** Records each `pushState` the panel makes as the query it left, and returns the spy. */
export function installHistory() {
  return vi.spyOn(window.history, 'pushState').mockImplementation((_state, _unused, url) => {
    setQuery(String(url).split('?')[1] ?? '');
  });
}
