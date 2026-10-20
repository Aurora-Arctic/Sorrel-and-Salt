import type { Route } from 'next';
import type { ReactNode, RefObject } from 'react';

/**
 * What a modal's head says. An add dialog's is its title alone, "Add
 * Ingredient". An edit dialog's (MB.115, the owner's call) is an eyebrow
 * naming the action and the kind, "Edit Ingredient", over a title naming the
 * entry by the name it was saved under, so the head holds still while the
 * Name field is changed, and a qualifier where the entry's list names it by a
 * second thing too.
 */
export interface ModalHeading {
  /** The dialog's heading: what it is for, or the entry it edits. */
  title: string;
  /**
   * The small line over the title, "Edit Ingredient": absent on an add
   * dialog, whose title says it. The dialog's accessible name is the two
   * together, "Edit Ingredient, Mugwort".
   */
  eyebrow?: string;
  /**
   * Where an add lands, "Whitethorn Coven" or "Compendium", drawn in the
   * eyebrow's place over the title (M8.16, the owner's call). Spoken after the
   * title and joined to it by a hidden "to", so the dialog's name is the
   * phrase "Add Ingredient to Whitethorn Coven"; never with an eyebrow.
   */
  destination?: string;
  /**
   * After the title, quieter, and in its accessible name: a second identifier
   * the entry's list shows, an ingredient's formal name or a deity's
   * tradition. The caller sets a binomial's italics, since only it knows the
   * nomenclature.
   */
  qualifier?: ReactNode;
  /**
   * Draws the qualifier on a line of its own below the title instead of after
   * it (the owner's call, 2026-10-20: the Quick Look's formal name). It is still
   * in the dialog's accessible name, after the title.
   */
  qualifierBelow?: boolean;
  /**
   * Beside the title, at the end of its first line, centred on that line: a
   * badge and a pencil. The title wraps before it, and it drops below the title
   * only when the title's first word would otherwise have to break. Not in the
   * dialog's name.
   */
  titleEnd?: ReactNode;
  /** A row under the heading's last line, for the badges that are not beside the title. Not in the dialog's name. */
  under?: ReactNode;
}

