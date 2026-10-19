import type { ReactElement } from 'react';
import type { CautionMarkProps } from './types';

const said = (notes: string | null | undefined): boolean => (notes ?? '').trim() !== '';

// A badge for a consumer that does not show the caution itself (the card, M8.14):
// on when the ingredient or any form shown has notes. It is a word, not a link or
// a tip, so nothing on it takes focus; the notes stay on the entry page.
// claude-docs/components/safety-note.md, "CautionMark".
export const CautionMark = ({
  safetyNotes,
  variants = [],
}: CautionMarkProps): ReactElement | null =>
  said(safetyNotes) || variants.some((variant) => said(variant.safetyNotes)) ? (
    <span className="badge badge--caution">Caution</span>
  ) : null;
