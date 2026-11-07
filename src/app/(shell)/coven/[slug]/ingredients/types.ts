import type { CardCategory } from '../../../../../components/IngredientCard/types';
import type { SafetyVariant } from '../../../../../components/SafetyNote/types';
import type { Page, PagePosition } from '../../../../../lib/types';
import type { CupboardEntryRow, IngredientRow, LastEdit, StockRow } from '@/modules/ingredients';

export interface CovenListEdge {
  cupboardEntry: CupboardEntryRow | null;
}

export interface CovenIngredientPage extends Page<IngredientRow, CovenListEdge> {
  position: PagePosition;
  totalCount: number;
  variants: SafetyVariant[][];
  /** Each entry's variant ids, in the order of `variants`: the stock dialog names a form by its variant. */
  variantIds: string[][];
  categories: CardCategory[][];
  /** The form of every variant on the page, by variant id: a jar names its variant, not its form. */
  formOf: ReadonlyMap<string, string>;
  jars: StockRow[][];
  /** Each entry's latest edit across the coven's jars of it and, for its own entry, the row; null for none. */
  lastEdits: (LastEdit | null)[];
}

export interface CovenIngredientsParams {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
