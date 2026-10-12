import { useSyncExternalStore } from 'react';

// Whether this render runs in a browser that has hydrated the page, for a
// control the server draws one way and the browser another: the admin
// filters' type-ahead, served as a native `<select>` so the form submits
// before any JavaScript runs (claude-docs/components/filter-form.md).
//
// A store with nothing in it rather than `useState(false)` set true in a
// `useEffect`: the effect would draw the server's version once more after
// hydration and then swap, where the store's server snapshot is used only
// for the server render and hydration itself, and every render after reads
// the client snapshot straight away.

// Nothing to subscribe to: the snapshot differs only between the server's
// render, and the hydration that follows it, and every render after.
const noSubscription = () => () => {};

/** False on the server and in the render that hydrates it; true in every render after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}
