import type { Route } from 'next';
import type { MouseEvent, ReactElement, Ref } from 'react';

export type MenuButtonItem = {
  key: string;
  label: string;
  /** Drawn in the destructive colour, as a `.btn--destructive` would be. */
  destructive?: boolean;
  primary?: boolean;
} & (
  | {
      href: Route;
      onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
      disabled?: never;
      mark?: never;
    }
  | {
      onSelect: () => void;
      href?: never;
      /**
       * Shown and reachable by the arrows but not choosable: `aria-disabled`, a press runs nothing and the menu stays
       * open. An action only: a link that leads nowhere is not a link.
       */
      disabled?: boolean;
      mark?: string;
    }
);

/**
 * A labelled group of a menu's items, set apart by a heading and a rule. Generic over the item so the bar's Add
 * Ingredient menu draws its groups the same way (`sections.tsx`).
 */
export interface MenuSection<Item = MenuButtonItem> {
  key: string;
  label: string;
  items: readonly Item[];
}

/** What the menu offers: one flat list, or labelled groups, never both. */
export type MenuButtonChoices =
  | {
      items: readonly MenuButtonItem[];
      sections?: never;
    }
  | {
      sections: readonly MenuSection[];
      items?: never;
    };

export type MenuButtonProps = MenuButtonChoices & {
  label: string;
  className: string;
  busy?: boolean;
  busyLabel?: string;
  /**
   * The items take the button's type, its face, size and weight, rather than the lighter menu
   * item's: the Annotate dialog's More, whose two items are actions of the dialog's foot. Off
   * by default.
   */
  buttonType?: boolean;
  icon?: ReactElement;
  menuLabel?: string;
  state?: string;
  /** The button itself, so a caller can hand the focus back to it after a dialog an item opened. */
  ref?: Ref<HTMLButtonElement>;
};
