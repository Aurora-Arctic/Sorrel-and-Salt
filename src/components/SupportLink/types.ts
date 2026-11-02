import type { ReactNode } from 'react';
import type { SupportAboutParam } from '../../lib/support-path';

export interface SupportLinkProps {
  className?: string;
  onClick?: () => void;
  /** The topic the dialog opens with chosen; none is chosen when left out. */
  about?: SupportAboutParam;
  children: ReactNode;
}
