import type { ReactElement } from 'react';
import { CautionMark } from './caution-mark';
import { ToxicMark } from './toxic-mark';
import type { SafetyMarkProps } from './types';

// A badge row's one safety badge: Toxic when the ingredient or a shown form is flagged, else
// Caution when any has notes, else nothing. Toxic says more than Caution, so it stands alone
// when both apply. claude-docs/components/safety-note.md, "SafetyMark".
export const SafetyMark = ({
  toxic,
  safetyNotes,
  variants = [],
}: SafetyMarkProps): ReactElement | null =>
  toxic || variants.some((variant) => variant.toxic) ? (
    <ToxicMark toxic />
  ) : (
    <CautionMark safetyNotes={safetyNotes} variants={variants} />
  );
