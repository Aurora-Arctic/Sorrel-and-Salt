'use client';

import { useRouter } from 'next/navigation';
import {
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { ActiveNavigationContext, NavigationActionsContext } from './provider';
import { getServerSnapshot, getSnapshot, subscribe } from './store';
import type { NavigateOptions, NavigationState, PendingNavigation } from './types';

const IDLE: NavigationState = { busy: false, target: undefined };

/**
 * The site-wide state: busy while any navigation is on its way, and where it
 * is headed. A navigation's part is the provider's optimistic value; a full
 * page load's part is the external store's.
 */
export function useNavigationState(): NavigationState {
  const active = useContext(ActiveNavigationContext);
  const leaving = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const target = active?.target;
  return useMemo(
    () => (active || leaving ? { busy: true, target } : IDLE),
    [active, leaving, target],
  );
}

/**
 * The one way the site navigates. The router call runs inside a transition
 * the provider owns, which Next keeps pending until the new page has
 * rendered; that is the only signal available, because a `loading.tsx` or
 * route `<Suspense>` would turn the guards' 404, 403 and 308 responses into
 * 200s. `pending` is true for the caller whose navigation is showing, and the
 * site-wide state carries the same navigation for everything else.
 */
export function usePendingNavigation(): PendingNavigation {
  const actions = useContext(NavigationActionsContext);
  const active = useContext(ActiveNavigationContext);
  const [owner] = useState(() => Symbol('navigation'));
  const router = useRouter();

  // Outside the provider (a Storybook story, a component test) a call is a plain
  // router call in a transition: it navigates, and nothing shows a wait.
  const start = actions?.navigate;
  const reload = actions?.refresh;
  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      if (start) return start(owner, href, options);
      const go = options?.replace ? router.replace : router.push;
      startTransition(() => {
        if (options?.scroll === undefined) go(href as never);
        else go(href as never, { scroll: options.scroll });
      });
    },
    [start, router, owner],
  );
  const refresh = useCallback(() => {
    if (reload) return reload(owner);
    startTransition(() => router.refresh());
  }, [reload, router, owner]);

  return { pending: active?.owner === owner, navigate, refresh };
}
