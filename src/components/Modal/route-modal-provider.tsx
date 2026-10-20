'use client';

import type { Route } from 'next';
import { type MouseEvent, type ReactElement, createContext, useContext, useState } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import type { ModalHeading, RouteModalOpener, RouteModalProviderProps } from './types';

// A route modal pressed open and on its way (M9.18, the owner's call: a press
// should open the modal at once, loading as a filter does). The press opens
// the modal with its head over a skeleton, and the navigation to its address
// runs in this transition, so the skeleton holds until Next has rendered the
// page with the modal's contents, which arrive in the same dialog. The
// contents still come with the navigation, from the server page's own reads,
// rather than through GraphQL: a read with a navigation is the server
// component's (CLAUDE.md rule 1; claude-docs/components/modal.md,
// "Opening at once").

/**
 * The modal on its way, shared by the links that open it and the page's
 * `RouteModal` that shows it. Exported for the workshop, whose stub router
 * goes nowhere, to draw a modal on its way.
 */
export const RouteModalContext = createContext<RouteModalOpener | null>(null);

/**
 * Holds the opening the links and the page's modal share, around every admin
 * page (`src/app/(shell)/admin/layout.tsx`). A provider already above, the
 * workshop's, is kept rather than shadowed.
 */
export const RouteModalProvider = ({ children }: RouteModalProviderProps): ReactElement => {
  const outer = useContext(RouteModalContext);
  const { pending, navigate } = usePendingNavigation();
  const [opening, setOpening] = useState<ModalHeading>();
  // Kept past the close, which reads it as the modal leaves the page.
  const [opened, setOpened] = useState<Route>();
  const value = outer ?? {
    loading: pending ? opening : undefined,
    opened,
    open: (href, heading) => {
      setOpening(heading);
      setOpened(href);
      navigate(href);
    },
    cancel: () => setOpening(undefined),
  };
  return <RouteModalContext.Provider value={value}>{children}</RouteModalContext.Provider>;
};

/** The opening, or undefined outside a provider, where a link stays a plain link. */
export function useRouteModalOpener(): RouteModalOpener | undefined {
  return useContext(RouteModalContext) ?? undefined;
}

/**
 * A link's click that opens its route modal at once, under a provider: a
 * plain press of the main button. A press with a modifier or another button
 * is the browser's, a new tab or window, so it is left to the link, as is
 * every press outside a provider and before the page's script has loaded.
 */
export function useOpenModalClick(
  href: Route,
  heading: ModalHeading,
): ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined {
  const opener = useRouteModalOpener();
  if (!opener) return undefined;
  return (event) => {
    const { button, metaKey, ctrlKey, shiftKey, altKey, defaultPrevented } = event;
    if (defaultPrevented || button !== 0 || metaKey || ctrlKey || shiftKey || altKey) return;
    event.preventDefault();
    opener.open(href, heading);
  };
}
