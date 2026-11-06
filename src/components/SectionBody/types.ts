import type { ReactNode } from 'react';

export interface SectionBodyProps {
  /** The navigations this body answers: the moves to a page the registry gives this region. */
  region: 'coven' | 'admin';
  /** The frame's class, which the section's stylesheet already styles. */
  className: string;
  /** The section's page, which its layout is given. */
  children: ReactNode;
}
