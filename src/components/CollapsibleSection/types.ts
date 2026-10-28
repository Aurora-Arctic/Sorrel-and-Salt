import type { ReactNode } from 'react';

/**
 * A folding section's state, which the form owns so that Save can open the
 * sections holding an error and an Open All / Close All can reach every one.
 */
export interface SectionFold {
  open: boolean;
  /** It holds an error: flagged beneath its heading, open or closed. */
  invalid: boolean;
  onToggle: () => void;
}

/** What `useFoldIds` is told of a fold: its block class, and whether it is open, holds an error, and shows its flag. */
export interface FoldIdsOptions {
  block: string;
  open: boolean;
  invalid: boolean;
  /** The flag is drawn: a section's while it errs, a variant card's only while it is closed too. */
  flagged: boolean;
}

/** What a fold names its parts by, from `useFoldIds`. */
export interface FoldIds {
  /** The base the other ids are made from, for a fold that names a part of its own. */
  id: string;
  summaryId: string;
  flagId: string;
  fieldsId: string;
  className: string;
  /** Its toggle's `aria-describedby`: the closed line, and the flag while shown; undefined for neither. */
  describedBy: string | undefined;
}

export interface FoldFlagProps {
  id: string;
  className: string;
  shown: boolean;
}

/** A section of a form as a disclosure, its heading the toggle. */
export interface CollapsibleSectionProps {
  title: string;
  /** The muted line beneath the heading while closed: what the section holds. */
  summary: ReactNode;
  fold: SectionFold;
  /** Its heading's level: 3 for a form's sections, 4 for a section inside one, such as a variant's. */
  level?: 3 | 4;
  /** An ⓘ beside the heading, outside the toggle, since a button cannot hold one. */
  info?: ReactNode;
  /** The toggle's id, for a group inside that is named by the heading. */
  titleId?: string;
  children: ReactNode;
}

/** Open All / Close All's state, which the form owns with its sections'. */
export interface FoldAllProps {
  /** Any section is open: the control reads Close All, else Open All. */
  anyOpen: boolean;
  onToggle: () => void;
  /** Off while the form asks a question over itself, as Undo and Redo are then. */
  disabled?: boolean;
}
