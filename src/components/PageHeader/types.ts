import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** The page's `h1`, title case, and what its tab title says too. */
  title: string;
  /** The `h1`'s id, for a landmark or an article that takes the heading as its name. */
  id?: string;
  /**
   * The small capitals above the heading that name the part of the site. Only
   * the public pages and the screens outside the app's lists carry one; a list
   * page's heading stands alone (claude-docs/styling.md, "Page heads").
   */
  eyebrow?: string;
  /**
   * The muted sentence or two under the heading saying what the page is for,
   * drawn in a `p.lede`. The same pages as the eyebrow carry one.
   */
  lede?: ReactNode;
  /**
   * A mark before the heading, on its line and outside the `h1`: the entry
   * page's In Your Cupboard shelf. Left out, the heading stands alone.
   */
  lead?: ReactNode;
  /**
   * A mark inside the `h1`, at the title's top right: the demo coven's Demo
   * badge. Left out, the heading is the title alone.
   */
  tag?: ReactNode;
  /**
   * The page's one primary action, at the end of the heading's line: an Add
   * link (`<Link className="btn btn--solid">`), or a control such as the user
   * list's Pause Admin Changes. Left out, the heading stands alone.
   */
  action?: ReactNode;
  /** A class for the head's outer element, for the one place that lays it out further. */
  className?: string;
}
