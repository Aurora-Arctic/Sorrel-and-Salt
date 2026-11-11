import type { ReactNode } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

/**
 * A form as the caution needs it: its name, its own notes and its own flag.
 * Structural, so a card's or the entry page's GraphQL variant passes as is.
 */
export interface SafetyVariant {
  form: string;
  formChoice?: { group: { icon?: FormGroupIcon | null } } | null;
  safetyNotes?: string | null;
  toxic?: boolean | null;
}

type SafetyHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface SafetyNoteProps {
  safetyNotes?: string | null;
  /**
   * The forms the consumer shows: each one's notes follow the ingredient's, under the form's
   * name. A form without notes takes no line.
   */
  variants?: readonly SafetyVariant[];
  level?: SafetyHeadingLevel;
  footnote?: ReactNode;
  compact?: boolean;
}

export interface ToxicMarkProps {
  toxic?: boolean | null;
  variants?: readonly SafetyVariant[];
}

export interface CautionMarkProps {
  safetyNotes?: string | null;
  variants?: readonly SafetyVariant[];
}

export interface SafetyMarkProps {
  toxic?: boolean | null;
  safetyNotes?: string | null;
  variants?: readonly SafetyVariant[];
}
