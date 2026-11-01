import type { Route } from 'next';
import type { ReactNode, Ref, RefObject } from 'react';

/** What a modal's head says: a title alone for an add dialog, an eyebrow over the entry's saved name for an edit dialog (claude-docs/components/modal.md, "An edit dialog's head"). */
export interface ModalHeading {
  /** The dialog's heading: what it is for, or the entry it edits. */
  title: string;
  /** The small line over the title, "Edit Ingredient": absent on an add dialog. The dialog's accessible name is both, "Edit Ingredient, Mugwort". */
  eyebrow?: string;
  /** Where an add lands ("Whitethorn Coven"), drawn in the eyebrow's place and spoken after the title joined by a hidden "to"; never with an eyebrow. */
  destination?: string;
  /** After the title, quieter, and in its accessible name: a second identifier, an ingredient's formal name or a deity's tradition. The caller sets a binomial's italics. */
  qualifier?: ReactNode;
  /** The entry's formal name over the title, in the eyebrow's place; never with an eyebrow, and not in the dialog's name (claude-docs/components/modal.md, "A title with its own end"). */
  formalName?: ReactNode;
  /** The head's top line beside Close, holding the entry page's marks; its presence, even empty, gives the head that line to itself. Not in the dialog's name (claude-docs/components/modal.md, "A title with its own end"). */
  topEnd?: ReactNode;
  /** The title's controls, at the end of the formal name's line and after the title in the markup. Not in the dialog's name (claude-docs/components/modal.md, "A title with its own end"). */
  formalActions?: ReactNode;
  /** With `formalActions` and no formal name: the controls stand level with the title's first line and run to the dialog's edge beneath the ×, the head a step lower to make room (claude-docs/components/modal.md, "Controls beneath the ×"). */
  actionsUnderClose?: boolean;
  /** A line above the formal name and the title, under any top line (the details window's last edit). Not in the dialog's name. */
  aboveName?: ReactNode;
  /** A row under the heading's last line, for the badges that are not beside the title. Not in the dialog's name. */
  under?: ReactNode;
  /** The open lands the focus on the title, not the body's first field: a dialog that reads a record before it asks for anything. */
  focusTitle?: boolean;
}

export interface ModalProps extends ModalHeading {
  /** Asked for by the Close button, Escape and a click outside once the modal has faded out, unless a form inside asks about its unsaved changes first. The owner unmounts the modal; a URL-driven one navigates away. */
  onClose: () => void;
  /** Where the focus goes as the modal closes when its opener is gone or held none (a click in WebKit focuses no button), given the opener already out of the page, or null (claude-docs/components/modal.md, "Giving the focus back"). */
  returnTo?: (gone: Element | null) => HTMLElement | null | undefined;
  /** The width: 32rem by default; `listed`, the default column with an 11rem list beside it. */
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
  /** The button's text and accessible name, in title case: "Invite". An icon is the label where `ariaLabel` names the button. */
  label: ReactNode;
  /** The button's classes: `btn btn--solid`. */
  className: string;
  /** The dialog's heading and accessible name, in title case. */
  title: string;
  /** The small line over the title, for an edit dialog's head: "Edit Stock" (see `ModalHeading`). */
  eyebrow?: string;
  /** After the title, in the dialog's name: the jar's form under its ingredient's name. */
  qualifier?: ReactNode;
  /** The accessible name where the text alone would not tell one button from the next ("Edit Stock, Rosemary, Oil"). It starts with the text; an icon label has no text, so the name is this alone. */
  ariaLabel?: string;
  /** A tip over an icon button, "Edit Stock" over the pencil. Wraps the button alone, never the dialog, which would open the tip on its focus. */
  tip?: string;
  size?: ModalProps['size'];
  /** The button, for an owner that anchors something to it, as ClickFeedback's callout is. */
  ref?: Ref<HTMLButtonElement>;
  /** Runs on the press, before the modal opens: an owner clears an earlier refusal here. */
  onOpen?: () => void;
  /** What the modal holds, given the modal's close, so a form can close it after its send. */
  children: (close: () => void) => ReactNode;
}

/** Where a modal is in its close: open; fading out; closed, the fade over and its owner to be asked; or asked already, with no fade to wait on. */
export type ModalPhase = 'open' | 'fading' | 'closed' | 'asked';

/** What an open route modal holds, from the page its address renders. */
export interface RouteModalContent {
  heading: ModalHeading;
  /** What it holds, given `done`, the modal's own close, so it fades out before the page goes back. */
  body: (done: () => void) => ReactNode;
  /** A bar under the body, outside its scroll (`ModalProps.foot`). */
  foot?: ReactNode;
}

/** A page's one modal place, opened by its address (`?new`, `?edit=<slug>`) or by a press while that address is on its way. */
export interface RouteModalProps {
  /** The page it opened over, the modal's own parameter dropped: closing goes back there. */
  closeHref: Route;
  size?: ModalProps['size'];
  readingBody?: ModalProps['readingBody'];
  /** What the address opens; absent when it opens nothing, or while a press's is on its way. */
  content?: RouteModalContent;
  /** What the body shows while its contents are on its way; a form's skeleton when absent. */
  loadingBody?: ReactNode;
  /** Which of a page's modal places this is, where it has more than one: a press shows only in the place it names. Unnamed, as every one-place page leaves it. */
  place?: string;
  /** Where the focus goes as it closes when neither its opener nor a link to its address is in the page: a menu's button, when the pressed link was one of the menu's items. */
  returnTo?: () => HTMLElement | null | undefined;
}

