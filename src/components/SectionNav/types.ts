import type { Route } from 'next';

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
  | 'invitations'
  | 'support'
  | 'documents'
  | 'businessCards';

// The icon is a name, not an element, so the list can cross to the client part as plain data.
export interface SectionNavItem {
  label: string;
  count?: number;
  href: Route;
  icon: SectionIconName;
  /** Current only at its own address: the coven index is the ancestor of every coven page. */
  exact?: boolean;
  matches?: readonly Route[];
  /** Starts a new group: a hairline stands before it in the row, and above it in the More list. */
  apart?: boolean;
}

export interface SectionNavProps {
  label: string;
  sections: readonly SectionNavItem[];
}
