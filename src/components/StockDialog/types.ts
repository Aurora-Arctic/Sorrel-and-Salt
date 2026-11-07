import type { ReactNode } from 'react';
import type { StockFormValues, StockOfJar } from '../StockFields/types';

export interface StockForm {
  variantId: string;
  label: string;
}

export interface StockJar extends StockOfJar {
  id: string;
  variantId: string;
}

export type StockData = Pick<StockDialogProps, 'forms' | 'jars'>;

export interface StockDialogProps {
  workspaceId: string;
  ingredientId: string;
  ingredientName: string;
  forms: readonly StockForm[];
  jars: readonly StockJar[];
  openOn?: string;
}

export interface StockJarButtonProps extends StockDialogProps {
  ariaLabel: string;
  className?: string;
  onSaved?: () => void;
  children: ReactNode;
}

export interface StockRow extends StockFormValues {
  jarId: string | null;
  variantId: string;
  removed: boolean;
}

export interface StockDialogValues {
  rows: StockRow[];
}

export interface StockDialogFormProps extends StockDialogProps {
  /** The modal's own close, so it fades out after a save. */
  close: () => void;
  onSaved?: () => void;
}

export interface StockBatchRows {
  create: number[];
  update: number[];
}
