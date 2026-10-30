import 'server-only';
import {
  type StockRow,
  findCupboardEntry,
  findOneIngredient,
  findReadableVariant,
  findStockById,
  findStockByIds,
  findStockOfIngredients,
  findStockOfVariants,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { ValidationIssue } from '../../../lib/types';
import type { Session } from '../../../lib/session';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { inventoryItems } from '../schema/inventory-items';
import { workspaceCompendiumEntries } from '../schema/workspace-compendium-entries';
import { dimensionOf } from '../schema/units';
import { defaultThreshold } from '../validation/default-threshold';
import { StockInput } from '../validation/stock';
import { heldCompendiumEntry } from './cupboard-entries';
import { variantsOf } from './ingredient-children';
import type { IngredientVariantRow, SaveStockValues, StockKey, StockValues } from '../types';
import { type Membership, assertMembership } from '@/modules/coven';

// What a coven holds of each form, written by members and owners and read by everyone in it (claude-docs/db/stock.md, "The stock service").
// Writes check `inventory: update` (the statement has no `create` or `delete`), reads `inventory: read`; the dimension is the unit's, never input.

const NO_FORM = 'No such form for this coven to stock';
const NO_JAR = 'No such stock in this coven';
const HELD = 'Your coven already holds this form';

/**
 * Starts the coven's jar of a form with `input`'s amounts; a form already held is refused, not topped up
 * (claude-docs/db/stock.md, "Stock service details").
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {ValidationError} the input breaks `StockInput`, or the coven already holds the form.
 * @throws {NotFound} no live form with this id the coven may read.
 */
export async function createStock(
  session: Session,
  workspaceId: string,
  variantId: string,
  input: StockValues,
): Promise<StockRow> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['update'] });
  const parsed = parseInput(StockInput, input);
  // An id that is not a uuid names nothing and would be a driver error at the comparison.
  if (!RowId.safeParse(variantId).success) throw new NotFound(NO_FORM);
  // With `membership` as `heldBy`, a retired compendium entry this coven's cupboard names takes a jar too.
  const variant = await findReadableVariant([membership], variantId, membership);
  if (!variant) throw new NotFound(NO_FORM);

  const entry = await findOneIngredient([membership], variant.ingredientId);
  try {
    const [row] = await withAudit(session, async (write) => {
      await write.lockCovenStock(membership);
      // A jar of a compendium form puts the entry in the cupboard once; a retired entry is never put back
      // (claude-docs/db/stock.md, "Stock service details").
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
        ...newJarColumns(parsed),
      });
    });
    return row;
  } catch (error) {
    // The partial unique index is the check, so two creates racing for one form are refused alike.
    if (violatedUniqueIndex(error) === 'inventory_items_workspace_id_variant_id_unique')
      throw new ValidationError([{ path: ['variantId'], message: HELD }]);
    throw error;
  }
}

/**
 * Changes a jar of this coven: an omitted field keeps its value, null clears it, and a first unit takes the default threshold
 * (claude-docs/db/stock.md, "Stock service details").
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {ValidationError} the input breaks `StockInput`.
 * @throws {NotFound} no live jar in this coven has this id.
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

  const columns = changedJarColumns(current, parsed);

  const [row] = await withAudit(session, (write) =>
    write.updateByIdInWorkspace(membership, inventoryItems, id, columns),
  );
  if (!row) throw new NotFound(NO_JAR);
  return row;
}

/**
 * The stock dialog's whole Save for one ingredient: jars created, changed and deleted in one transaction, answering its live jars
 * (claude-docs/db/stock.md, "Stock service details").
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {ValidationError} a row breaks `StockInput`, the coven already holds a form in `create`, or one jar is named twice.
 * @throws {NotFound} a jar or form is not a live one of this coven and ingredient.
 */
