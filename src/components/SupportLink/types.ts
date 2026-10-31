import type { ReactNode } from 'react';

export interface SupportLinkProps {
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}
