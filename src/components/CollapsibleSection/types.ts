import type { ReactNode } from 'react';

/**
 * A folding section's state, which the form owns so that Save can open the
 * sections holding an error and an Open All / Close All can reach every one.
 */
export interface SectionFold {
  open: boolean;
  invalid: boolean;
  onToggle: () => void;
}

export interface FoldIdsOptions {
  block: string;
  open: boolean;
  invalid: boolean;
  flagged: boolean;
}

export interface FoldIds {
  id: string;
  summaryId: string;
  flagId: string;
  fieldsId: string;
  className: string;
  describedBy: string | undefined;
}

export interface FoldFlagProps {
  id: string;
  className: string;
  shown: boolean;
}

export interface CollapsibleSectionProps {
  title: string;
  summary: ReactNode;
  fold: SectionFold;
  level?: 3 | 4;
  /** An ⓘ beside the heading, outside the toggle, since a button cannot hold one. */
  info?: ReactNode;
  titleId?: string;
  children: ReactNode;
}

export interface FoldAllProps {
  anyOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}
