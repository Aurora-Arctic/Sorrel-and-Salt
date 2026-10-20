import type { Route } from 'next';
import type { MouseEvent, ReactElement, Ref } from 'react';

/** One choice in the menu: a link to an address, or an action. */
export type MenuButtonItem = {
  /** Unique within the menu. */
  key: string;
  /** The item's text and accessible name, in title case: "Annotate". */
  label: string;
  /** Drawn in the destructive colour, as a `.btn--destructive` would be. */
  destructive?: boolean;
  /**
   * The menu's one primary action, pointed at in the green highlight where
   * every other plain item takes the grey: "Edit Ingredient". A constructive
   * item is primary already.
   */
  primary?: boolean;
  /** Drawn in the accent green, for what adds something and is the menu's primary action: "Add to Cupboard". */
  constructive?: boolean;
} & (
  | {
      href: Route;
      /** Runs before the link is followed, and may prevent it (a modal opened in place). */
      onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    }
  | { onSelect: () => void; href?: never }
);

export interface MenuButtonProps {
  /** The button's text and accessible name, in title case: "Edit". */
  label: string;
  /** The button's classes: `btn btn--quiet btn--medium`. */
  className: string;
  /** What the menu offers, in order. */
  items: readonly MenuButtonItem[];
  /** One of its items is in flight: the button shows the spinner and `busyLabel`, and is disabled. */
  busy?: boolean;
  /** What is happening while busy, in title case: "Adding". */
  busyLabel?: string;
  /**
   * The items take the button's type, its face, size and weight, rather than
   * the lighter menu item's: the Annotate dialog's More, whose two items are
   * actions of the dialog's foot (the owner's call of 2026-10-20). Off by default.
   */
  buttonType?: boolean;
  /**
   * An icon drawn in place of the label and the chevron, the label then hidden
   * but still the button's name: a list card's More (M8.17), the vertical dots,
   * among the card's other icon controls. Left out, the label shows.
   */
  icon?: ReactElement;
  /** The button itself, so a caller can hand the focus back to it after a dialog an item opened. */
  ref?: Ref<HTMLButtonElement>;
}
