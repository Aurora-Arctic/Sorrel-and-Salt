// What `next/navigation` resolves to in the workshop (vite.config.ts aliases
// it): a router that goes nowhere. Next's own throws outside the App Router,
// which Ladle does not mount, and a story only needs a control to render
// (claude-docs/workshop.md, ".ladle/").

const stay = (): void => undefined;

export function useRouter() {
  return { push: stay, replace: stay, refresh: stay, back: stay, forward: stay, prefetch: stay };
}
