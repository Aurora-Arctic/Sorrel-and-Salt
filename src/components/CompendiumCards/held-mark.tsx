import type { ReactElement } from 'react';
import IconTip, { CheckIcon } from '../IconTip';

// The check at a compendium card's bottom right, in the plus's place once every coven the
// viewer may write in holds the entry (M9.12), and the same check on the entry pages. The
// plus itself is AddIcon's.

export const HELD_ALL_TIP = 'In All Covens';

/**
 * The check: every coven the viewer may write in holds this entry. A status mark, not a link
 * (the owner’s call, 2026-10-20): the details modal’s In Your Covens list carries the links
 * to each coven’s copy. Named and tipped In All Covens (the owner’s call, 2026-10-20). A
 * button only to carry its tip, as the entry page's shelf is: a tip opens on hover or focus,
 * and a mark that took no focus would show it to the pointer alone (WCAG 2.1.1).
 */
export const HeldMark = (): ReactElement => (
  <IconTip tip={HELD_ALL_TIP}>
    <button type="button" className="icon-tip__held" aria-label={HELD_ALL_TIP}>
      <CheckIcon />
    </button>
  </IconTip>
);
