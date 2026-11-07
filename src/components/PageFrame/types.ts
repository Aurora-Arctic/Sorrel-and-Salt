import type { ReactNode } from 'react';

export interface PageFrameProps {
  /** The element: the page's `main` landmark (the default), or a `div` where a layout already holds the landmark. */
  as?: 'main' | 'div';
  /** The narrow frame the forms and the sign-in pages stand in. */
  narrow?: boolean;
  className?: string;
  children: ReactNode;
}
