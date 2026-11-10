import type { ReactNode } from 'react';

export interface PageWithNavProps {
  /** The element: the page's `main` landmark (the default), or a `div` where a layout already holds the landmark. */
  as?: 'main' | 'div';
  /** The page has no heading of its own above the menu: a tab of a tabbed page. */
  headless?: boolean;
  className?: string;
  children: ReactNode;
}
