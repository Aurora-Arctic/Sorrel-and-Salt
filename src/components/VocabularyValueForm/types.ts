import type { FlatVocabulary } from '../VocabularyValueList/types';
import type { AstrologyValueInput } from '@/modules/vocabulary/validation/astrology-value';

/** The fields as typed: a name and a description. */
export type VocabularyValueValues = AstrologyValueInput;

/** The value being edited, as the admin's form starts from it. */
export interface EditedVocabularyValue extends VocabularyValueValues {
  id: string;
}

export interface VocabularyValueFormProps {
  vocabulary: FlatVocabulary;
  /** The value to edit; none adds one. */
  value?: EditedVocabularyValue;
  /** Called once the value is saved or deleted, and on Cancel: the owner closes it. */
  onDone: () => void;
}
