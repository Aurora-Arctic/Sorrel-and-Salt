import type { ReactElement } from 'react';
import { plural } from '@/lib/text';

// How many of the viewer's covens hold a compendium entry, and which: every membership counts, a
// viewer's coven too, unlike the plus's menu, which lists only covens the viewer may write in
// (claude-docs/components/compendium-cards.md, "The plus and the check").

export const holdingText = (holding: readonly string[]): string =>
  holding.length === 0
    ? ''
    : `. In ${holding.length} ${plural(holding.length, 'coven', 'covens')}: ${holding.join(', ')}`;

/**
 * The number drawn on the mark's corner. Kept from the accessibility tree, since the control's
 * name already says it in words; none at all where no coven holds the entry.
 */
export const HoldingCount = ({ holding }: { holding: readonly string[] }): ReactElement | null =>
  holding.length === 0 ? null : (
    <span className="add-icon__count" aria-hidden="true">
      {holding.length}
    </span>
  );
