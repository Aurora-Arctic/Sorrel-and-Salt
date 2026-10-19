// The one piece of navigation state kept outside React: the browser has been
// told to leave for a full page load (an OAuth redirect, say). Nothing in
// React ends that wait, since the next page replaces this one rather than
// rendering into it, so it cannot ride a transition the way a navigation does.
// Read with `useSyncExternalStore`. A navigation's own state is the provider's
// optimistic value (`provider.tsx`), which `useSyncExternalStore` cannot see.

let leaving = false;
const listeners = new Set<() => void>();

function publish(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSnapshot = (): boolean => leaving;
export const getServerSnapshot = (): boolean => false;

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
