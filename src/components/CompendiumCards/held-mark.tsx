import type { ReactElement } from 'react';
import IconTip, { CheckIcon } from '../IconTip';
// The held check's look lives with the plus's, whose place it takes (claude-docs/components/add-icon.md).
import '../AddIcon/index.scss';

// The check at a compendium card's bottom right, in the plus's place once every coven the
// viewer may write in holds the entry (M9.12), and the same check on the entry pages. The
// plus itself is AddIcon's.

/**
 * The tip, and the start of the name: the one noun the compendium uses for "you hold this", as
 * the details modal's In Your Covens list does (MB.120, in place of In All Covens).
 */
export const HELD_ALL_TIP = 'In Your Covens';

/**
 * The check: every coven the viewer may write in holds this entry. A status mark, not a link
 * (the owner’s call, 2026-10-20): the details modal’s In Your Covens list carries the links
 * to each coven’s copy. Tipped In Your Covens, and named that and then the entry, "In Your
 * Covens: Testwort, Formalis testis", as the plus is (MB.120), so a list of buttons tells one
 * card's check from the next. A
 * button to carry its tip, as the entry page's shelf is: the tip opens on hover, on focus,
 * so the keyboard reaches it (WCAG 2.1.1), and on a press, as InfoTip's ⓘ does, so a tap
 * shows it on touch (the owner's call, 2026-10-20). The press does nothing else.
 */
export const HeldMark = ({ name }: { name: string }): ReactElement => (
  <IconTip tip={HELD_ALL_TIP} opensOnPress>
    <button type="button" className="add-icon--held" aria-label={`${HELD_ALL_TIP}: ${name}`}>
      <CheckIcon />
    </button>
  </IconTip>
);
