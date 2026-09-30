import type { IngredientKey } from '@/modules/ingredients';

/** An ingredient the loader test wrote, with the children it was given. */
export interface Written {
  ref: IngredientKey;
  folkNames: string[];
  categories: string[];
}
