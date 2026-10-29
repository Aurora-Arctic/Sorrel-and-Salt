import type { ReactElement } from 'react';
import type { CautionMarkProps } from './types';

const said = (notes: string | null | undefined): boolean => (notes ?? '').trim() !== '';

// A badge summing up the cautions: on the card, which shows no notes, and in the entry page's
// head, above notes the reader may not have reached. On when the ingredient or any form shown
// has notes. It is a word, not a link or a tip, so nothing on it takes focus; the notes
// themselves are on the entry page. claude-docs/components/safety-note.md, "Contracts".
export const CautionMark = ({
  safetyNotes,
  variants = [],
}: CautionMarkProps): ReactElement | null =>
  said(safetyNotes) || variants.some((variant) => said(variant.safetyNotes)) ? (
    <span className="badge badge--caution">Caution</span>
  ) : null;
