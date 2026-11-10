import type { CSSProperties, ReactNode, Ref } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface StepRowProps {
  position: number;
  name: ReactNode;
  icon?: FormGroupIcon | null;
  quantity?: string | null;
  unit?: string | null;
  marks?: ReactNode;
  note?: ReactNode;
  body?: string | null;
  open?: boolean;
  fieldsId?: string;
  summary?: ReactNode;
  badge?: ReactNode;
  /** A click on the card's own face (not a control or an open field) toggles it; the pencil stays the accessible toggle. */
  onToggle?: () => void;
  edit?: ReactNode;
  look?: ReactNode;
  errorRef?: Ref<HTMLDivElement>;
  handle?: ReactNode;
  nameField?: ReactNode;
  /**
   * The card's open fields, each in place of the plain text it stands for; a row without `open`
   * draws none of them.
   */
  formField?: ReactNode;
  quantityField?: ReactNode;
  unitField?: ReactNode;
  bodyField?: ReactNode;
  actions?: ReactNode;
  rowRef?: Ref<HTMLLIElement>;
  className?: string;
  style?: CSSProperties;
}
