import type { ReactNode } from 'react';

export interface PanelSectionProps {
  /** The section's anchor, which a page menu links to. Its heading is `${id}-heading`. */
  id: string;
  title: string;
  /** What the section is for, beneath its heading. Left out where the form's own status line says it. */
  lede?: ReactNode;
  children: ReactNode;
}
