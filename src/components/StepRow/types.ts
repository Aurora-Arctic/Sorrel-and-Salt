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
  /** A badge beside the name, such as the safety mark (M10.18). Only drawn beside a name. */
  marks?: ReactNode;
  /** A block beneath the row's controls, the width of the row, such as the safety note (M10.18). */
  note?: ReactNode;
  /** The step's instruction. Read-only; `bodyField` replaces it. */
  body?: string | null;
  /**
   * Makes the card open or closed (the ingredient form's variant card). Closed it is one line:
   * the name, `summary`, marks, `edit` and `actions`. Open it also holds the fields, the
   * instruction and the note. Left out, the row is always as the caller fills it.
   */
  open?: boolean;
  /** The id of the opened fields, which `edit` names in its `aria-controls`. */
  fieldsId?: string;
  /** A muted phrase after the name while closed, such as the amount and the instruction. */
  summary?: ReactNode;
  /** A small badge straight after the name, such as One-Off. */
  badge?: ReactNode;
  /** A click on the card's own face (not a control or an open field) toggles it; the pencil stays the accessible toggle. */
  onToggle?: () => void;
  /** The pencil that opens the row. */
  edit?: ReactNode;
  /** A line in the open fields beneath the note, such as what a one-off means. */
  aside?: ReactNode;
  /** The editing controls around the step, each drawn in place of the plain text it stands for. */
  handle?: ReactNode;
  /** A one-off's name, first of the open fields and the full width of them. */
  nameField?: ReactNode;
  formField?: ReactNode;
  quantityField?: ReactNode;
  unitField?: ReactNode;
  bodyField?: ReactNode;
  actions?: ReactNode;
  /** For a caller that makes the row sortable: the row's ref, class and style. */
  rowRef?: Ref<HTMLLIElement>;
  className?: string;
  style?: CSSProperties;
}
