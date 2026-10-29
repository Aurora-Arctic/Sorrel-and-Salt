import type { ReactNode } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

/**
 * A form as the caution needs it: its name, its own notes and its own flag.
 * Structural, so a card's or the entry page's GraphQL variant passes as is.
 */
export interface SafetyVariant {
  form: string;
  /** The curated form picked, whose group gives the icon; null for a typed form, which draws the spoon. */
  formChoice?: { group: { icon?: FormGroupIcon | null } } | null;
  safetyNotes?: string | null;
  toxic?: boolean | null;
}

/** The heading levels a caution can sit at beneath its consumer's own heading. */
export type SafetyHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface SafetyNoteProps {
  /** The ingredient's own notes, shown first; blank counts as none. */
  safetyNotes?: string | null;
  /**
   * The forms the consumer shows: each one's notes follow the ingredient's, under the form's
   * name. A form without notes takes no line.
   */
  variants?: readonly SafetyVariant[];
  /** The Caution heading's level, one below the heading it sits under. Defaults to 3. */
  level?: SafetyHeadingLevel;
  /**
   * A line after the notes, inside the caution, for a consumer that shows no forms: the
   * details modal names the forms that carry their own. It shows the caution by itself when
   * there are no notes.
   */
  footnote?: ReactNode;
  /**
   * A small block for a crowded place, the spell builder's open step: the heading runs on in
   * the line with the notes, in body type. The word and the bar still say it, not colour alone.
   */
  compact?: boolean;
}

export interface ToxicMarkProps {
  /** The ingredient's own flag. */
  toxic?: boolean | null;
  /** The forms the consumer shows; any one flagged shows the mark. */
  variants?: readonly SafetyVariant[];
}

export interface CautionMarkProps {
  /** The ingredient's own notes; blank counts as none. */
  safetyNotes?: string | null;
  /** The forms the consumer shows; notes on any one show the mark. */
  variants?: readonly SafetyVariant[];
}

/** ToxicMark's and CautionMark's props together: SafetyMark draws one of the two. */
export interface SafetyMarkProps {
  toxic?: boolean | null;
  safetyNotes?: string | null;
  variants?: readonly SafetyVariant[];
}
