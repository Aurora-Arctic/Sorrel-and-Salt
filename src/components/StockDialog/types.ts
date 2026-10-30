import type { ReactNode } from 'react';
import type { StockFormValues, StockOfJar } from '../StockFields/types';

/** A form the ingredient comes in: a variant, by its id, as the screen names it. */
export interface StockForm {
  variantId: string;
  /** Ready to show, title-cased already: "Dried Leaf". */
  label: string;
}

/** A jar the coven holds: its variant and its three amounts. */
export interface StockJar extends StockOfJar {
  id: string;
  variantId: string;
}

/** What the dialog reads of an entry: every form it comes in, and the jars a coven holds of it. */
export type StockData = Pick<StockDialogProps, 'forms' | 'jars'>;

export interface StockDialogProps {
  workspaceId: string;
  ingredientId: string;
  /** What the coven calls the ingredient: the dialog's title and its button's name. */
  ingredientName: string;
  /** Every form the ingredient comes in, in the order the dialog offers them. */
  forms: readonly StockForm[];
  /** The jars held, one per form at most. */
  jars: readonly StockJar[];
  /** A form, by its variant id, to open on; a form with no jar is added as a new row first. Left out, the first jar is chosen. */
  openOn?: string;
}

/** A jar on the entry page's shelf: a button of the caller's own, opening the same dialog on one form. */
export interface StockJarButtonProps extends StockDialogProps {
  /** The button's name, such as "Edit Stock, Rosemary, Dried Leaf". */
  ariaLabel: string;
  className?: string;
  /** What the button shows. */
  children: ReactNode;
}

/** One row of the dialog: a jar held, or one being added (`jarId` null). */
export interface StockRow extends StockFormValues {
  jarId: string | null;
  variantId: string;
  /** A held jar staged for deletion, sent as a delete on Save; Undo takes it back. */
  removed: boolean;
}

export interface StockDialogValues {
  rows: StockRow[];
}

/** The inside of the dialog, drawn once it is open. */
export interface StockDialogFormProps extends StockDialogProps {
  /** The modal's own close, so it fades out after a save. */
  close: () => void;
}

/** Where each entry of the batch's lists came from among the rows, to place an issue back. */
export interface StockBatchRows {
  create: number[];
  update: number[];
}