export async function saveStock(
  session: Session,
  workspaceId: string,
  ingredientId: string,
  batch: SaveStockValues,
): Promise<StockRow[]> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['update'] });
  if (batch.create.length + batch.update.length + batch.delete.length === 0) {
    return RowId.safeParse(ingredientId).success
      ? findStockOfIngredients(membership, [ingredientId])
      : [];
  }

  const issues: ValidationIssue[] = [];
  const parsed = <Row extends { input: StockValues }>(list: string, rows: readonly Row[]) =>
    rows.map(({ input }, index) => {
      try {
        return parseInput(StockInput, input);
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error;
        for (const { path, message } of error.issues)
          issues.push({ path: [list, index, 'input', ...path], message });
        return null;
      }
    });
  const created = parsed('create', batch.create);
  const updated = parsed('update', batch.update);
  const named = new Set<string>();
  const again = (list: string, ids: readonly string[], key: (string | number)[] = []) =>
    ids.forEach((id, index) => {
      if (named.has(id))
        issues.push({ path: [list, index, ...key], message: 'Each jar can be saved once' });
      named.add(id);
    });
  again(
    'update',
    batch.update.map((row) => row.id),
    ['id'],
  );
  again('delete', batch.delete);
  if (issues.length > 0) throw new ValidationError(issues);

  // Every id is read before anything is written, and every unreadable id is the same refusal of the whole batch.
  const ids = [...batch.update.map((row) => row.id), ...batch.delete];
  if (!ids.every((id) => RowId.safeParse(id).success)) throw new NotFound(NO_JAR);
  const held = new Map((await findStockByIds(membership, ids)).map((jar) => [jar.id, jar]));
  for (const id of ids) if (held.get(id)?.ingredientId !== ingredientId) throw new NotFound(NO_JAR);

  const variants = await Promise.all(
    batch.create.map(async ({ variantId }) => {
      if (!RowId.safeParse(variantId).success) throw new NotFound(NO_FORM);
      const variant = await findReadableVariant([membership], variantId, membership);
      if (variant?.ingredientId !== ingredientId) throw new NotFound(NO_FORM);
      return variant;
    }),
  );
  const entry =
    batch.create.length > 0 ? await findOneIngredient([membership], ingredientId) : null;

  let index = -1;
  try {
    await withAudit(session, async (write) => {
      await write.lockCovenStock(membership);
      if (batch.create.length > 0) {
        // As `createStock`: a first compendium jar puts the entry in the cupboard once.
        if (!entry) {
          if (!(await heldCompendiumEntry(membership, ingredientId))) throw new NotFound(NO_FORM);
        } else if (entry.workspaceId === null && !(await findCupboardEntry(membership, entry.id))) {
          await write.insertInWorkspace(membership, workspaceCompendiumEntries, {
            ingredientId: entry.id,
          });
        }
      }
      for (index = 0; index < batch.create.length; index++) {
        await write.insertInWorkspace(membership, inventoryItems, {
          ingredientId,
          variantId: variants[index].id,
          ...newJarColumns(created[index]!),
        });
      }
      for (let i = 0; i < batch.update.length; i++) {
        const { id } = batch.update[i];
        const [row] = await write.updateByIdInWorkspace(
          membership,
          inventoryItems,
          id,
          changedJarColumns(held.get(id)!, updated[i]!),
        );
        if (!row) throw new NotFound(NO_JAR);
      }
      for (const id of batch.delete) {
        const [row] = await write.softDeleteByIdInWorkspace(membership, inventoryItems, id);
        if (!row) throw new NotFound(NO_JAR);
      }
    });
  } catch (error) {
    // The partial unique index is the check, as in `createStock`.
    if (violatedUniqueIndex(error) === 'inventory_items_workspace_id_variant_id_unique')
      throw new ValidationError([{ path: ['create', index, 'variantId'], message: HELD }]);
    throw error;
  }
  return findStockOfIngredients(membership, [ingredientId]);
}

/**
 * Soft-deletes a jar of this coven, stamping who deleted it.
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

/** Each ingredient's live jars in the coven its ref names, one answer per ref in order: `Ingredient.stock`'s batch; a refused coven gets a `Forbidden` in its slot. */
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

