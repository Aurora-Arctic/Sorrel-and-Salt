import type { Route } from 'next';
import type { ReactNode } from 'react';

export interface ModalProps {
  /** The dialog's heading, and so its accessible name. */
  title: string;
  /**
   * Asked for by the Close button, Escape and a click outside, once the modal
   * has faded out (M5.5). The owner closes the modal by unmounting it — a
   * URL-driven one by navigating away from its address.
   */
  onClose: () => void;
  /**
   * The width: 32rem by default, for a short form or a confirmation; `wide`,
   * 48rem, for a long form such as the compendium entry's (M5.5).
   */
  size?: 'wide';
  /**
   * What it holds; or a function of the modal's own close, for contents that
   * close it themselves — a form after its save — so that fades out too.
   */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * Where a modal is in its close: open; fading out (M5.5); closed, the fade
 * over and its owner to be asked; or asked already, with no fade to wait on.
 */
export type ModalPhase = 'open' | 'fading' | 'closed' | 'asked';

/** A modal opened by its page's address, which closing navigates away from. */
export interface RouteModalProps {
  /** The heading, and so the dialog's accessible name. */
  title: string;
  /** The page it opened over, the modal's own parameter dropped: closing goes back there. */
  closeHref: Route;
  size?: ModalProps['size'];
  /**
   * What it holds, given `done`: the modal's own close, for a form's save or
   * delete, so the modal fades out before the page goes back.
   */
  children: (done: () => void) => ReactNode;
}
