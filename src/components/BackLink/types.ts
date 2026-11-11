import type { MouseEventHandler, ReactNode } from 'react';

export interface BackToProps {
  href: string;
  /** What the link goes back to: it reads "Back to {label}". */
  label: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children?: ReactNode;
}
