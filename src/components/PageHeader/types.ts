import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  id?: string;
  /**
   * The small capitals above the heading that name the part of the site. Only
   * the public pages and the screens outside the app's lists carry one; a list
   * page's heading stands alone (claude-docs/styling.md, "Designing a section").
   */
  eyebrow?: string;
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
