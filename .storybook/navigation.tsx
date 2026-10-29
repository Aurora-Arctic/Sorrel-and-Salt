import { type ReactElement, type ReactNode, useMemo } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';

// What `next/navigation` reads in the workshop. The framework (@storybook/nextjs-vite) wraps every
// story in the App Router's contexts, with a router that goes nowhere and `usePathname` reading
// `parameters.nextjs.navigation.pathname` (preview.tsx). The two providers below put a different
// value in the same contexts (claude-docs/workshop.md, ".storybook/").

/**
 * Sets the page the workshop pretends to be on, as a tabbed page's story does to open another tab.
 * Next's `usePathname` reads it; without a wrapper the page in preview.tsx stands.
 */
export const WorkshopPathname = {
  Provider: ({ value, children }: { value: string; children?: ReactNode }): ReactElement => (
    <PathnameContext.Provider value={value}>{children}</PathnameContext.Provider>
  ),
};

const stay = (): void => undefined;

/**
 * Told where `push` and `replace` were asked to go. A `RouteModal` closes by navigating back, and
 * with nowhere to go it stays mounted, invisible and holding the page inert; a story that draws one
 * answers here by unmounting it. Left unprovided, the router still goes nowhere.
 */
export const WorkshopNavigation = {
  Provider: ({
    value,
    children,
  }: {
    value: (href: string) => void;
    children?: ReactNode;
  }): ReactElement => {
    const router = useMemo(
      () => ({
        push: (href: string) => value(href),
        replace: (href: string) => value(href),
        refresh: stay,
        back: stay,
        forward: stay,
        bfcacheId: 'workshop',
        prefetch: stay,
      }),
      [value],
    );
    return <AppRouterContext.Provider value={router}>{children}</AppRouterContext.Provider>;
  },
};
