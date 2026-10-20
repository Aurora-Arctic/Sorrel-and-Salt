import type { ReactElement } from 'react';
import { CheckIcon } from '../IconTip';

// The check at a compendium card's bottom right, in the plus's place once every coven the
// viewer may write in holds the entry (M9.12). The plus itself is AddIcon's.

/**
 * The check: every coven the viewer may write in holds this entry. A status mark, not a link
 * (the owner’s call, 2026-10-20): the details modal’s In Your Covens list carries the links
 * to each coven’s copy. An image named In My Ingredients, and no tip, since a tip opens on
 * hover or focus and a mark that takes no focus would show it to the pointer alone (WCAG 2.1.1).
 */
export const HeldMark = (): ReactElement => (
  <span className="icon-tip__held" role="img" aria-label="In My Ingredients">
    <CheckIcon />
  </span>
);
