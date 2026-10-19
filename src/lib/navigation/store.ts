import type { NavigationState, NavigationTarget } from './types';

// The site-wide navigation state, outside React so a caller deep in a page
// and the bar in the providers read the same thing without a context
// re-rendering the whole tree. Read with `useSyncExternalStore`.

const IDLE: NavigationState = { busy: false, target: undefined };

type Entry = { id: symbol; target: NavigationTarget | undefined };

let entries: Entry[] = [];
let leaving = false;
let snapshot: NavigationState = IDLE;
const listeners = new Set<() => void>();

function publish(): void {
  const busy = leaving || entries.length > 0;
  const target = entries[entries.length - 1]?.target;
  // The snapshot keeps its identity until something changes, as
  // `useSyncExternalStore` requires.
  if (busy !== snapshot.busy || target !== snapshot.target) {
    snapshot = busy ? { busy, target } : IDLE;
    for (const listener of listeners) listener();
  }
}

/** A caller's navigation has begun; the latest target wins. */
export function begin(id: symbol, target: NavigationTarget | undefined): void {
  entries = [...entries.filter((entry) => entry.id !== id), { id, target }];
  publish();
}

/** The caller's navigation has settled. */
export function settle(id: symbol): void {
  if (!entries.some((entry) => entry.id === id)) return;
  entries = entries.filter((entry) => entry.id !== id);
  publish();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSnapshot = (): NavigationState => snapshot;
export const getServerSnapshot = (): NavigationState => IDLE;

function onPageShow(event: PageTransitionEvent): void {
  // A page shown fresh is not this one come back; only a restore from the
  // back-forward cache is.
  if (!event.persisted) return;
  window.removeEventListener('pageshow', onPageShow);
  leaving = false;
  publish();
}

/**
 * The browser is leaving for a full page load, an OAuth redirect say. Busy
 * stays on until the page is restored from the back-forward cache: nothing
 * on this page can tell when the other one has loaded.
 */
export function reportLeaving(): void {
  if (typeof window === 'undefined') return;
  leaving = true;
  window.removeEventListener('pageshow', onPageShow);
  window.addEventListener('pageshow', onPageShow);
  publish();
}
