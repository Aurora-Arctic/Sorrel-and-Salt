import type { ReactNode } from 'react';

export interface NarrowPanelPageProps {
  /** The page's `main` landmark (the default), or a `div` where a layout already holds the landmark. */
  as?: 'main' | 'div';
  /** The band drawn above the frame, such as the coven switcher's row. */
  contextRow?: ReactNode;
  title: string;
  lede?: ReactNode;
  /** A class added to the panel after its own. */
  className?: string;
  children: ReactNode;
}
