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
 * button to carry its tip, as the entry page's shelf is: the tip opens on hover, on focus,
 * so the keyboard reaches it (WCAG 2.1.1), and on a press, as InfoTip's ⓘ does, so a tap
 * shows it on touch (the owner's call, 2026-10-20). The press does nothing else.
 */
export const HeldMark = (): ReactElement => (
  <IconTip tip={HELD_ALL_TIP} opensOnPress>
    <button type="button" className="icon-tip__held" aria-label={HELD_ALL_TIP}>
      <CheckIcon />
    </button>
  </IconTip>
);
