import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

// The browser's path, since `usePathname` answers `/_not-found` for an unmatched address. Server render and
// hydration give the router's path unless that is the framework's, then `null`.

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
