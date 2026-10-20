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
  /**
   * Where the tip stands: `side`, the default, to the left of the control and
   * level with it; `below`, under it, its right edge on the control's, for a
   * mark at the right end of a row with rows beneath it, such as the account
   * menu's count of invitations (M10.32); `above`, centred over it, for a
   * control in a row of its kind with nothing of its own to cover, such as a
   * segment of the radio strip (M12.7).
   */
  placement?: 'side' | 'below' | 'above';
  /**
   * A press opens the tip too, as a tap or a click does on InfoTip's ⓘ, for a
   * status mark whose button does nothing else: on touch there is no hover,
   * and a tap focuses no button in Safari, so without it the word never shows
   * (the owner's call, 2026-10-20). Opens rather than toggles, as the ⓘ does.
   * Not for a control with its own press, whose press says what it does.
   */
  opensOnPress?: boolean;
}

export interface EditLinkProps {
  /** Where the edit opens: a list's soft-navigation address. */
  href: Route;
  /** What it edits, read after "Edit": "Aluminium, Aluminium" names the link "Edit Aluminium, Aluminium". */
  name: string;
  /** The head of the modal it opens, shown at once over a skeleton while the form loads (M9.18). */
  heading: ModalHeading;
}
