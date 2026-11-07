import type { ReactNode } from 'react';

export interface SectionBodyProps {
  /** The navigations this body answers: the moves to a page the registry gives this region. */
  region: 'coven' | 'admin';
  className: string;
  children: ReactNode;
}
