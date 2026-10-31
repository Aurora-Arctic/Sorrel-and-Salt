import type { Route } from 'next';
import type { NavigationTarget } from '../../lib/navigation';

/** The icons the section navs draw, one per section (icons.tsx). */
export type SectionIconName =
  | 'overview'
  | 'ingredients'
  | 'grimoire'
  | 'members'
  | 'compendium'
  | 'categories'
  | 'forms'
  | 'deities'
  | 'astrology'
  | 'people'
  | 'support';

/**
 * One section: a tab on a wide screen, an item in the bottom bar on a phone.
 * The icon is a name, not an element, so the list can stay on the server and
 * cross to the client part as plain data.
 */
export interface SectionNavItem {
  label: string;
  href: Route;
  icon: SectionIconName;
  /**
   * Current only at its own address. The coven index needs it, being the
   * ancestor of every coven page; the others are current beneath theirs too.
   */
  exact?: boolean;
  /** Other addresses the section is current on: Categories on its Groups tab's. */
  matches?: readonly Route[];
  /**
   * Starts a new group of sections: a hairline stands before it in the row,
   * and above it in the More list. The admin nav's People, after the
   * compendium's pages.
   */
  apart?: boolean;
  /** What the page draws while it is on its way: its region and shape. */
  target?: NavigationTarget;
}

export interface SectionNavProps {
  /** The nav's `aria-label`, distinct on a page: "Coven", "Admin". */
  label: string;
  /** In their order; the first four stay in view when the room is short, the rest go behind More. */
  sections: readonly SectionNavItem[];
}
