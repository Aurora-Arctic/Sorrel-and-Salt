import type { ReactElement } from 'react';
import IconTip, { CheckIcon } from '../IconTip';
// The held check's look lives with the plus's, whose place it takes (claude-docs/components/add-icon.md).
import '../AddIcon/index.scss';

// The check at a compendium card's bottom right, in the plus's place once every coven the
// viewer may write in holds the entry (M9.12), and the same check on the entry pages. The
// plus itself is AddIcon's.

/**
 * The start of the tip and the name: the compendium's one noun for "you hold this" is the
 * cupboard, as the entry page's In Your Cupboard and the details modal's In Your Cupboards say
 * (MB.120, the owner's call, 2026-10-20).
 */
export const HELD_ALL_TIP = 'In Every Cupboard';

/**
 * The check: every coven the viewer may write in holds this entry. A status mark, not a link
 * (the owner’s call, 2026-10-20): the details modal’s In Your Cupboards list carries the links
 * to each coven’s copy. Tipped and named In Every Cupboard and then the entry, "In Every
 * Cupboard: Testwort, Formalis testis", as the plus is (MB.120; the owner's call, 2026-10-20,
 * that the tip says the name too), so a list of buttons tells one card's check from the next. A
 * button to carry its tip, as the entry page's shelf is: the tip opens on hover, on focus,
 * so the keyboard reaches it (WCAG 2.1.1), and on a press, as InfoTip's ⓘ does, so a tap
 * shows it on touch (the owner's call, 2026-10-20). The press does nothing else.
 */
export const HeldMark = ({ name }: { name: string }): ReactElement => {
  const label = `${HELD_ALL_TIP}: ${name}`;
  return (
    <IconTip tip={label} opensOnPress>
      <button type="button" className="add-icon--held" aria-label={label}>
        <CheckIcon />
      </button>
    </IconTip>
  );
};
