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
   * every other plain item takes the grey: "Edit Ingredient". The menu draws
   * it first, wherever it is given.
   */
  primary?: boolean;
} & (
  | {
      href: Route;
      /** Runs before the link is followed, and may prevent it (a modal opened in place). */
      onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
      disabled?: never;
      mark?: never;
    }
  | {
      onSelect: () => void;
      href?: never;
      /**
       * Shown, and reached by the arrows, but not choosable: `aria-disabled`, as the APG
       * menu pattern has a disabled item, drawn muted, and a press runs nothing and leaves
       * the menu open. A coven that already holds the entry. An action only: a link that
       * leads nowhere is not a link.
       */
      disabled?: boolean;
      /**
       * A green check after the label, as a compendium card marks what is held (HeldMark),
       * and the words it stands for, joined to the item's name after a comma: "in its
       * cupboard" names the item "Hedge Coven, in its cupboard".
       */
      mark?: string;
    }
);

/**
 * A labelled group of a menu's items, drawn under a small muted heading and set apart from the
 * next group by a rule: the compendium's choices and the coven's, in a More menu that offers
 * both. Generic over the item so the bar's Add Ingredient menu, which has its own items, draws
 * its groups the same way (`sections.tsx`).
 */
export interface MenuSection<Item = MenuButtonItem> {
  /** Unique within the menu. */
  key: string;
  /** The group's visible name and its accessible name, in title case: "Compendium". */
  label: string;
  /** The group's items, in order. A group with none is not drawn. */
  items: readonly Item[];
}

/** What the menu offers: one flat list, or labelled groups, never both. */
export type MenuButtonChoices =
  | {
      /**
       * What the menu offers, in order, the green item (`primary`) first whatever its place
       * here: the menu draws it first and keeps the rest in this order.
       */
      items: readonly MenuButtonItem[];
      sections?: never;
    }
  | {
      /**
       * The same items in labelled groups, in the order to draw them: the caller puts first
       * the group that belongs to where the viewer is, so the menu itself reads no address.
       * The green item goes first within its own group. The arrows, Home and End run through
       * every group's items as one list; the headings are not in it.
       */
      sections: readonly MenuSection[];
      items?: never;
    };

export type MenuButtonProps = MenuButtonChoices & {
  /** The button's text and accessible name, in title case: "Edit". */
  label: string;
  /** The button's classes: `btn btn--quiet btn--medium`. */
  className: string;
  /** One of its items is in flight: the button shows the spinner and `busyLabel`, and is disabled. */
  busy?: boolean;
  /** What is happening while busy, in title case: "Adding". */
  busyLabel?: string;
  /**
   * The items take the button's type, its face, size and weight, rather than the lighter menu
   * item's: the Annotate dialog's More, whose two items are actions of the dialog's foot. Off
   * by default.
   */
  buttonType?: boolean;
  /**
   * An icon drawn in place of the label and the chevron, the label then hidden but still the
   * button's name: a list card's More, the vertical dots. Left out, the label shows.
   */
  icon?: ReactElement;
  /**
   * The menu's accessible name, where it is not the button's: the bar's chevron is "Choose
   * Where to Add" and its menu "Add Ingredient To". Left out, the menu takes the label.
   */
  menuLabel?: string;
  /**
   * A state the caller's stylesheet draws the button from, set as its `data-state`: the
   * compendium card's plus says `added` while its check shows after an add. Left out, the
   * button has none.
   */
  state?: string;
  /** The button itself, so a caller can hand the focus back to it after a dialog an item opened. */
  ref?: Ref<HTMLButtonElement>;
};
