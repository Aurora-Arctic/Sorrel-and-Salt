import type { ReactNode } from 'react';

/**
 * How a list moves to another of its pages: `soft`, a client-side navigation
 * inside a transition, or `full`, a whole page load, which runs the admin
 * layout's guard again (claude-docs/components/pager.md).
 */
export type ListNavigationKind = 'soft' | 'full';

/** A list's page on its way, shared by its filter, its pager and its body (`index.tsx`). */
export interface ListNavigation {
  /** True from a filter's or a pager's press until the new page renders, or the browser leaves. */
  pending: boolean;
  /** Opens another page of the list, filtered or paged, the way `kind` says; nothing while one is pending. */
  go: (href: string, kind: ListNavigationKind) => void;
}

export interface ListFrameProps {
  /** The list's own root class, beside `list-frame`: "user-list". */
  className?: string;
  /** The filter, then the `ListBody`. */
  children: ReactNode;
}

export interface ListBodyProps {
  /** What the skeleton stands in for: `table` (the default), or `cards`, a grid of ingredient cards. */
  shape?: 'table' | 'cards';
  /** The table or its empty state, then the pager: what the skeleton stands in for. */
  children: ReactNode;
}
