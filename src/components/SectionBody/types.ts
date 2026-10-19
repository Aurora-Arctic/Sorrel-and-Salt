import type { ReactNode } from 'react';
import type { NavigationTarget } from '../../lib/navigation';

export interface SectionBodyProps {
  /** The navigations this body answers: those whose target names this region. */
  region: Exclude<NavigationTarget['region'], 'main'>;
  /** The frame's class, which the section's stylesheet already styles. */
  className: string;
  /** The section's page, which its layout is given. */
  children: ReactNode;
}
