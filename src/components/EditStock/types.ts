import type { StockOfJar } from '../StockFields/types';

/** The jar the dialog edits, as its line on the page has it. */
export interface EditStockJar extends StockOfJar {
  id: string;
  /** What the coven calls the ingredient: the dialog's title, so its head holds still as the jar changes. */
  ingredient: string;
  /** The variant's form as stored; the dialog writes it through `formLabel`. */
  form: string;
}

export interface EditStockProps {
  workspaceId: string;
  jar: EditStockJar;
}

/** The inside of the dialog, drawn once it is open. */
export interface EditStockFormProps extends EditStockProps {
  /** The modal's own close, so it fades out after a save. */
  close: () => void;
}
