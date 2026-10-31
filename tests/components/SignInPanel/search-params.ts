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

/**
 * Stands in for the address bar: `pushState`, `replaceState` and `back` move a small stack of
 * entries and publish the current query. Returns the spies.
 */
export function installHistory() {
  const entries: { state: unknown; query: string }[] = [{ state: null, query }];
  let index = 0;
  const queryOf = (url: unknown) => String(url ?? '').split('?')[1] ?? '';
  Object.defineProperty(window.history, 'state', {
    configurable: true,
    get: () => entries[index].state,
  });
  const push = vi.spyOn(window.history, 'pushState').mockImplementation((state, _unused, url) => {
    entries.splice(index + 1, entries.length, { state, query: queryOf(url) });
    index += 1;
    setQuery(entries[index].query);
  });
  const replace = vi
    .spyOn(window.history, 'replaceState')
    .mockImplementation((state, _unused, url) => {
      entries[index] = { state, query: queryOf(url) };
      setQuery(entries[index].query);
    });
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
    if (index === 0) return;
    index -= 1;
    setQuery(entries[index].query);
  });
  return { push, replace, back };
}
