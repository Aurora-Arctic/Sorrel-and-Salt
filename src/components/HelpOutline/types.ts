import type { Route } from 'next';
import type { ReactNode } from 'react';

export type HelpOutlineKind = 'faq' | 'article' | 'guide' | 'term';
export type HelpOutlineAudience = 'public' | 'staff' | 'keeper';
export type HelpOutlineShown = 'shown' | 'hidden' | 'all';

/** What the right pane shows: a guide by id, every FAQ entry, or the glossary. */
export type HelpOutlineView = { guide: string } | 'faq' | 'glossary';

/** The list's filter as the address holds it: `''` is "any" for kind and audience. */
export interface HelpOutlineFilter {
  query: string;
  kind: HelpOutlineKind | '';
  audience: HelpOutlineAudience | '';
  shown: HelpOutlineShown;
}

/** One help row as a line of the outline. */
export interface HelpOutlineRow {
  id: string;
  title: string;
  kind: HelpOutlineKind;
  audience: HelpOutlineAudience;
  position: number | null;
  shown: boolean;
  editHref: Route;
}

/** A top-level article in the left pane, with how many of its sub pages the filter admits. */
export interface HelpOutlineGuide extends HelpOutlineRow {
  subPages: number;
  href: Route;
  current: boolean;
}

/** A top-level guide as Reorder Mode lists it: every live one, whatever the filter, in order. */
export interface HelpOutlineOrderGuide {
  id: string;
  title: string;
  audience: HelpOutlineAudience;
  shown: boolean;
}

export interface HelpGuidesBarProps {
  /** The guides the filter admits, in order: the bar at rest. */
  guides: readonly HelpOutlineGuide[];
  /** Every live top-level guide in order, hidden ones and those the filter leaves out among them: what Save Order writes. */
  order: readonly HelpOutlineOrderGuide[];
  others: readonly HelpOutlineOther[];
}

export interface HelpOutlineOther {
  label: string;
  count: number;
  href: Route;
  current: boolean;
}

/** A row of a sortable table, a sub page or an FAQ entry, with its place in the whole order. */
export interface HelpOutlineSubPage extends HelpOutlineRow {
  /** Its place in the guide's whole order, 0-based, hidden and filtered-out sub pages counted. */
  index: number;
}

/** The chosen guide, as the right pane heads it. */
export interface HelpOutlineChosen extends HelpOutlineRow {
  address: string;
  /** Its place among the top-level articles, and how many there are. */
  place: number;
  of: number;
  subPages: readonly HelpOutlineSubPage[];
  /** Every live sub page's id in the guide's order, whatever the filter: what a move writes back whole. */
  order: readonly string[];
  addSubPageHref: Route;
}

/** A search hit, with the guide a sub page sits in. */
export interface HelpOutlineHit extends HelpOutlineRow {
  guideTitle: string | null;
}

export type HelpOutlinePane =
  | { kind: 'guide'; guide: HelpOutlineChosen }
  | { kind: 'faq'; rows: readonly HelpOutlineSubPage[]; order: readonly string[]; address: string }
  | { kind: 'glossary'; rows: readonly HelpOutlineRow[]; address: string }
  | {
      kind: 'search';
      rows: readonly HelpOutlineHit[];
      previousHref?: Route;
      nextHref?: Route;
    }
  | { kind: 'empty' };

export interface HelpOutlineProps {
  filter: HelpOutlineFilter;
  guides: readonly HelpOutlineGuide[];
  others: readonly HelpOutlineOther[];
  order: readonly HelpOutlineOrderGuide[];
  pane: HelpOutlinePane;
}

/** The list a sortable table writes: a guide's sub pages, through the guide's `childIds`, or the FAQ. */
export type HelpOrderList = { kind: 'subPages'; guideId: string } | { kind: 'faq' };

/** A sortable table's column after its Order and Position columns, its cells drawn by the server. */
export interface HelpOrderColumn {
  heading: string;
  hiddenHeading?: boolean;
  className?: string;
  /** Stands at the card's top right at phone width, as a StackTable corner action does. */
  corner?: boolean;
  /** Names the row, as a StackTable's first column does. */
  rowHeader?: boolean;
}

/** A sortable table's row: its place in the whole order, 0-based, and a cell for each column. */
export interface HelpOrderRow {
  id: string;
  title: string;
  index: number;
  cells: readonly ReactNode[];
}
