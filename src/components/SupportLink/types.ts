import type { ReactNode } from 'react';
import type { SupportAboutParam } from '../../lib/support-path';

export interface SupportLinkProps {
  className?: string;
  onClick?: () => void;
  about?: SupportAboutParam;
  children: ReactNode;
}
