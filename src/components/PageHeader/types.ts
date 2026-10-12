import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** The page's `h1`, title case, and what its tab title says too. */
  title: string;
  /**
   * The page's one primary action, at the end of the heading's line: an Add
   * link (`<Link className="btn btn--solid">`), or a control such as the user
   * list's Pause Admin Changes. Left out, the heading stands alone.
   */
  action?: ReactNode;
}
