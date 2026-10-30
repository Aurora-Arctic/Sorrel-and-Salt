import type { ReactNode } from 'react';

/** What a skeleton stands in for. */
export type SkeletonShape = 'table' | 'cards' | 'form' | 'page' | 'contents' | 'line';

/** A page's head: a title and a lede (the default), with an `eyebrow` above them, or the `title` alone. */
export type SkeletonHead = 'eyebrow' | 'title' | undefined;

export interface SkeletonProps {
  /** `table` (a tabbed list), `cards` (the Ingredients cards), `form` (a form's fields and buttons) `page` (a heading and blocks), `contents` (a heading and titled lists of links, the admin index) or `line` (one line of text, for a sentence that loads in place). */
  shape: SkeletonShape;
  /** Whether a `table` or `cards` skeleton draws a filter row above the list. */
  filter?: boolean;
  /** Whether a `table` or `cards` skeleton draws the page's heading row above everything else. */
  title?: boolean;
  /** With `title`: a button-sized block at the heading's end, for a page with an Add. */
  action?: boolean;
  /** With `title`: a tab track between the heading and the action, for a tabbed page. */
  tabs?: boolean;
  /** A `page` skeleton draws a side menu beside its heading and blocks, for a page with a jump or contents menu. */
  menu?: boolean;
  /** With `menu`: the content fills the wide column beside the menu, as an ingredient's entry does, not the narrow column of the coven home. */
  entry?: boolean;
  /** A `page` or `contents` skeleton's head, drawn at the size of the real one. */
  head?: 'eyebrow' | 'title';
  /** A `cards` skeleton draws compact cards, as the coven lists open at, unless a stored Regular choice sits on `<html>`. */
  density?: 'compact';
  /** How many rows, cards, fields or blocks it draws; each shape has its own default. */
  count?: number;
}

export interface SwapPanelProps {
  /** Whether the next content is on its way, so the skeleton shows in its place. */
  pending: boolean;
  /** The panel's own class: "tabbed-page__panel", "list-frame__body". */
  className: string;
  /** Whether the skeleton draws a filter row, as `TabPanelLoading`'s. */
  filter?: boolean;
  /** Which skeleton, as `TabPanelLoading`'s. */
  shape?: 'table' | 'cards';
  /** The density of a `cards` skeleton, as `TabPanelLoading`'s. */
  density?: 'compact';
  /** A minimum height for the skeleton's wrapper only, so the content it replaces keeps its room; the new content takes none. */
  loadingMinHeight?: number;
  children: ReactNode;
}
