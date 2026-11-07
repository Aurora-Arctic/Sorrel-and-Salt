import type { ReactNode } from 'react';

export interface PageColumnProps {
  /** The element: the page's `main` landmark (the default), or a `div` where a layout already holds the landmark. */
  as?: 'main' | 'div';
  className?: string;
  children: ReactNode;
}