/** A modal pressed open and on its way (`RouteModalProvider`): the head it shows over the skeleton until its page arrives, and the way to open one. */
export interface RouteModalOpener {
  /** The head of the modal on its way, while its navigation is pending; undefined otherwise. */
  loading: ModalHeading | undefined;
  /** The place the modal on its way shows in (`RouteModalProps.place`); undefined for the unnamed one. */
  loadingPlace?: string;
  /** Opens the modal at once with `heading` in `place`, and navigates to `href` for its contents. */
  open: (href: Route, heading: ModalHeading, place?: string) => void;
  /** Forgets the modal on its way, which a close while it loads asks for. */
  cancel: () => void;
  /** The address the last press opened, which a link drawn afresh shares: the focus goes back to it as the modal closes. Absent in the workshop's stub. */
  opened?: Route;
}

export interface RouteModalProviderProps {
  children: ReactNode;
}

/** Consulted before the Close button, Escape or a click outside closes the modal, given the close it would make: true to let it close, false when the contents are asking first and will call `close` themselves if the answer is to go. */
export type CloseGuard = (close: () => void) => boolean;

/** Where a modal's contents put their guard: one slot, the latest form's. */
export interface CloseGuardSlot {
  /** Fills the slot, answering the call that empties it again. */
  put: (guard: CloseGuard) => () => void;
  /** The guard's answer for `close`; true, let it close, when the slot is empty. */
  consult: CloseGuard;
}

/** A form's guard over its unsaved changes (`useDiscardGuard`): whether it is asking, and the parts its Cancel and its question are wired from. */
export interface DiscardGuard {
  /** The question is showing, over the form. */
  asking: boolean;
  /** Cancel's handler: closes through `close` at once when nothing has changed, and otherwise asks first. */
  request: (close: () => void) => void;
  /** Ways out tried again while asking, each a flash of the question; 0 when none. */
  flashes: number;
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
}

/** The layer a modal draws a form's question in (`ConfirmLayerContext`), over its body and below its title. */
export interface ConfirmLayer {
  /** The element the question is drawn into; null until the modal has drawn it. */
  host: HTMLElement | null;
  /** Makes the body, and any control beside the title, inert until the call it answers; counted, so two overlapping holds release once both have. */
  hold: () => () => void;
  /** The modal's body, whose first field takes the focus if what had it has gone. */
  body: RefObject<HTMLElement | null>;
}

export interface ConfirmOverlayProps {
  /** The question, "Delete this?", which names the card; absent when a field's label names it through `labelledBy`. */
  question?: ReactNode;
  /** The id of what names the card when there is no `question`. */
  labelledBy?: string;
  /** The safe answer, Cancel or Keep Editing: it takes the focus when the question comes and on each flash. Never the destructive one. */
  safe: RefObject<HTMLElement | null>;
  /** Ways out tried again while asking, each a flash of the card; absent for none. */
  flashes?: number;
  /** What follows the question: a field, a live region, the row of answers. */
  children: ReactNode;
}

/** A form's yes-or-no question over itself: Delete and Cancel, by default. */
export interface ConfirmQuestionProps {
  /** The question, "Delete "Fixture Healing"? …", which names the card. */
  question: ReactNode;
  /** What the question says beneath it, apart from its name: what the answer will change, and anything to weigh first. Absent when the one line says it all. */
  details?: ReactNode;
  /** Its own question is being asked; true when the form draws it only then. */
  asked?: boolean;
  /** The form's discard guard, whose question shows instead while it asks. */
  guard?: DiscardGuard;
  /** The answer that acts, in title case: "Delete" by default, "Move and Delete". */
  confirmLabel?: string;
  /** What it says while busy: "Deleting" by default. */
  busyLabel?: string;
  /** The acting answer's weight: destructive for a delete, solid for a save. */
  tone?: 'destructive' | 'solid';
  /** The safe answer, which the focus lands on: "Cancel" by default, "Back" for a step back. */
  keepLabel?: string;
  /** The action is in flight: the acting answer is busy and shut. */
  busy: boolean;
  /** The action. A rejection is a refusal, handed to `onRefused` where given. */
  onConfirm: () => Promise<void>;
  /** A second acting answer for a question with two ways forward ("Discard & Promote" beside "Save & Promote"), drawn destructive. While either runs, both and the safe answer are shut. */
  also?: {
    label: string;
    busyLabel: string;
    busy: boolean;
    onClick: () => Promise<void>;
  };
  onKeep: () => void;
  /** Told a refused action's sentence, for the form's alert; the form closes the question. */
  onRefused?: (message: string) => void;
}

/** A route modal a control opens: its address, and the head a press shows at once while that address is on its way. */
export interface RouteModalLink {
  href: Route;
  heading: ModalHeading;
}
