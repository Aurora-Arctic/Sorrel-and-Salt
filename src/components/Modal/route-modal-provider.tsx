'use client';

import type { Route } from 'next';
import { type MouseEvent, type ReactElement, createContext, useContext, useState } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import type { ModalHeading, RouteModalOpener, RouteModalProviderProps } from './types';

// A route modal pressed open and on its way: the press opens the modal with its head over a
// skeleton, and the navigation runs in this transition so the skeleton holds until the page
// renders (claude-docs/components/modal.md, "Opening at once").

export const RouteModalContext = createContext<RouteModalOpener | null>(null);

/**
 * Holds the opening the links and the page's modal share, around every keeper
 * page (`src/app/(shell)/keepers/layout.tsx`). A provider already above, the
 * workshop's, is kept rather than shadowed.
 */
export const RouteModalProvider = ({ children }: RouteModalProviderProps): ReactElement => {
  const outer = useContext(RouteModalContext);
  const { pending, navigate } = usePendingNavigation();
  const [opening, setOpening] = useState<{ heading: ModalHeading; place?: string }>();
  // Kept past the close, which reads it as the modal leaves the page.
  const [opened, setOpened] = useState<Route>();
  const value = outer ?? {
    loading: pending ? opening?.heading : undefined,
    loadingPlace: opening?.place,
    opened,
    open: (href, heading, place) => {
      setOpening({ heading, place });
      setOpened(href);
      navigate(href, { scroll: false });
    },
    cancel: () => setOpening(undefined),
  };
  return <RouteModalContext.Provider value={value}>{children}</RouteModalContext.Provider>;
};

export function useRouteModalOpener(): RouteModalOpener | undefined {
  return useContext(RouteModalContext) ?? undefined;
}

export function useOpenModalClick(
  href: Route,
  heading: ModalHeading | undefined,
  place?: string,
): ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined {
  const opener = useRouteModalOpener();
  if (!opener || !heading) return undefined;
  return (event) => {
    const { button, metaKey, ctrlKey, shiftKey, altKey, defaultPrevented } = event;
    if (defaultPrevented || button !== 0 || metaKey || ctrlKey || shiftKey || altKey) return;
    event.preventDefault();
    opener.open(href, heading, place);
  };
}
