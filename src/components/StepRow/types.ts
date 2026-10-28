import type { CSSProperties, ReactNode, Ref } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface StepRowProps {
  /** Where the step stands in the spell, counting from 1. */
  position: number;
  /** The ingredient and its form as the step reads them; null for an instruction-only step. */
  name: string | null;
  /** The form's group icon; null draws the generic spoon. Only drawn beside a name. */
  icon?: FormGroupIcon | null;
  /** The amount, as text. Read-only; `quantityField` replaces it. */
  quantity?: string | null;
  /** The unit, as text. Read-only; `unitField` replaces it. */
  unit?: string | null;
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
