import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { inventoryItems } from '../../modules/ingredients/schema/inventory-items';
import type { Membership } from '@/modules/coven';
import { inUseVariantParent } from './ingredient-parent';
import { notSoftDeleted, scopedTo } from './predicates';
import { existsIn, selectFrom } from './select';
import type { AuditWriter, StockRow, WriterContext } from './types';

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

/** The coven's live jars with these ids: M9.9's `saveStock` resolves a batch of them in one read. */
export function findStockByIds(
  membership: Membership,
  ids: readonly string[],
): Promise<StockRow[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return findManyStock(membership, inArray(inventoryItems.id, [...ids]));
}

/** The coven's live jars of these ingredients, every form of each: M9.4's `Ingredient.stock` batch. */
export function findStockOfIngredients(
  membership: Membership,
  ingredientIds: readonly string[],
): Promise<StockRow[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return findManyStock(membership, inArray(inventoryItems.ingredientId, [...ingredientIds]));
}

/**
 * The coven's live jars of these forms, at most one each: the spell save's
 * unit check reads every step's jar in one read (M13.2).
 */
export function findStockOfVariants(
  membership: Membership,
  variantIds: readonly string[],
): Promise<StockRow[]> {
  if (variantIds.length === 0) return Promise.resolve([]);
  return findManyStock(membership, inArray(inventoryItems.variantId, [...variantIds]));
}

/**
 * The coven's live jars under `where`, each of a live form of an ingredient
 * the proof may read, or of a retired compendium entry its cupboard still
 * names (`inUseVariantParent`, M12.24), so the coven goes on reading, changing
 * and emptying the jars of an entry it uses.
 */
function findManyStock(membership: Membership, where: SQL): Promise<StockRow[]> {
  return selectFrom(
    inventoryItems,
    and(
      scopedTo(membership, inventoryItems),
      notSoftDeleted(inventoryItems),
      inUseVariantParent([membership], inventoryItems.variantId, membership),
      where,
    ),
  );
}

/**
 * The first number of the two-number advisory lock a coven's stock saves take
 * (the second is a hash of the coven's id). A fixed namespace keeps it from
 * meeting any other advisory lock, now or later. Exported so a test can hold
 * the very lock the writer waits on.
 */
export const COVEN_STOCK_LOCK_NAMESPACE = 0x53544b31;

/**
 * The locked reads a conversion decides on (M12.21, M12.23), in the writer's
 * transaction so they see what the write has just made and hold what it
 * moves. Jars are locked in id order, so two writes moving the same jars
 * queue on the first rather than each holding one the other wants.
 */
export function stockWrites({
  tx,
}: WriterContext): Pick<
  AuditWriter,
  'lockCovenStock' | 'lockJarsOfIngredient' | 'lockLiveVariants'
> {
  return {
    // An advisory lock, not a row lock: a write moving or counting jars and a
    // create adding one share no row to lock (the jar being added does not
    // exist yet). It is taken first in every transaction that adds, counts or
    // moves the coven's jars, so whichever comes second waits and sees the
    // first, and the order matches the row locks below, which cannot then
    // deadlock on it. Released at commit.
    lockCovenStock: async (membership) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(${COVEN_STOCK_LOCK_NAMESPACE}, hashtext(${membership.workspaceId}))`,
      );
    },
    lockLiveVariants: (membership, ingredientId) =>
      selectFrom(
        ingredientVariants,
        and(
          notSoftDeleted(ingredientVariants),
          eq(ingredientVariants.ingredientId, ingredientId),
          existsIn(
            ingredients,
            and(
              eq(ingredients.id, ingredientVariants.ingredientId),
              scopedTo(membership, ingredients),
            ),
          ),
        ),
        { lockIn: tx, lockOrder: ingredientVariants.id },
      ),
    lockJarsOfIngredient: (membership, ingredientId) =>
      selectFrom(
        inventoryItems,
        and(
          scopedTo(membership, inventoryItems),
          notSoftDeleted(inventoryItems),
          eq(inventoryItems.ingredientId, ingredientId),
        ),
        { lockIn: tx, lockOrder: inventoryItems.id },
      ),
  };
}
