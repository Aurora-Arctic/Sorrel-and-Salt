// What `next/navigation` resolves to in the workshop (vite.config.ts aliases
// it): a router that goes nowhere. Next's own throws outside the App Router,
// which Ladle does not mount, and a story only needs a control to render
// (claude-docs/workshop.md, ".ladle/").

const stay = (): void => undefined;

export function useRouter() {
  return { push: stay, replace: stay, refresh: stay, back: stay, forward: stay, prefetch: stay };
}

// The page the workshop pretends to be on: an admin page, so AdminNav's
// story shows its current-page marker on Users (MB.115). Next's own reads
// the App Router's state, which Ladle does not mount; a story needing
// another page has no way to say so yet, and one has not needed it.
export function usePathname(): string {
  return '/admin/users';
}
