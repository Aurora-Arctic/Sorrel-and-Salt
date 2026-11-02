import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

// The path of the page as the browser has it. Next's `usePathname` answers `/_not-found` for an address that no
// route matches, since that screen is prerendered under the framework's own route, so a screen that reports or
// names the page reads the address bar once it is in the browser. Before that (the server's render and
// hydration) it gives the router's path unless that is the framework's, then `null`.

const FRAMEWORK_ROUTE = '/_not-found';
const noSubscription = () => () => {};

export function useActualPathname(): string | null {
  const routed = usePathname();
  const fallback = routed === FRAMEWORK_ROUTE ? null : routed;
  return useSyncExternalStore(
    noSubscription,
    () => window.location.pathname,
    () => fallback,
  );
}
