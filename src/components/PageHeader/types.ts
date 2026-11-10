import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** The page's `h1`, title case, and what its tab title says too. */
  title?: ReactNode;
  /** Draws a placeholder bar in the `h1` in place of the title, for a head whose title is not known yet: a skeleton's. `2` stands for a title that wraps to two lines. */
  pendingTitle?: boolean | 2;
  /** `h3` for a view under a dialog's own title. */
  level?: 'h1' | 'h2' | 'h3';
  greeting?: string;
  /** The `h1`'s id, for a landmark or an article that takes the heading as its name. */
  id?: string;
  /** The small capitals above the heading, on the public pages and screens outside the app's lists (claude-docs/components/page-header.md, "Contracts"). */
  eyebrow?: ReactNode;
  lede?: ReactNode;
  lead?: ReactNode;
  tag?: ReactNode;
  action?: ReactNode;
  className?: string;
  headingClassName?: string;
  /** Makes the `h1` take focus by script and marks it `data-view-heading`, for a view that moves focus to its heading when it opens. */
  focusable?: boolean;
  suffix?: ReactNode;
}
