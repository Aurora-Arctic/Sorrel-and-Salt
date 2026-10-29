import type { Route } from 'next';
import type { ReactNode, Ref } from 'react';
import type { ModalHeading } from '../Modal/types';

export interface IconTipProps {
  /** The tip's word or two, "Edit": drawn for a sighted user and never read, since the control's own name says it. */
  tip: string;
  /** The one icon control the tip is for, a button or a link, named by its own label. */
  children: ReactNode;
  /** Where the tip stands: `side` (the default, left of the control), `below` (right edge on the control's) or `above` (centred over it); see "Placement". */
  placement?: 'side' | 'below' | 'above';
  /** A press opens the tip too, for a status mark whose button does nothing else; opens rather than toggles. Not for a control with its own press. */
  opensOnPress?: boolean;
}

export interface EditLinkProps {
  /** Where the edit opens: a list's soft-navigation address. */
  href: Route;
  /** What it edits, read after "Edit": "Aluminium, Aluminium" names the link "Edit Aluminium, Aluminium". */
  name: string;
  /** The head of the modal it opens, shown at once over a skeleton while the form loads. */
  heading: ModalHeading;
  /** The link's element, for a caller that returns the focus to it once a dialog it opened closes. */
  ref?: Ref<HTMLAnchorElement>;
}
