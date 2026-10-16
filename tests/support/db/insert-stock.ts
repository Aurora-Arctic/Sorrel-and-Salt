import type postgres from 'postgres';
import { type Unit, dimensionOf } from '@/modules/ingredients/schema/units';

// The one way a test seeds a stock row it is not testing the writing of: raw,
// as `insertIngredient` is, so setup does not depend on the stock service
// (claude-docs/testing/fixture-factories.md, "Fixture factories").

/** A jar of one form, in one coven. Amounts are `numeric` text, as Postgres reads them. */
export interface StockFixture {
  workspaceId: string;
  ingredientId: string;
  variantId: string;
  quantityOnHand?: string | null;
  unit?: Unit | null;
  lowStockThreshold?: string | null;
  /** Written already soft-deleted, by `author`. */
  deleted?: boolean;
}

/**
 * Writes `stock`'s row stamped by `author`, its dimension the unit's as the
 * CHECK demands, and returns its id.
 */
export async function insertStock(
  sql: postgres.Sql,
  stock: StockFixture,
  author: string,
): Promise<string> {
  const { workspaceId, ingredientId, variantId, unit = null, deleted = false } = stock;
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx`
      insert into inventory_items ${tx({
        workspace_id: workspaceId,
        ingredient_id: ingredientId,
        variant_id: variantId,
        quantity_on_hand: stock.quantityOnHand ?? null,
        unit,
        unit_dimension: unit && dimensionOf(unit),
        low_stock_threshold: stock.lowStockThreshold ?? null,
        created_by: author,
        updated_by: author,
        deleted_at: deleted ? new Date() : null,
        deleted_by: deleted ? author : null,
      })}
      returning id`;
    return row.id as string;
  });
}
