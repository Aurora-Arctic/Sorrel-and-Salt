import type { ReactNode } from 'react';

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
  | 'detail'
  | 'document';

export type SkeletonHead = 'eyebrow' | 'title' | undefined;

export interface SkeletonProps {
  shape: SkeletonShape;
  filter?: boolean;
  title?: boolean;
  action?: boolean;
  tabs?: boolean;
  tabsBelow?: boolean;
  columns?: number;
  fields?: number;
  side?: boolean;
  menu?: boolean;
  entry?: boolean;
  head?: 'eyebrow' | 'title';
  /** A `cards` skeleton draws compact cards, as the coven lists open at, unless a stored Regular choice sits on `<html>`. */
  density?: 'compact';
  /** A `cards` skeleton draws the Grimoire's spell cards (a title, an edited line and the card's actions) rather than the Ingredients cards. */
  card?: 'spell';
  count?: number;
}

export interface SwapPanelProps {
  /** Whether the next content is on its way, so the skeleton shows in its place. */
  pending: boolean;
  className: string;
  filter?: boolean;
  shape?: 'table' | 'cards' | 'sections' | 'requests' | 'document';
  columns?: number;
  fields?: number;
  count?: number;
  density?: 'compact';
  card?: 'spell';
  /** A minimum height for the skeleton's wrapper only, so the content it replaces keeps its room; the new content takes none. */
  loadingMinHeight?: number;
  children: ReactNode;
}
