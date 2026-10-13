import { createContext, useContext } from 'react';

// What `next/navigation` resolves to in the workshop (vite.config.ts aliases
// it): a router that goes nowhere. Next's own throws outside the App Router,
// which Ladle does not mount, and a story only needs a control to render
// (claude-docs/workshop.md, ".ladle/").

const stay = (): void => undefined;

// Told where `push` and `replace` were asked to go, by a story that wraps
// itself in this provider. A `RouteModal` closes by navigating back to its
// page; with nowhere to go it would stay mounted as a native modal dialog,
// invisible once faded and holding the rest of the page inert. A story that
// draws one answers here by unmounting it, as the changed address does in the
// app. Left unprovided, the router still goes nowhere.
export const WorkshopNavigation = createContext<((href: string) => void) | undefined>(undefined);

export function useRouter() {
  const navigated = useContext(WorkshopNavigation);
  const go = (href: string): void => navigated?.(href);
  return { push: go, replace: go, refresh: stay, back: stay, forward: stay, prefetch: stay };
}

// The page the workshop pretends to be on: `/admin/users` unless a story
// says otherwise by wrapping itself in this provider, as a tabbed page's
// story does to open another tab (MB.115). Next's own reads the App Router's
// state, which Ladle does not mount.
export const WorkshopPathname = createContext('/admin/users');

export function usePathname(): string {
  return useContext(WorkshopPathname);
}
