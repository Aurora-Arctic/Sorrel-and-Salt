import type { Route } from 'next';
import type { ReactNode, RefObject } from 'react';

export interface ModalProps {
  /** The dialog's heading, and so its accessible name. */
  title: string;
  /**
   * Asked for by the Close button, Escape and a click outside, once the modal
   * has faded out (M5.5), unless a form inside asks about its unsaved changes
   * first (MB.115). The owner closes the modal by unmounting it — a
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

/**
 * Consulted by the modal before the Close button, Escape or a click outside
 * closes it, given the close it would make: true to let it close, false when
 * the contents are asking first (a form's unsaved changes) and will call
 * `close` themselves if the answer is to go.
 */
export type CloseGuard = (close: () => void) => boolean;

/** Where a modal's contents put their guard: one slot, the latest form's. */
export interface CloseGuardSlot {
  /** Fills the slot, answering the call that empties it again. */
  put: (guard: CloseGuard) => () => void;
  /** The guard's answer for `close`; true, let it close, when the slot is empty. */
  consult: CloseGuard;
}

/**
 * A form's guard over its unsaved changes (`useDiscardGuard`): whether it is
 * asking, and the parts its Cancel and its question are wired from.
 */
export interface DiscardGuard {
  /** The question is showing, in place of the form's own actions. */
  asking: boolean;
  /**
   * Cancel's handler: closes through `close` at once when nothing has
   * changed, and otherwise asks first.
   */
  request: (close: () => void) => void;
  /** Discard Changes: makes the close the question held back. */
  discard: () => void;
  /** Keep Editing: puts the question away, the form as it was. */
  keepEditing: () => void;
  /** Keep Editing's button, which takes the focus when the question comes. */
  keepEditingRef: RefObject<HTMLButtonElement | null>;
}

export interface DiscardQuestionProps {
  /** The form's `useDiscardGuard`. */
  guard: DiscardGuard;
  /**
   * The buttons' row: `modal__actions`, the confirm primitive's own, unless
   * the form's other questions stand on `form__actions`, as IngredientForm's do.
   */
  row?: 'modal__actions' | 'form__actions';
}
