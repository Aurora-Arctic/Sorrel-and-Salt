import type { CSSProperties, ReactNode, Ref } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface StepRowProps {
  /** Where the step stands in the spell, counting from 1. */
  position: number;
  /**
   * The ingredient and its form as the step reads them; null for an instruction-only step.
   * Markup where a read-only caller links the ingredient (the recipe body).
   */
  name: ReactNode;
  /** The form's group icon; null draws the generic spoon. Only drawn beside a name. */
  icon?: FormGroupIcon | null;
  /** The amount, as text. On a card, `quantityField` replaces it. */
  quantity?: string | null;
  /** The unit, as text. On a card, `unitField` replaces it. */
  unit?: string | null;
  /** A badge beside the name, such as the safety mark. Only drawn beside a name. */
  marks?: ReactNode;
  /** A block beneath the row's controls, the width of the row, such as the safety note. */
  note?: ReactNode;
  /** The step's instruction. On a card, `bodyField` replaces it. */
  body?: string | null;
  /**
   * Makes the card open or closed (the ingredient form's variant card). Closed it is one line:
   * the name, `summary`, marks, `edit` and `actions`. Open it also holds the fields, the
   * instruction and the note. Left out, the row is always as the caller fills it.
   */
  open?: boolean;
  /** The id of the opened fields, which `edit` names in its `aria-controls`. */
  fieldsId?: string;
  /**
   * A muted line beneath the name while closed, such as the amount. An instruction-only step's
   * summary is its text.
   */
  summary?: ReactNode;
  /** A small badge straight after the name, such as One-Off. */
  badge?: ReactNode;
  /** A click on the card's own face (not a control or an open field) toggles it; the pencil stays the accessible toggle. */
  onToggle?: () => void;
  /** The pencil that opens the row. */
  edit?: ReactNode;
  /** The Quick Look eye: after the badges, before `edit`, in the same tight group of buttons. */
  look?: ReactNode;
  /** The node the fields' errors are drawn in, the full width beneath the inputs. */
  errorRef?: Ref<HTMLDivElement>;
  /** The move handle, before the position. */
  handle?: ReactNode;
  /** A one-off's name, first of the open fields and the full width of them. */
  nameField?: ReactNode;
  /**
   * The card's open fields, each in place of the plain text it stands for; a row without `open`
   * draws none of them.
   */
  formField?: ReactNode;
  quantityField?: ReactNode;
  unitField?: ReactNode;
  bodyField?: ReactNode;
  /** The card's buttons after `edit`, such as Remove. */
  actions?: ReactNode;
  /** For a caller that makes the row sortable: the row's ref, class and style. */
  rowRef?: Ref<HTMLLIElement>;
  className?: string;
  style?: CSSProperties;
}
