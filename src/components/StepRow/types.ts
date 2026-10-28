import type { CSSProperties, ReactNode, Ref } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface StepRowProps {
  /** Where the step stands in the spell, counting from 1. */
  position: number;
  /**
   * The ingredient and its form as the step reads them; null for an instruction-only step.
   * Markup where a read-only caller links the ingredient (the recipe body, M13.21).
   */
  name: ReactNode;
  /** The form's group icon; null draws the generic spoon. Only drawn beside a name. */
  icon?: FormGroupIcon | null;
  /** The amount, as text. Read-only; `quantityField` replaces it. */
  quantity?: string | null;
  /** The unit, as text. Read-only; `unitField` replaces it. */
  unit?: string | null;
  /** A badge beside the name, such as the safety mark (M10.18). Only drawn beside a name. */
  marks?: ReactNode;
  /** A block beneath the row's controls, the width of the row, such as the safety note (M10.18). */
  note?: ReactNode;
  /** The step's instruction. Read-only; `bodyField` replaces it. */
  body?: string | null;
  /** The editing controls around the step, each drawn in place of the plain text it stands for. */
  handle?: ReactNode;
  quantityField?: ReactNode;
  unitField?: ReactNode;
  bodyField?: ReactNode;
  actions?: ReactNode;
  /** For a caller that makes the row sortable: the row's ref, class and style. */
  rowRef?: Ref<HTMLLIElement>;
  className?: string;
  style?: CSSProperties;
}
