import type { ReactNode } from 'react';
import type { NavigationTarget } from '../../lib/navigation';

export interface SectionBodyProps {
  region: Exclude<NavigationTarget['region'], 'main'>;
  className: string;
  children: ReactNode;
}
