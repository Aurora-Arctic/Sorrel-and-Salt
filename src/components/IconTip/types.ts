import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { ModalHeading } from '../Modal/types';

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
  href: Route;
  /** What it edits, read after "Edit": "Aluminium, Aluminium" names the link "Edit Aluminium, Aluminium". */
  name: string;
  /** The head of the modal it opens, shown at once over a skeleton while the form loads (M9.18). */
  heading: ModalHeading;
}
