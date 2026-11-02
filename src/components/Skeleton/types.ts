import type { ReactNode } from 'react';

/** What a skeleton stands in for. */
export type SkeletonShape =
  | 'table'
  | 'cards'
  | 'form'
  | 'page'
  | 'sections'
  | 'requests'
  | 'contents'
  | 'line'
  | 'recipe'
  | 'detail';

/** A page's head: a title and a lede (the default), with an `eyebrow` above them, or the `title` alone. */
export type SkeletonHead = 'eyebrow' | 'title' | undefined;

export interface SkeletonProps {
  /** `table` (a tabbed list), `cards` (the Ingredients cards), `form` (a form's fields and buttons) `page` (a heading and blocks), `sections` (a tab's menu and stacked panels, under a heading that stays put), `requests` (the account's Support Requests tab: the New Request button's square, then two-line rows), `contents` (a heading and titled lists of links, the admin index) `recipe` (a spell's own page: the back link, Edited line, title and its actions, the Workings menu, the main column and the side column) or `line` (a line of text each, for a sentence or a short list that loads in place). */
  shape: SkeletonShape;
  /** Whether a `table` or `cards` skeleton draws a filter row above the list. */
  filter?: boolean;
  /** Whether a `table` or `cards` skeleton draws the page's heading row above everything else. */
  title?: boolean;
  /** With `title`: a button-sized block at the heading's end, for a page with an Add. */
  action?: boolean;
  /** With `title`: a tab track between the heading and the action, for a tabbed page. */
  tabs?: boolean;
  /** With `title` and `tabs`: the tab row stands on a line of its own beneath the heading, as a page with `tabsBelow` lays it, and is as wide as six pills. */
  tabsBelow?: boolean;
  /** A `table` skeleton's column count, where the page's table has more than the default three. */
  columns?: number;
  /** A `table` skeleton's filter controls, where the page's filter has more than the default two. */
  fields?: number;
  /** A `detail` skeleton draws the side column of settings beside the main column. */
  side?: boolean;
  /** A `page` skeleton draws a side menu beside its heading and blocks, for a page with a jump or contents menu. */
  menu?: boolean;
  /** With `menu`: the content fills the wide column beside the menu, as an ingredient's entry does, not the narrow column of the coven home. */
  entry?: boolean;
  /** A `page` or `contents` skeleton's head, drawn at the size of the real one. */
  head?: 'eyebrow' | 'title';
  /** A `cards` skeleton draws compact cards, as the coven lists open at, unless a stored Regular choice sits on `<html>`. */
  density?: 'compact';
  /** A `cards` skeleton draws the Grimoire's spell cards (a title, an edited line and the card's actions) rather than the Ingredients cards. */
  card?: 'spell';
  /** How many rows, cards, fields, blocks or lines it draws; each shape has its own default. */
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
  shape?: 'table' | 'cards' | 'sections' | 'requests';
  /** A `table` skeleton's column count, as `TabPanelLoading`'s. */
  columns?: number;
  /** A `table` skeleton's filter controls, as `TabPanelLoading`'s. */
  fields?: number;
  /** With `sections`: how many panels, as `TabPanelLoading`'s. */
  count?: number;
  /** The density of a `cards` skeleton, as `TabPanelLoading`'s. */
  density?: 'compact';
  /** The card a `cards` skeleton draws, as `TabPanelLoading`'s. */
  card?: 'spell';
  /** A minimum height for the skeleton's wrapper only, so the content it replaces keeps its room; the new content takes none. */
  loadingMinHeight?: number;
  children: ReactNode;
}
