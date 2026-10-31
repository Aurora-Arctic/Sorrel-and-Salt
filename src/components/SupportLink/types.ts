import type { ReactNode } from 'react';

export interface SupportLinkProps {
  /** Go to the support page rather than open the dialog, for a frame that draws none. */
  plain?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}
