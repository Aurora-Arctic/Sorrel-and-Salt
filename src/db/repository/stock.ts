import { and, eq, inArray, type SQL } from 'drizzle-orm';
import { inventoryItems } from '../../modules/ingredients/schema/inventory-items';
import type { Membership } from '@/modules/coven';
import { readableVariantParent } from './ingredient-parent';
import { notSoftDeleted, scopedTo } from './predicates';
import { selectFrom } from './select';
import type { StockRow } from './types';

// A coven's stock: one `inventory_items` row per form it holds (M9.3). Read
// through the form and its ingredient, both live and readable under the
// proof, so the jar M5.3's ingredient delete leaves in place is in no read,
// and neither is the jar of a form deleted since. Not the generic
// `findOneByIdInWorkspace`, which knows the row's own tombstone and no other
// (claude-docs/db/stock.md, "The stock service").

/** The coven's one live jar with this id, of a live form of a live ingredient. */
export async function findStockById(
  membership: Membership,
  id: string,
): Promise<StockRow | undefined> {
  const [row] = await findManyStock(membership, eq(inventoryItems.id, id));
  return row;
}

/** The coven's live jars of these ingredients, every form of each: M9.4's `Ingredient.stock` batch. */
export function findStockOfIngredients(
  membership: Membership,
  ingredientIds: readonly string[],
): Promise<StockRow[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return findManyStock(membership, inArray(inventoryItems.ingredientId, [...ingredientIds]));
}

/** The coven's live jars under `where`, each of a live form of an ingredient the proof may read. */
function findManyStock(membership: Membership, where: SQL): Promise<StockRow[]> {
  return selectFrom(
    inventoryItems,
    and(
      scopedTo(membership, inventoryItems),
      notSoftDeleted(inventoryItems),
      readableVariantParent([membership], inventoryItems.variantId),
      where,
    ),
  );
}
