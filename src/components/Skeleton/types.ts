import type { ReactNode } from 'react';

/** What a skeleton stands in for. */
export type SkeletonShape = 'table' | 'cards' | 'form' | 'page';

export interface SkeletonProps {
  /** `table` (a tabbed list), `cards` (the Ingredients cards), `form` (a form's fields and buttons) or `page` (a heading and blocks). */
  shape: SkeletonShape;
  /** Whether a `table` or `cards` skeleton draws a filter row above the list. */
  filter?: boolean;
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
  /** A minimum height for the skeleton's wrapper only, so the content it replaces keeps its room; the new content takes none. */
  loadingMinHeight?: number;
  children: ReactNode;
}
