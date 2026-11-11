import { hasText } from '@/lib/text';
import type { ReactElement } from 'react';
import type { CautionMarkProps } from './types';

// A badge summing up the cautions where the notes are not shown. A word, not a link or a tip, so nothing on it takes
// focus (claude-docs/components/safety-note.md, "Contracts").
export const CautionMark = ({
  safetyNotes,
  variants = [],
}: CautionMarkProps): ReactElement | null =>
  hasText(safetyNotes) || variants.some((variant) => hasText(variant.safetyNotes)) ? (
    <span className="badge badge--caution">Caution</span>
  ) : null;
