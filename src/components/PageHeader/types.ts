import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  level?: 'h1' | 'h2';
  greeting?: string;
  id?: string;
  /** Only the public pages and the screens outside the app's lists carry one (claude-docs/styling.md, "Designing a section"). */
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
