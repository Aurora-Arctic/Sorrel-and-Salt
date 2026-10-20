import 'server-only';
import {
  type StockRow,
  findCupboardEntry,
  findOneIngredient,
  findReadableVariant,
  findStockById,
  findStockOfIngredients,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { inventoryItems } from '../schema/inventory-items';
import { workspaceCompendiumEntries } from '../schema/workspace-compendium-entries';
import { dimensionOf } from '../schema/units';
import { defaultThreshold } from '../validation/default-threshold';
import { StockInput } from '../validation/stock';
import { heldCompendiumEntry } from './cupboard-entries';
import type { StockKey, StockValues } from '../types';
import { type Membership, assertMembership } from '@/modules/coven';

// Story 12's stock half: what a coven holds of each form, written by its
// members and owners and read by everyone in it (claude-docs/db/stock.md, "The
// stock service"). Every write checks `inventory: update` — the statement has
// no `create` or `delete` — and every read `inventory: read`. The dimension is
// never input: it is the unit's, so the two cannot disagree.

const NO_FORM = 'No such form for this coven to stock';
const NO_JAR = 'No such stock in this coven';
const HELD = 'Your coven already holds this form';

/**
 * Starts the coven's jar of a form — a compendium entry's or the coven's own —
 * with `input`'s amounts. A form the coven already holds is refused rather
 * than topped up or returned, so the caller knows nothing was written: changing
 * a jar is `updateStock`'s. A form whose jar was deleted gets a fresh one. A new jar with a
 * unit and no threshold gets §5's default: 3 of a count unit, 10 g or 15 ml in
 * its own unit.
 *
 * The jar is stored on the form asked for, whatever the coven calls its own
 * entries: an own entry sharing a compendium entry's name takes nothing from
 * it (M12.28). A jar of a compendium form puts that entry in the coven's
 * cupboard, in the same transaction, when it is not there already (M12.15).
 * A form of a retired compendium entry takes a jar while this coven's
 * cupboard row names the entry, and never puts it back in the cupboard
 * (M12.24, as changed 2026-10-19).
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {ValidationError} the input breaks `StockInput`, or the coven
 * already holds the form, beside `variantId`.
 * @throws {NotFound} no live form with this id the coven may read — another
 * coven's included, a retired entry's this coven's cupboard does not name,
 * and an id that is not one.
 */
export async function createStock(
  session: Session,
  workspaceId: string,
  variantId: string,
  input: StockValues,
): Promise<StockRow> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['update'] });
  const parsed = parseInput(StockInput, input);
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(variantId).success) throw new NotFound(NO_FORM);
  // With `membership` as `heldBy`: a retired compendium entry this coven's
  // cupboard still names takes a new jar too (M12.24, as changed 2026-10-19).
  const variant = await findReadableVariant([membership], variantId, membership);
  if (!variant) throw new NotFound(NO_FORM);

  const unit = parsed.unit ?? null;
  const lowStockThreshold = parsed.lowStockThreshold ?? defaultThreshold(unit);
  const entry = await findOneIngredient([membership], variant.ingredientId);
  try {
    const [row] = await withAudit(session, async (write) => {
      await write.lockCovenStock(membership);
      // A jar of a compendium form puts the entry in the cupboard, once
      // (M12.15). The lock above makes the read below see a concurrent
      // create's row; the unique index backs it. A retired entry, which the
      // live read of `entry` does not return, is never put back: its jar
      // stands only on the cupboard row that admitted the form, read again
      // here so a remove that tombstoned the row before the lock refuses it.
      if (!entry) {
        if (!(await heldCompendiumEntry(membership, variant.ingredientId)))
          throw new NotFound(NO_FORM);
      } else if (entry.workspaceId === null && !(await findCupboardEntry(membership, entry.id))) {
        await write.insertInWorkspace(membership, workspaceCompendiumEntries, {
          ingredientId: entry.id,
        });
      }
      return write.insertInWorkspace(membership, inventoryItems, {
        ingredientId: variant.ingredientId,
        variantId: variant.id,
        ...stockColumns({ ...parsed, unit, lowStockThreshold }),
      });
    });
    return row;
  } catch (error) {
    // The partial unique index is the check, with no read before it, so two
    // creates racing for one form are refused alike.
    if (violatedUniqueIndex(error) === 'inventory_items_workspace_id_variant_id_unique')
      throw new ValidationError([{ path: ['variantId'], message: HELD }]);
    throw error;
  }
}

/**
 * Changes a jar of this coven. A field `input` leaves out keeps its value and
 * one it sets to null is cleared; a new unit brings its own dimension. A jar
 * that had no unit and gets one while its threshold is empty takes the unit's
 * default, as a new jar does (M9.9); a threshold already set, or stated by the
 * input, is never replaced, and a jar that already had a unit gets none.
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {ValidationError} the input breaks `StockInput`.
 * @throws {NotFound} no live jar in this coven has this id — one of a deleted
 * form or ingredient, other covens' included, and an id that is not one.
 */
