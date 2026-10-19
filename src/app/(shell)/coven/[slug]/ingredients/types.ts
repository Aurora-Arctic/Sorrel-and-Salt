import type { CardCategory } from '../../../../../components/IngredientCard/types';
import type { SafetyVariant } from '../../../../../components/SafetyNote/types';
import type { Page, PagePosition } from '../../../../../lib/types';
import type { CupboardEntryRow, IngredientRow, StockRow } from '@/modules/ingredients';

/** What each listed entry carries beside its row: the coven's cupboard row, null for its own entry. */
export interface CovenListEdge {
  cupboardEntry: CupboardEntryRow | null;
}

/**
 * One numbered page of the coven's ingredients with everything its cards draw,
 * each list in the order of `edges`.
 */
export interface CovenIngredientPage extends Page<IngredientRow, CovenListEdge> {
  position: PagePosition;
  totalCount: number;
  /** Each entry's live forms, with the group icon each wears. */
  variants: SafetyVariant[][];
  /** Each entry's category chips. */
  categories: CardCategory[][];
  /** Each entry's live jars in this coven, one per form held. */
  jars: StockRow[][];
}
