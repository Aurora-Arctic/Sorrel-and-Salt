import type { Route } from 'next';
import type { ReactNode, Ref, RefObject } from 'react';

/** What a modal's head says: a title alone for an add dialog, an eyebrow over the entry's saved name for an edit dialog (claude-docs/components/modal.md, "An edit dialog's head"). */
export interface ModalHeading {
  title: string;
  eyebrow?: string;
  /** Where an add lands ("Whitethorn Coven"), drawn in the eyebrow's place and spoken after the title joined by a hidden "to"; never with an eyebrow. */
  destination?: string;
  qualifier?: ReactNode;
  /** The entry's formal name over the title, in the eyebrow's place; never with an eyebrow, and not in the dialog's name (claude-docs/components/modal.md, "A title with its own end"). */
  formalName?: ReactNode;
  /** The head's top line beside Close, holding the entry page's marks; its presence, even empty, gives the head that line to itself. Not in the dialog's name (claude-docs/components/modal.md, "A title with its own end"). */
  topEnd?: ReactNode;
  /** The title's controls, at the end of the formal name's line and after the title in the markup. Not in the dialog's name (claude-docs/components/modal.md, "A title with its own end"). */
  formalActions?: ReactNode;
  /** With `formalActions` and no formal name: the controls stand level with the title's first line and run to the dialog's edge beneath the ×, the head a step lower to make room (claude-docs/components/modal.md, "Controls beneath the ×"). */
  actionsUnderClose?: boolean;
  aboveName?: ReactNode;
  under?: ReactNode;
  /** The open lands the focus on the title, not the body's first field: a dialog that reads a record before it asks for anything. */
  focusTitle?: boolean;
}

export interface ModalProps extends ModalHeading {
  /** Asked for by the Close button, Escape and a click outside once the modal has faded out, unless a form inside asks about its unsaved changes first. The owner unmounts the modal; a URL-driven one navigates away. */
  onClose: () => void;
  /** Where the focus goes as the modal closes when its opener is gone or held none (a click in WebKit focuses no button), given the opener already out of the page, or null (claude-docs/components/modal.md, "Giving the focus back"). */
  returnTo?: (gone: Element | null) => HTMLElement | null | undefined;
  size?: 'listed';
  /** A body with nothing to fill in, only to read: Tab stops on the body itself so a keyboard can scroll it. Off by default, as a form's fields already reach every part. */
  readingBody?: boolean;
  /** Its contents are on their way: the body is marked busy, and the focus moves to their first field on arrival. */
  loading?: boolean;
  /** A bar under the body, outside the element that scrolls, so the scrollbar ends above it. Held inert while a question is asked, as the body is. */
  foot?: ReactNode;
  /** What it holds; or a function of the modal's own close, for contents that close it themselves so that fades out too. */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/** A button that opens a modal and takes the focus back when it closes: an Invite, a Leave Coven. The heading is its title alone. */
export interface ModalButtonProps {
  label: ReactNode;
  className: string;
  title: string;
  eyebrow?: string;
  qualifier?: ReactNode;
  /** The accessible name where the text alone would not tell one button from the next ("Edit Stock, Rosemary, Oil"). It starts with the text; an icon label has no text, so the name is this alone. */
  ariaLabel?: string;
  /** A tip over an icon button, "Edit Stock" over the pencil. Wraps the button alone, never the dialog, which would open the tip on its focus. */
  tip?: string;
  size?: ModalProps['size'];
  ref?: Ref<HTMLButtonElement>;
  onOpen?: () => void;
  /** What the modal holds, given the modal's close, so a form can close it after its send. */
  children: (close: () => void) => ReactNode;
}

export type ModalPhase = 'open' | 'fading' | 'closed' | 'asked';

export interface RouteModalContent {
  heading: ModalHeading;
  /** What it holds, given `done`, the modal's own close, so it fades out before the page goes back. */
  body: (done: () => void) => ReactNode;
  foot?: ReactNode;
}

export interface RouteModalProps {
  closeHref: Route;
  size?: ModalProps['size'];
  readingBody?: ModalProps['readingBody'];
  content?: RouteModalContent;
  loadingBody?: ReactNode;
  place?: string;
  /** Where the focus goes as it closes when neither its opener nor a link to its address is in the page: a menu's button, when the pressed link was one of the menu's items. */
  returnTo?: () => HTMLElement | null | undefined;
}

/** A modal pressed open and on its way (`RouteModalProvider`): the head it shows over the skeleton until its page arrives, and the way to open one. */
export interface RouteModalOpener {
  /** The head of the modal on its way, while its navigation is pending; undefined otherwise. */
  loading: ModalHeading | undefined;
  loadingPlace?: string;
  open: (href: Route, heading: ModalHeading, place?: string) => void;
  cancel: () => void;
  /** The address the last press opened, which a link drawn afresh shares: the focus goes back to it as the modal closes. Absent in the workshop's stub. */
  opened?: Route;
}

export interface RouteModalProviderProps {
  children: ReactNode;
}

/** Consulted before the Close button, Escape or a click outside closes the modal, given the close it would make: true to let it close, false when the contents are asking first and will call `close` themselves if the answer is to go. */
export type CloseGuard = (close: () => void) => boolean;

export interface CloseGuardSlot {
  put: (guard: CloseGuard) => () => void;
  consult: CloseGuard;
}

export interface DiscardGuard {
  asking: boolean;
  /** Cancel's handler: closes through `close` at once when nothing has changed, and otherwise asks first. */
  request: (close: () => void) => void;
  flashes: number;
  discard: () => void;
  keepEditing: () => void;
  /** Keep Editing's button, which takes the focus when the question comes. */
  keepEditingRef: RefObject<HTMLButtonElement | null>;
}

export interface DiscardQuestionProps {
  guard: DiscardGuard;
}

export interface ConfirmLayer {
  /** The element the question is drawn into; null until the modal has drawn it. */
  host: HTMLElement | null;
  /** Makes the body, and any control beside the title, inert until the call it answers; counted, so two overlapping holds release once both have. */
  hold: () => () => void;
  /** The modal's body, whose first field takes the focus if what had it has gone. */
  body: RefObject<HTMLElement | null>;
}

export interface ConfirmOverlayProps {
  question?: ReactNode;
  labelledBy?: string;
  /** The safe answer, Cancel or Keep Editing: it takes the focus when the question comes and on each flash. Never the destructive one. */
  safe: RefObject<HTMLElement | null>;
  flashes?: number;
  children: ReactNode;
}

export interface ConfirmQuestionProps {
  question: ReactNode;
  details?: ReactNode;
  asked?: boolean;
  guard?: DiscardGuard;
  confirmLabel?: string;
  busyLabel?: string;
  tone?: 'destructive' | 'solid';
  /** The safe answer, which the focus lands on: "Cancel" by default, "Back" for a step back. */
  keepLabel?: string;
  busy: boolean;
  /** The action. A rejection is a refusal, handed to `onRefused` where given. */
  onConfirm: () => Promise<void>;
  also?: {
    label: string;
    busyLabel: string;
    busy: boolean;
    onClick: () => Promise<void>;
  };
  onKeep: () => void;
  onRefused?: (message: string) => void;
}

export interface RouteModalLink {
  href: Route;
  heading: ModalHeading;
}