export async function updateStock(
  session: Session,
  workspaceId: string,
  id: string,
  input: StockValues,
): Promise<StockRow> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['update'] });
  const parsed = parseInput(StockInput, input);
  const current = await readableJar(membership, id);

  const first = current.unit === null && parsed.unit ? parsed.unit : null;
  const emptied =
    parsed.lowStockThreshold === undefined
      ? current.lowStockThreshold === null
      : parsed.lowStockThreshold === null;
  const columns = stockColumns(
    first && emptied ? { ...parsed, lowStockThreshold: defaultThreshold(first) } : parsed,
  );

  const [row] = await withAudit(session, (write) =>
    write.updateByIdInWorkspace(membership, inventoryItems, id, columns),
  );
  if (!row) throw new NotFound(NO_JAR);
  return row;
}

/**
 * Soft-deletes a jar of this coven, stamping who deleted it. Creating the
 * form's jar again starts a fresh one.
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {NotFound} no live jar in this coven has this id, as `updateStock`.
 */
export async function deleteStock(
  session: Session,
  workspaceId: string,
  id: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['update'] });
  await readableJar(membership, id);

  const [row] = await withAudit(session, (write) =>
    write.softDeleteByIdInWorkspace(membership, inventoryItems, id),
  );
  if (!row) throw new NotFound(NO_JAR);
}

/**
 * One jar of this coven, for any member, viewers included.
 *
 * @throws {Forbidden} the caller may not read this coven's stock.
 * @throws {NotFound} no live jar in this coven has this id, as `updateStock`.
 */
export async function getStock(
  session: Session,
  workspaceId: string,
  id: string,
): Promise<StockRow> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['read'] });
  return readableJar(membership, id);
}

/**
 * Each ingredient's live jars in the coven its ref names, one per form held,
 * one answer per ref in the order given: `Ingredient.stock`'s batch (M9.4).
 * One read per coven named, whatever the batch size, plus a role lookup each.
 * A ref naming a coven the caller may not read the stock of gets a
 * `Forbidden` in its slot while the rest of the batch stands.
 */
export async function stockOf(
  session: Session,
  refs: readonly StockKey[],
): Promise<(StockRow[] | Forbidden)[]> {
  const covens = [...new Set(refs.map((ref) => ref.workspaceId))];
  const jars = new Map(
    await Promise.all(
      covens.map(async (workspaceId) => {
        const ids = [
          ...new Set(
            refs.filter((ref) => ref.workspaceId === workspaceId).map((ref) => ref.ingredientId),
          ),
        ];
        return [workspaceId, await jarsOf(session, workspaceId, ids)] as const;
      }),
    ),
  );
  return refs.map((ref) => {
    const held = jars.get(ref.workspaceId);
    return held instanceof Forbidden
      ? held
      : (held ?? []).filter((jar) => jar.ingredientId === ref.ingredientId);
  });
}

/** One coven's live jars of these ingredients, or the refusal its proof threw. */
async function jarsOf(
  session: Session,
  workspaceId: string,
  ingredientIds: string[],
): Promise<StockRow[] | Forbidden> {
  let membership: Membership;
  try {
    membership = await assertMembership(session, workspaceId, { inventory: ['read'] });
  } catch (error) {
    if (error instanceof Forbidden) return error;
    throw error;
  }
  return findStockOfIngredients(membership, ingredientIds);
}

/**
 * The live jar, read through its live form and ingredient. A write reads it
 * first because the writer's by-id methods know the jar's own tombstone and
 * not its ingredient's, which M5.3's delete leaves the jar beside.
 */
async function readableJar(membership: Membership, id: string): Promise<StockRow> {
  if (!RowId.safeParse(id).success) throw new NotFound(NO_JAR);
  const row = await findStockById(membership, id);
  if (!row) throw new NotFound(NO_JAR);
  return row;
}

/**
 * The columns `input` sets: each field it states, null included, and none it
 * leaves out, with the unit's dimension wherever the unit is set. Amounts are
 * `numeric` text, as Drizzle writes the column.
 */
function stockColumns(input: StockInput) {
  const amount = (value: number | null | undefined) =>
    value === undefined ? undefined : value === null ? null : String(value);
  const { unit } = input;
  return {
    quantityOnHand: amount(input.quantityOnHand),
    lowStockThreshold: amount(input.lowStockThreshold),
    unit,
    unitDimension: unit === undefined ? undefined : unit === null ? null : dimensionOf(unit),
    source: input.source,
    acquiredDate: input.acquiredDate,
  };
}
