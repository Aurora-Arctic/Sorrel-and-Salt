import type { CardCategory } from '../../../../../components/IngredientCard/types';
import type { SafetyVariant } from '../../../../../components/SafetyNote/types';
import type { Page, PagePosition } from '../../../../../lib/types';
import type { CupboardEntryRow, IngredientRow, LastEdit, StockRow } from '@/modules/ingredients';

/** What each listed entry carries beside its row: the coven's cupboard row, null for its own entry. */
export interface CovenListEdge {
  cupboardEntry: CupboardEntryRow | null;
}

/** One numbered page of the coven's ingredients with everything its cards draw, in `edges` order. */
export interface CovenIngredientPage extends Page<IngredientRow, CovenListEdge> {
  position: PagePosition;
  totalCount: number;
  /** Each entry's live forms, with the group icon each wears. */
  variants: SafetyVariant[][];
  /** Each entry's variant ids, in the order of `variants`: the stock dialog names a form by its variant. */
  variantIds: string[][];
  /** Each entry's category chips. */
  categories: CardCategory[][];
  /** The form of every variant on the page, by variant id: a jar names its variant, not its form. */
  formOf: ReadonlyMap<string, string>;
  /** Each entry's live jars in this coven, one per form held. */
  jars: StockRow[][];
  /** Each entry's latest edit across the coven's jars of it and, for its own entry, the row; null for none. */
  lastEdits: (LastEdit | null)[];
}

export interface CovenIngredientsParams {
  // Both are promises in Next 16: awaited before use.
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
