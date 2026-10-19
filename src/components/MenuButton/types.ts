import type { Route } from 'next';
import type { MouseEvent, Ref } from 'react';

/** One choice in the menu: a link to an address, or an action. */
export type MenuButtonItem = {
  /** Unique within the menu. */
  key: string;
  /** The item's text and accessible name, in title case: "Annotate". */
  label: string;
  /** Drawn in the destructive colour, as a `.btn--destructive` would be. */
  destructive?: boolean;
  /** Drawn in the accent green, for what adds something: "Add to Cupboard". */
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
   * Which side of the button the menu opens on: below, the default, or above,
   * for a button at the foot of a dialog, whose menu would run past its edge.
   * Either way it lines up with the button's end edge.
   */
  opens?: 'below' | 'above';
  /** The button itself, so a caller can hand the focus back to it after a dialog an item opened. */
  ref?: Ref<HTMLButtonElement>;
}