export interface ModalProps extends ModalHeading {
  /**
   * Asked for by the Close button, Escape and a click outside, once the modal
   * has faded out (M5.5), unless a form inside asks about its unsaved changes
   * first (MB.115). The owner closes the modal by unmounting it — a
   * URL-driven one by navigating away from its address.
   */
  onClose: () => void;
  /**
   * Where the focus goes as the modal closes when what opened it is gone, or
   * nothing held the focus as it opened: a click in WebKit focuses no button.
   * Handed what opened it, already out of the page, or null. The modal gives
   * the focus back to its opener itself whenever the opener is still there
   * (claude-docs/components/modal.md, "Giving the focus back").
   */
  returnTo?: (gone: Element | null) => HTMLElement | null | undefined;
  /**
   * The width: 32rem by default, for a short form or a confirmation; `wide`,
   * 48rem, for a long form such as the compendium entry's (M5.5).
   */
  size?: 'wide';
  /**
   * A body that holds nothing to fill in, only to read (M12.5's details): Tab
   * stops on the body itself, so a keyboard can scroll it. Off by default,
   * since a form's fields already let a keyboard reach every part of it.
   */
  readingBody?: boolean;
  /**
   * Its contents are on their way (M9.18): the body is marked busy, and when
   * they arrive the focus moves from the dialog to their first field.
   */
  loading?: boolean;
  /**
   * What it holds; or a function of the modal's own close, for contents that
   * close it themselves — a form after its save — so that fades out too.
   */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * A button that opens a modal, and takes the focus back when it closes: an
 * Invite, a Leave Coven. The modal's heading is its title alone.
 */
export interface ModalButtonProps {
  /** The button's text and accessible name, in title case: "Invite". */
  label: string;
  /** The button's classes: `btn btn--solid`. */
  className: string;
  /** The dialog's heading and accessible name, in title case. */
  title: string;
  size?: ModalProps['size'];
  /** What the modal holds, given the modal's close, so a form can close it after its send. */
  children: (close: () => void) => ReactNode;
}

/**
 * Where a modal is in its close: open; fading out (M5.5); closed, the fade
 * over and its owner to be asked; or asked already, with no fade to wait on.
 */
export type ModalPhase = 'open' | 'fading' | 'closed' | 'asked';

/** What an open route modal holds, from the page its address renders. */
export interface RouteModalContent {
  heading: ModalHeading;
  /**
   * What it holds, given `done`: the modal's own close, for a form's save or
   * delete, so the modal fades out before the page goes back.
   */
  body: (done: () => void) => ReactNode;
}

/**
 * A page's one modal place, opened by its address (`?new`, `?edit=<slug>`),
 * or by a press while that address is on its way (M9.18).
 */
export interface RouteModalProps {
  /** The page it opened over, the modal's own parameter dropped: closing goes back there. */
  closeHref: Route;
  size?: ModalProps['size'];
  readingBody?: ModalProps['readingBody'];
  /** What the address opens; absent when it opens nothing, or while a press's is on its way. */
  content?: RouteModalContent;
  /**
   * Which of a page's modal places this is, where it has more than one: a
   * press shows only in the place it names, so a list whose names open a
   * details modal and whose Edit opens the edit modal over it draws each in
   * its own (M12.5). Unnamed, as every page with one place leaves it.
   */
  place?: string;
  /**
   * Where the focus goes as it closes when neither what opened it nor a link
   * to the address it opened is in the page, before the page's heading: a
   * menu's button, when the link pressed was one of the menu's items.
   */
  returnTo?: () => HTMLElement | null | undefined;
}

/**
 * A modal pressed open and on its way (`RouteModalProvider`): the head it
 * shows over the skeleton until its page arrives, and the way to open one.
 */
export interface RouteModalOpener {
  /** The head of the modal on its way, while its navigation is pending; undefined otherwise. */
  loading: ModalHeading | undefined;
  /** The place the modal on its way shows in (`RouteModalProps.place`); undefined for the unnamed one. */
  loadingPlace?: string;
  /** Opens the modal at once with `heading` in `place`, and navigates to `href` for its contents. */
  open: (href: Route, heading: ModalHeading, place?: string) => void;
  /** Forgets the modal on its way, which a close while it loads asks for. */
  cancel: () => void;
  /**
   * The address the last press opened, which a link drawn afresh shares: the
   * focus goes back to it as the modal closes. Absent in the workshop's stub.
   */
  opened?: Route;
}

export interface RouteModalProviderProps {
  children: ReactNode;
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
  /** The question is showing, over the form. */
  asking: boolean;
  /**
   * Cancel's handler: closes through `close` at once when nothing has
   * changed, and otherwise asks first.
   */
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

/**
 * The layer a modal draws a form's question in (`ConfirmLayerContext`), over
 * its body and below its title.
 */
export interface ConfirmLayer {
  /** The element the question is drawn into; null until the modal has drawn it. */
  host: HTMLElement | null;
  /**
   * Makes the modal's body, and any control beside its title, inert until
   * the call it answers: the form behind a question can be neither pressed
   * nor typed into. Counted, so two holds overlapping release once both have.
   */
  hold: () => () => void;
  /** The modal's body, whose first field takes the focus if what had it has gone. */
  body: RefObject<HTMLElement | null>;
}

export interface ConfirmOverlayProps {
  /**
   * The question, "Delete this?", which names the group the card is. Absent
   * when a field's label names it instead, through `labelledBy`.
   */
  question?: ReactNode;
  /** The id of what names the card when there is no `question`. */
  labelledBy?: string;
  /**
   * The safe answer, Keep It or Keep Editing: it takes the focus when the
   * question comes, and again on each flash. Never the destructive one.
   */
  safe: RefObject<HTMLElement | null>;
  /** Ways out tried again while asking, each a flash of the card; absent for none. */
  flashes?: number;
  /** What follows the question: a field, a live region, the row of answers. */
  children: ReactNode;
}

/** A form's yes-or-no question over itself: Delete and Keep It, by default. */
export interface ConfirmQuestionProps {
  /** The question, "Delete "Fixture Healing"? …", which names the card. */
  question: ReactNode;
  /**
   * What the question needs said beneath it, apart from its name: what the
   * answer will change, and anything to weigh first (M12.1). Absent for a
   * question that says it all in its one line.
   */
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
  /** The safe answer, which the focus lands on: "Keep It" by default, "Back" for a step back. */
  keepLabel?: string;
  /** The action is in flight: the acting answer is busy and shut. */
  busy: boolean;
  /** The action. A rejection is a refusal, handed to `onRefused` where given. */
  onConfirm: () => Promise<void>;
  /**
   * A second acting answer beside the first, for a question with two ways
   * forward: "Discard & Promote" next to "Save & Promote" (M12.1). It is
   * drawn destructive, being the one that gives something up. While either
   * runs, both are shut and the safe answer with them, so the question cannot
   * be left mid-action.
   */
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

/**
 * A route modal a control opens: its address, and the head a press shows at
 * once while that address is on its way (M9.18). An ingredient name's
 * details modal is one (M12.5), and so is the Edit a page hands down.
 */
export interface RouteModalLink {
  href: Route;
  heading: ModalHeading;
}
