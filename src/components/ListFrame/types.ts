import type { ReactNode } from 'react';

/**
 * How a list moves to another page: `soft` (client-side, in a transition), `page` (soft, keeps the reader at the list) or `full` (whole load, which reruns the admin layout's guard)
 * (claude-docs/components/pager.md).
 * (claude-docs/components/list-frame.md, "Navigation modes").
 */
export type ListNavigationKind = 'soft' | 'page' | 'full';

/** A list's page on its way, shared by its filter, its pager and its body (`index.tsx`). */
export interface ListNavigation {
  /** True from a filter's or a pager's press until the new page renders, or the browser leaves. */
  pending: boolean;
  /**
   * True only while a filter's soft navigation is pending: the search itself is on its way, not just
   * another page of the same one. A pager press leaves it false, so the search sentence does not retype.
   */
  searching: boolean;
  /**
   * The address a filter's soft navigation is opening, while it is pending: what is being searched
   * for, where the page still shown is the previous search. Undefined when nothing is on its way.
   */
  target?: string;
  /** Opens another page of the list, filtered or paged, the way `kind` says; nothing while one is pending. */
  go: (href: string, kind: ListNavigationKind) => void;
  /** A pager end's press: the height in pixels the body had then, which its skeleton keeps (`index.tsx`). */
  heldHeight?: number;
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
