import type { ReactNode } from 'react';

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
