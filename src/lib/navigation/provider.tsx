'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  type ReactElement,
  type ReactNode,
  createContext,
  startTransition,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react';
import { LeaveGuardContext, holdTraversals, leaveGuardSlot } from './leave-guard';
import type { NavigateOptions } from './types';

/** The navigation on its way: who started it, and the address it is headed for. */
export type ActiveNavigation = { owner: symbol; href: string | undefined };

/** `owner` is the caller's own identity, for its `pending`. */
export type NavigationActions = {
  navigate: (owner: symbol, href: string, options?: NavigateOptions) => void;
  refresh: (owner: symbol) => void;
};

export const ActiveNavigationContext = createContext<ActiveNavigation | undefined>(undefined);
export const NavigationActionsContext = createContext<NavigationActions | null>(null);

/**
 * Moves the address bar and the history to `href` before the router has the page. Next writes its own entry only when the page arrives, so a Back pressed in
 * the meantime would pass the page being left. The entry carries the current one's router state, which Next's `pushState` patch takes as its own and leaves the
 * router alone; the router then replaces this entry, with the page's final address, when it arrives. The tree it carries is the page being left, so a Forward onto an entry whose page never arrived is fetched afresh instead (`holdEarlyEntries`); an arrival overwrites the state, marker included. Only a move to another path qualifies, and only on an entry the router wrote.
 */
function pushAtOnce(href: string, from: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const state: unknown = window.history.state;
  if (!state || (state as { __NA?: unknown }).__NA !== true) return false;
  if (new URL(href, window.location.href).pathname === from) return false;
  window.history.pushState({ ...state, earlyEntry: true }, '', href);
  return true;
}

/** Runs before Next's own `popstate` listener (a child's effect runs first), so the page of an early entry is fetched rather than drawn from the wrong tree. */
function holdEarlyEntries(refetch: (href: string) => void): () => void {
  const onPopState = (event: PopStateEvent) => {
    if (!(event.state as { earlyEntry?: unknown } | null)?.earlyEntry) return;
    event.stopImmediatePropagation();
    refetch(`${window.location.pathname}${window.location.search}`);
  };
  window.addEventListener('popstate', onPopState);
  return () => window.removeEventListener('popstate', onPopState);
}

/** Mounted once and never unmounts, so a wait is never lost with the control that began it; React puts the optimistic wait back when the transition ends. A mounted form with unsaved changes is waited on first (claude-docs/design-decisions/ui.md, "Navigation provider"). */
export function NavigationProvider({ children }: { children: ReactNode }): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(pathname);
  useEffect(() => {
    shown.current = pathname;
  }, [pathname]);
  const [active, setActive] = useOptimistic<ActiveNavigation | undefined>(undefined);
  const [guards] = useState(leaveGuardSlot);
  useEffect(() => holdTraversals(guards), [guards]);
  useEffect(() => holdEarlyEntries((href) => router.replace(href as never)), [router]);

  const actions = useMemo<NavigationActions>(
    () => ({
      navigate: (owner, href, options) => {
        // Options reach the router only when given, so a plain call is a
        // plain `push(href)`.
        const routerOptions =
          options?.scroll === undefined ? undefined : { scroll: options.scroll };
        guards.leave(() =>
          startTransition(() => {
            setActive({ owner, href });
            // The router replaces an entry already pushed, so a redirect on the way leaves one entry, not two.
            const pushed = !options?.replace && pushAtOnce(href, shown.current);
            const go = options?.replace || pushed ? router.replace : router.push;
            if (routerOptions) go(href as never, routerOptions);
            else go(href as never);
          }),
        );
      },
      refresh: (owner) => {
        startTransition(() => {
          setActive({ owner, href: undefined });
          router.refresh();
        });
      },
    }),
    [router, setActive, guards],
  );

  return (
    <LeaveGuardContext value={guards}>
      <NavigationActionsContext value={actions}>
        <ActiveNavigationContext value={active}>{children}</ActiveNavigationContext>
      </NavigationActionsContext>
    </LeaveGuardContext>
  );
}
