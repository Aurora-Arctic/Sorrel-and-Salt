import type { ReactElement } from 'react';
import { HoldingCount, holdingText } from '../AddIcon/holding';
import { HELD_ALL_TIP } from '../AddIcon/wording';
import IconTip, { CheckIcon } from '../IconTip';
// The held check's look lives with the plus's, whose place it takes
// (claude-docs/components/add-icon.md).
import '../AddIcon/index.scss';

// The check at a compendium card's bottom right, in the plus's place once every
// coven the viewer may write in holds the entry, and the same check on the entry
// pages. The plus itself is AddIcon's.

/**
 * The check: every coven the viewer may write in holds this entry. A status mark, not a link, tipped
 * "In Every Cupboard: Testwort, Formalis testis". A button to carry its tip, which opens on hover, on
 * focus (WCAG 2.1.1) and on a press; the press does nothing else.
 */
export const HeldMark = ({
  name,
  holding = [],
}: {
  name: string;
  /** Every coven of the viewer's that holds the entry, by name, any role: counted and named, as on the plus. */
  holding?: readonly string[];
}): ReactElement => {
  const label = `${HELD_ALL_TIP}: ${name}${holdingText(holding)}`;
  return (
    <IconTip tip={label} opensOnPress>
      <button type="button" className="add-icon--held" aria-label={label}>
        <CheckIcon />
        <HoldingCount holding={holding} />
      </button>
    </IconTip>
  );
};
