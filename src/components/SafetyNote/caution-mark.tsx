import type { ReactElement } from 'react';
import type { CautionMarkProps } from './types';

const said = (notes: string | null | undefined): boolean => (notes ?? '').trim() !== '';

// A badge summing up the cautions where the notes are not shown. A word, not a link or a tip, so nothing on it takes
// focus (claude-docs/components/safety-note.md, "Contracts").
export const CautionMark = ({
  safetyNotes,
  variants = [],
}: CautionMarkProps): ReactElement | null =>
  said(safetyNotes) || variants.some((variant) => said(variant.safetyNotes)) ? (
    <span className="badge badge--caution">Caution</span>
  ) : null;
