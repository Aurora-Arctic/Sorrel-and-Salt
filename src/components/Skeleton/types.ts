import type { ReactNode } from 'react';

/** What a skeleton stands in for: `line` (a line of text) or `block` (a control-sized box). */
type SkeletonShape = 'line' | 'block';

export interface SkeletonProps {
  /** `line` (a line of text each, for a sentence or a short list that loads in place) or `block` (a control-sized box each, for a field). */
  shape: SkeletonShape;
  /** How many lines or blocks it draws. Default 1. */
  count?: number;
  /** Leaves out the `Loading` status, for a skeleton drawn inside a shell body that already carries the one. */
  quiet?: boolean;
}
export interface SwapPanelProps {
  /** Whether the next content is on its way, so the skeleton shows in its place. */
  pending: boolean;
  /** The panel's own class: "tabbed-page__panel", "list-frame__body". */
  className: string;
  /** The placeholder drawn in the content's place while the next is on its way. */
  skeleton: ReactNode;
  /** A minimum height for the skeleton's wrapper only, so the content it replaces keeps its room; the new content takes none. */
  loadingMinHeight?: number;
  children: ReactNode;
}
