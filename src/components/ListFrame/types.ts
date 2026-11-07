import type { ReactNode } from 'react';

/**
 * How a list moves to another page: `soft` (client-side, in a transition), `page` (soft, keeps the reader at the list) or `full` (whole load, which reruns the admin layout's guard)
 * (claude-docs/components/pager.md).
 * (claude-docs/components/list-frame.md, "Contracts").
 */
export type ListNavigationKind = 'soft' | 'page' | 'full';

export interface ListNavigation {
  /** True from a filter's or a pager's press until the new page renders, or the browser leaves. */
  pending: boolean;
  /**
   * True only while a filter's soft navigation is pending: the search itself is on its way, not just
   * another page of the same one. A pager press leaves it false, so the search sentence does not retype.
   */
  searching: boolean;
  target?: string;
  go: (href: string, kind: ListNavigationKind) => void;
  heldHeight?: number;
}

export interface ListFrameProps {
  /** The list's own root class, beside `list-frame`: "user-list". */
  className?: string;
  /** Draws the list as a placeholder: its controls disabled and the whole frame hidden from assistive technology, for a skeleton. */
  disabled?: boolean;
  /** The filter, then the `ListBody`. */
  children: ReactNode;
}

export interface ListBodyProps {
  /** What the body draws while another page is on its way: the list's own placeholder. */
  skeleton: ReactNode;
  /** The table or its empty state, then the pager: what the skeleton stands in for. */
  children: ReactNode;
}
