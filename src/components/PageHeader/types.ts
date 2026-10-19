import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** The page's `h1`, title case, and what its tab title says too. */
  title: string;
  /**
   * A mark before the heading, on its line and outside the `h1`: the entry
   * page's In Your Cupboard shelf. Left out, the heading stands alone.
   */
  lead?: ReactNode;
  /**
   * The page's one primary action, at the end of the heading's line: an Add
   * link (`<Link className="btn btn--solid">`), or a control such as the user
   * list's Pause Admin Changes. Left out, the heading stands alone.
   */
  action?: ReactNode;
}
