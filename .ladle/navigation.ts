import { createContext, useContext } from 'react';

// What `next/navigation` resolves to in the workshop (vite.config.ts aliases
// it): a router that goes nowhere. Next's own throws outside the App Router,
// which Ladle does not mount, and a story only needs a control to render
// (claude-docs/workshop.md, ".ladle/").

const stay = (): void => undefined;

export function useRouter() {
  return { push: stay, replace: stay, refresh: stay, back: stay, forward: stay, prefetch: stay };
}

// The page the workshop pretends to be on: `/admin/users` unless a story
// says otherwise by wrapping itself in this provider, as a tabbed page's
// story does to open another tab (MB.115). Next's own reads the App Router's
// state, which Ladle does not mount.
export const WorkshopPathname = createContext('/admin/users');

export function usePathname(): string {
  return useContext(WorkshopPathname);
}
