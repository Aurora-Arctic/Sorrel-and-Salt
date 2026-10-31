import {
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';

// What `next/navigation` reads in the workshop. The framework (@storybook/nextjs-vite) wraps every
// story in the App Router's contexts, with a router that goes nowhere and `usePathname` reading
// `parameters.nextjs.navigation.pathname` (preview.tsx). The providers below put a different
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

/**
 * The address's query as `useSearchParams` reads it, following the story's own
 * `history.pushState`, `replaceState` and Back as Next's router does on a page. For a component
 * whose open state is a search parameter, such as Spell Preview's `?preview`. `initial`'s
 * parameters are added to the frame's address as it mounts, so the component reads the same query
 * from `window.location`; unmounted, it puts the methods and the address back as it found them.
 */
export function WorkshopSearch({
  initial = '',
  children,
}: {
  initial?: string;
  children?: ReactNode;
}): ReactElement {
  useLayoutEffect(() => {
    const before = window.location.href;
    HISTORY.replaceState.call(
      window.history,
      window.history.state,
      '',
      withParams(before, initial),
    );
    return () => HISTORY.replaceState.call(window.history, window.history.state, '', before);
  }, [initial]);
  const search = useSyncExternalStore(followHistory, () => window.location.search);
  const params = useMemo(() => new URLSearchParams(search), [search]);
  return <SearchParamsContext.Provider value={params}>{children}</SearchParamsContext.Provider>;
}

// The frame's own methods, kept before any story patches them.
const HISTORY = { pushState: window.history.pushState, replaceState: window.history.replaceState };

/** Calls `changed` after every push, replace and Back until unsubscribed, as the router hears them. */
function followHistory(changed: () => void): () => void {
  const { pushState, replaceState } = HISTORY;
  window.history.pushState = (...args) => {
    pushState.apply(window.history, args);
    changed();
  };
  window.history.replaceState = (...args) => {
    replaceState.apply(window.history, args);
    changed();
  };
  window.addEventListener('popstate', changed);
  return () => {
    window.history.pushState = pushState;
    window.history.replaceState = replaceState;
    window.removeEventListener('popstate', changed);
  };
}

function withParams(href: string, initial: string): URL {
  const url = new URL(href);
  for (const [key, value] of new URLSearchParams(initial)) url.searchParams.set(key, value);
  return url;
}
