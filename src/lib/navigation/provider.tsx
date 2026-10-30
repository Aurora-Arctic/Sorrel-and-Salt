'use client';

import { useRouter } from 'next/navigation';
import {
  type ReactElement,
  type ReactNode,
  createContext,
  startTransition,
  useMemo,
  useOptimistic,
  useState,
} from 'react';
import { LeaveGuardContext, leaveGuardSlot } from './leave-guard';
import type { NavigateOptions, NavigationTarget } from './types';

/** The navigation on its way: who started it, and where it is headed. */
export type ActiveNavigation = { owner: symbol; target: NavigationTarget | undefined };

/** What the provider lets a caller do. `owner` is the caller's own identity, for its `pending`. */
export type NavigationActions = {
  navigate: (owner: symbol, href: string, options?: NavigateOptions) => void;
  refresh: (owner: symbol) => void;
};

export const ActiveNavigationContext = createContext<ActiveNavigation | undefined>(undefined);
export const NavigationActionsContext = createContext<NavigationActions | null>(null);

/**
 * Owns every navigation the site starts. It is mounted once and never unmounts, so
 * a wait is never lost with the control that began it; React puts the optimistic
 * wait back when the transition ends. A mounted form with unsaved changes is waited on first. (claude-docs/design-decisions/m12.33-loading-standard.md, "Navigation provider")
 */
export function NavigationProvider({ children }: { children: ReactNode }): ReactElement {
  const router = useRouter();
  const [active, setActive] = useOptimistic<ActiveNavigation | undefined>(undefined);
  const [guards] = useState(leaveGuardSlot);

  const actions = useMemo<NavigationActions>(
    () => ({
      navigate: (owner, href, options) => {
        // Options reach the router only when given, so a plain call is a
        // plain `push(href)`.
        const routerOptions =
          options?.scroll === undefined ? undefined : { scroll: options.scroll };
        guards.leave(() =>
          startTransition(() => {
            setActive({ owner, target: options?.target });
            const go = options?.replace ? router.replace : router.push;
            if (routerOptions) go(href as never, routerOptions);
            else go(href as never);
          }),
        );
      },
      refresh: (owner) => {
        startTransition(() => {
          setActive({ owner, target: undefined });
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
