import { type ReactElement, type ReactNode, useMemo } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';

// What `next/navigation` reads in the workshop. The framework
// (@storybook/nextjs-vite) already supplies `next/navigation` and `next/link`:
// its decorator wraps every story in the App Router's own contexts, with a
// router whose calls are recorded and go nowhere, and `usePathname` reading the
// page set in preview.tsx's `parameters.nextjs.navigation.pathname`
// (`/admin/users`). Two stories need more than that one fixed answer, so they
// wrap themselves in the two providers below, which put a different value in
// the same contexts the framework fills; Next's real hooks read the nearest one
// (claude-docs/workshop.md, ".storybook/").

/**
 * Sets the page the workshop pretends to be on, as a tabbed page's story does to
 * open another tab. Next's `usePathname` reads it; without a wrapper the
 * page in preview.tsx stands.
 */
export const WorkshopPathname = {
  Provider: ({ value, children }: { value: string; children?: ReactNode }): ReactElement => (
    <PathnameContext.Provider value={value}>{children}</PathnameContext.Provider>
  ),
};

const stay = (): void => undefined;

/**
 * Told where `push` and `replace` were asked to go, by a story that wraps itself
 * in this provider. A `RouteModal` closes by navigating back to its page; with
 * nowhere to go it would stay mounted as a native modal dialog, invisible once
 * faded and holding the rest of the page inert. A story that draws one answers
 * here by unmounting it, as the changed address does in the app. Left
 * unprovided, the framework's router still goes nowhere.
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
