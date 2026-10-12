import type { ReactNode } from 'react';

export interface ContextRowProps {
  /** What names the area: the coven switcher, or the word "Admin". */
  lead: ReactNode;
  /** The section nav, beside the lead on a desktop and out of the row on a phone. */
  children?: ReactNode;
}
