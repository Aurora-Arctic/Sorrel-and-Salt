import type { ReactNode } from 'react';

export interface IconTipProps {
  /**
   * The tip's word or two, "Edit": drawn for a sighted user and never read,
   * since the control's own name says it and more.
   */
  tip: string;
  /** The one icon control the tip is for, a button or a link, named by its own label. */
  children: ReactNode;
}

export interface EditLinkProps {
  /** Where the edit opens: a list's soft-navigation address. */
  href: string;
  /** What it edits, read after "Edit": "Aluminium, Aluminium" names the link "Edit Aluminium, Aluminium". */
  name: string;
}
