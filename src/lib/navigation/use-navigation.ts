'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useSyncExternalStore, useTransition } from 'react';
import { begin, getServerSnapshot, getSnapshot, settle, subscribe } from './store';
import type { NavigateOptions, NavigationState, PendingNavigation } from './types';

/** The site-wide state: busy while any navigation is on its way, and where it is headed. */
export function useNavigationState(): NavigationState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The one way the site navigates. The router call runs inside a transition,
 * which Next keeps pending until the new page has rendered; that is the only
 * signal available, because a `loading.tsx` or route `<Suspense>` would turn
 * the guards' 404, 403 and 308 responses into 200s. `pending` is this
 * caller's own, and the site-wide store carries the same navigation for
 * everything else.
 */
export function usePendingNavigation(): PendingNavigation {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useRef(Symbol('navigation'));
  const started = useRef(false);

  // The transition's end is the settle. Waiting to see `pending` true first
  // stops the effect clearing a navigation begun in the same render.
  useEffect(() => {
    if (pending) started.current = true;
    else if (started.current) {
      started.current = false;
      settle(id.current);
    }
  }, [pending]);
  useEffect(() => {
    const own = id.current;
    return () => settle(own);
  }, []);

  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      begin(id.current, options?.target);
      // Options reach the router only when given, so a plain call is a
      // plain `push(href)`.
      const routerOptions = options?.scroll === undefined ? undefined : { scroll: options.scroll };
      startTransition(() => {
        const go = options?.replace ? router.replace : router.push;
        if (routerOptions) go(href as never, routerOptions);
        else go(href as never);
      });
    },
    [router],
  );

  const refresh = useCallback(() => {
    begin(id.current, undefined);
    startTransition(() => router.refresh());
  }, [router]);

  return { pending, navigate, refresh };
}
