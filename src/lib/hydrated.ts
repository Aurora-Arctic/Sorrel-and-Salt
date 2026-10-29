import { useSyncExternalStore } from 'react';

// Whether this render runs in a browser that has hydrated, for a control the server draws one way and the browser another (the admin filters' type-ahead,
// a native `<select>` until then; claude-docs/components/filter-form.md). A store, not `useState(false)` set in an effect, which would draw the server's version
// once more after hydration and then swap.

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