/** The live forms of each compendium entry a coven holds, one answer per ref in order, retired entries read through the coven's cupboard (claude-docs/db/stock.md, "Stock service details"). */
export async function heldFormsOf(
  session: Session,
  refs: readonly StockKey[],
): Promise<(IngredientVariantRow[] | Forbidden | NotFound)[]> {
  const covens = [...new Set(refs.map((ref) => ref.workspaceId))];
  const forms = new Map(
    await Promise.all(
      covens.map(async (workspaceId) => {
        const ids = [
          ...new Set(
            refs
              .filter((ref) => ref.workspaceId === workspaceId)
              .map((ref) => ref.ingredientId)
              .filter((id) => RowId.safeParse(id).success),
          ),
        ];
        return [workspaceId, await formsHeldBy(session, workspaceId, ids)] as const;
      }),
    ),
  );
  return refs.map((ref) => {
    const held = forms.get(ref.workspaceId);
    if (held instanceof Forbidden) return held;
    return held?.get(ref.ingredientId) ?? new NotFound(NO_FORM);
  });
}

/** One coven's forms by entry id, a `NotFound` for an entry its cupboard does not name, or the refusal its proof threw. */
async function formsHeldBy(
  session: Session,
  workspaceId: string,
  ingredientIds: string[],
): Promise<Map<string, IngredientVariantRow[] | NotFound> | Forbidden> {
  let membership: Membership;
  try {
    membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  } catch (error) {
    if (error instanceof Forbidden) return error;
    throw error;
  }
  const rows = await variantsOf(
    session,
    ingredientIds.map((id) => ({ id, workspaceId: null })),
    membership,
  );
  const forms = new Map<string, IngredientVariantRow[] | NotFound>();
  await Promise.all(
    ingredientIds.map(async (id, i) => {
      const read = rows[i];
      if (read instanceof Forbidden) return;
      // A compendium ref needs no coven's proof. The SQL answers only what the coven may read, so an empty answer
      // is told apart here: an entry the cupboard does not name is a refusal, an entry with no forms is not.
      forms.set(
        id,
        read.length > 0 || (await heldCompendiumEntry(membership, id))
          ? read
          : new NotFound(NO_FORM),
      );
    }),
  );
  return forms;
}

/** The live jars `membership`'s coven holds of these forms, in one read (claude-docs/db/stock.md, "Stock service details"). */
export function jarsOfForms(
  membership: Membership,
  variantIds: readonly string[],
): Promise<StockRow[]> {
  return findStockOfVariants(membership, variantIds);
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

/** The live jar, read through its live form and ingredient (claude-docs/db/stock.md, "Stock service details"). */
async function readableJar(membership: Membership, id: string): Promise<StockRow> {
  if (!RowId.safeParse(id).success) throw new NotFound(NO_JAR);
  const row = await findStockById(membership, id);
  if (!row) throw new NotFound(NO_JAR);
  return row;
}

/** A new jar's columns: `input`'s, with the unit's default threshold when it states none. */
function newJarColumns(input: StockInput) {
  const unit = input.unit ?? null;
  return stockColumns({
    ...input,
    unit,
    lowStockThreshold: input.lowStockThreshold ?? defaultThreshold(unit),
  });
}

/**
 * A changed jar's columns: `input`'s, and the unit's default threshold for a
 * jar gaining its first unit while its threshold is empty.
 */
function changedJarColumns(current: StockRow, input: StockInput) {
  const first = current.unit === null && input.unit ? input.unit : null;
  const emptied =
    input.lowStockThreshold === undefined
      ? current.lowStockThreshold === null
      : input.lowStockThreshold === null;
  return stockColumns(
    first && emptied ? { ...input, lowStockThreshold: defaultThreshold(first) } : input,
  );
}

/** The columns `input` sets: each field it states, null included, with the unit's dimension wherever the unit is set. Amounts are `numeric` text. */
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
