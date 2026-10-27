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
        ...newJarColumns(parsed),
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

  const columns = changedJarColumns(current, parsed);

  const [row] = await withAudit(session, (write) =>
    write.updateByIdInWorkspace(membership, inventoryItems, id, columns),
  );
  if (!row) throw new NotFound(NO_JAR);
  return row;
}

/**
 * M9.9's Save: one ingredient's jars created, changed and deleted together,
 * the dialog's whole Save in one transaction, and answers the ingredient's live
 * jars after it. Each row is what its single-jar write takes (`StockInput`,
 * the first-unit default threshold, the cupboard row a first compendium jar
 * adds), so the two paths cannot drift.
 *
 * `ingredientId` scopes the batch: every jar and form named must be of that
 * ingredient and this coven, or the whole batch is refused. Nothing is
 * written until every row has been checked, and a refusal inside the
 * transaction rolls all of it back. Every bad row's issues come back in one
 * `ValidationError`, their paths prefixed by list and position —
 * `create.0.input.quantityOnHand`, `update.1.input.lowStockThreshold`, and
 * `create.2.variantId` for a form the coven already holds — so a form can
 * place each on its row. An empty batch writes nothing and opens no
 * transaction. No unit is ever converted.
 *
 * @throws {Forbidden} the caller may not write this coven's stock.
 * @throws {ValidationError} a row breaks `StockInput`, the coven already holds
 * a form in `create`, or one jar is named twice.
 * @throws {NotFound} a jar or form is not a live one of this coven and
 * ingredient, as the single-jar writes refuse it.
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

  // Every id is read before anything is written: a jar of another coven or
  // ingredient, a deleted one, and an id that is not one are all the same
  // refusal, and refuse the whole batch.
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
        // As `createStock`: a first jar of a compendium form puts the entry in
        // the cupboard, once; a retired entry is never put back.
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
    // The partial unique index is the check, as in `createStock`; the row
    // being inserted when it fires is the one that holds the form.
    if (violatedUniqueIndex(error) === 'inventory_items_workspace_id_variant_id_unique')
      throw new ValidationError([{ path: ['create', index, 'variantId'], message: HELD }]);
    throw error;
  }
  return findStockOfIngredients(membership, [ingredientId]);
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

/**
 * The live forms of each compendium entry a coven holds, one answer per ref in the order given:
 * what Edit Stock lists beside `stockOf`'s jars. Stock is per coven, so an entry the curators
 * have retired but the coven's cupboard still names is read like a live one (M12.24, the
 * owner's call of 2026-10-21): the forms come through that coven's own proof as `heldBy`, which
 * the SQL checks against the cupboard row itself. A retired entry the coven's cupboard does not
 * name, or an id that names nothing, gets a `NotFound` in its slot; a coven the
 * caller may not read the ingredients of, a `Forbidden`. One forms read per coven named,
 * whatever the batch size, and one cupboard read for each entry that comes back with no forms.
 */
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
      // A compendium ref needs no coven's proof, so none of these is a refusal.
      if (read instanceof Forbidden) return;
      // The SQL already answers only what the coven may read: a live entry's forms, or a retired
      // entry's while the cupboard names it. An empty answer is told apart here, so an entry the
      // cupboard does not name is a refusal and an entry that has no forms is not. Few asks
      // come back empty, so these reads are not a read per entry.
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

/**
 * The live jars `membership`'s coven holds of these forms, one read for the
 * lot: what the grimoire's save measures a step's unit against (M13.2). The
 * caller has checked the proof's permission; every role that writes a spell
 * also reads stock (src/modules/coven/services/access-control.ts).
 */
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
