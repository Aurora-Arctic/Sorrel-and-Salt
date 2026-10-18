import 'server-only';
import {
  type CupboardEntryRow,
  type IngredientRow,
  findCupboardEntriesOf,
  findCupboardEntry,
  findCupboardEntryByLabel,
  findOneIngredient,
  findStockOfIngredients,
  findWorkspaceIngredientByName,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { workspaceCompendiumEntries } from '../schema/workspace-compendium-entries';
import { CupboardEntryInput, type CupboardEntryValues } from '../validation/cupboard-entry';
import type { CupboardEntryKey } from '../types';
import { type Membership, assertMembership } from '@/modules/coven';

// A compendium entry in a coven's cupboard (M12.14): the coven's row naming
// it, read by anyone in the coven, and the merge that lays the row's seven
// overrides over the entry. Forms, folk names, substitutes, categories,
// references and `toxic` are never overridden, so they always read as the
// compendium has them (claude-docs/db/workspace-compendium-entries.md,
// "Reading it").

/**
 * `row` as a coven reads it through its cupboard entry: per column
 * `entry?.x ?? row.x`, the label standing over the name. A null override is
 * the compendium's value and a set one the coven's; an empty list is a set
 * one, cleared on purpose, which is why this is `??` and never `||`. No entry
 * answers `row` as it is. The id and the tier stay the compendium's.
 */
export function applyCupboardEntry(
  row: IngredientRow,
  entry: CupboardEntryRow | null | undefined,
): IngredientRow {
  if (!entry) return row;
  return {
    ...row,
    name: entry.label ?? row.name,
    description: entry.description ?? row.description,
    safetyNotes: entry.safetyNotes ?? row.safetyNotes,
    elements: entry.elements ?? row.elements,
    celestialBodies: entry.celestialBodies ?? row.celestialBodies,
    zodiacSigns: entry.zodiacSigns ?? row.zodiacSigns,
    colors: entry.colors ?? row.colors,
  };
}

/**
 * The coven's live cupboard entry for this compendium entry, or null: none
 * for an entry it does not hold, an id that is not one, or a coven's own
 * ingredient, which has no cupboard entry. Any member, viewers included.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 */
export async function getCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<CupboardEntryRow | null> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(ingredientId).success) return null;
  return (await findCupboardEntry(membership, ingredientId)) ?? null;
}

/**
 * Each key's cupboard entry in the coven it names, or null, one answer per
 * key in the order given: `Ingredient.cupboardEntry`'s batch. One read per
 * coven named, whatever the batch size, plus a role lookup each. A key naming
 * a coven the caller may not read gets a `Forbidden` in its slot while the
 * rest of the batch stands, as `stockOf` answers.
 */
export async function cupboardEntriesOf(
  session: Session,
  keys: readonly CupboardEntryKey[],
): Promise<(CupboardEntryRow | null | Forbidden)[]> {
  const covens = [...new Set(keys.map((key) => key.workspaceId))];
  const rows = new Map(
    await Promise.all(
      covens.map(async (workspaceId) => {
        const ids = [
          ...new Set(
            keys.filter((key) => key.workspaceId === workspaceId).map((key) => key.ingredientId),
          ),
        ];
        return [workspaceId, await entriesOf(session, workspaceId, ids)] as const;
      }),
    ),
  );
  return keys.map((key) => {
    const held = rows.get(key.workspaceId);
    if (held instanceof Forbidden) return held;
    return held?.find((row) => row.ingredientId === key.ingredientId) ?? null;
  });
}

/** One coven's live cupboard entries for these ingredients, or the refusal its proof threw. */
async function entriesOf(
  session: Session,
  workspaceId: string,
  ingredientIds: string[],
): Promise<CupboardEntryRow[] | Forbidden> {
  let membership: Membership;
  try {
    membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  } catch (error) {
    if (error instanceof Forbidden) return error;
    throw error;
  }
  return findCupboardEntriesOf(membership, ingredientIds);
}

// The three writes (M12.15). Each opens with the coven's own check and writes
// through `withAudit`. A cupboard entry never creates or removes a jar or a
// form; the one write that adds a row without these is `createStock`, which
// inserts the entry beside a first jar (claude-docs/db/workspace-compendium-entries.md,
// "Writing it").

const NO_ENTRY = 'No such compendium entry';
const NO_ROW = 'This coven does not hold that compendium entry';
const HELD = 'Your coven already holds this entry';
const ENTRY_INDEX = 'workspace_compendium_entries_workspace_ingredient_unique';
const LABEL_INDEX = 'workspace_compendium_entries_workspace_label_unique';

/** The seven overrides the input sets, leaving out the keys it does not mention. */
function setColumns(input: CupboardEntryInput): Partial<CupboardEntryInput> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<CupboardEntryInput>;
}

/**
 * Refuses a label the coven already uses: one of its own ingredients' names,
 * or another cupboard entry's label (`exceptId` is the entry being written,
 * which may keep its own). Compared case folded, as both unique indexes are.
 * The two tables cannot share one index, so this read before the write is the
 * check, and a race between a cupboard save and an own-ingredient save can
 * slip past it, as `refuseEndingARedirect` in `services/compendium.ts`
 * accepts its own; the cupboard's index still catches two cupboard saves.
 */
async function refuseLabelTaken(
  membership: Membership,
  label: string | null | undefined,
  exceptId?: string,
): Promise<void> {
  if (label == null) return;
  const own = await findWorkspaceIngredientByName(membership, label);
  if (own) {
    throw new ValidationError([
      { path: ['label'], message: `This coven already has an ingredient called "${label}"` },
    ]);
  }
  const other = await findCupboardEntryByLabel(membership, label);
  if (other && other.id !== exceptId) {
    throw new ValidationError([
      { path: ['label'], message: `This coven already calls another entry "${label}"` },
    ]);
  }
}

/**
 * The own-ingredient side of the same rule: refuses a name that a cupboard
 * entry of this coven carries as its label. A cupboard entry with no label
 * reserves nothing.
 *
 * @throws {ValidationError} on `name`.
 */
export async function refuseCupboardLabelAsName(
  membership: Membership,
  name: string,
): Promise<void> {
  if (await findCupboardEntryByLabel(membership, name)) {
    throw new ValidationError([
      { path: ['name'], message: `This coven already calls a compendium entry "${name}"` },
    ]);
  }
}

/** A write that broke one of the table's unique indexes, as a `ValidationError`; any other error unchanged. */
function refuseRace(error: unknown): never {
  switch (violatedUniqueIndex(error)) {
    case ENTRY_INDEX:
      throw new ValidationError([{ path: ['ingredientId'], message: HELD }]);
    case LABEL_INDEX:
      throw new ValidationError([
        { path: ['label'], message: 'This coven already uses that label for another entry' },
      ]);
  }
  throw error;
}

/**
 * Adds a compendium entry to this coven's cupboard: one row naming it, with
 * whatever overrides `input` carries and none by default. It creates no jar
 * and no form.
 *
 * @throws {Forbidden} the caller may not create this coven's ingredients.
 * @throws {NotFound} no live compendium entry has this id: a coven's own
 * ingredient, a deleted entry and an id that is not one included.
 * @throws {ValidationError} the coven already holds the entry, beside
 * `ingredientId`; the input breaks `CupboardEntryInput`; or the label is
 * already used in this coven, beside `label`.
 */
export async function addCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
  input: CupboardEntryValues = {},
): Promise<CupboardEntryRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['create'] });
  const parsed = parseInput(CupboardEntryInput, input);
  if (!RowId.safeParse(ingredientId).success) throw new NotFound(NO_ENTRY);
  // No proofs reads the compendium alone, so a coven's own row is never found.
  const entry = await findOneIngredient([], ingredientId);
  if (!entry) throw new NotFound(NO_ENTRY);
  if (await findCupboardEntry(membership, ingredientId)) {
    throw new ValidationError([{ path: ['ingredientId'], message: HELD }]);
  }
  await refuseLabelTaken(membership, parsed.label);

  try {
    const [row] = await withAudit(session, (write) =>
      write.insertInWorkspace(membership, workspaceCompendiumEntries, {
        ingredientId,
        ...setColumns(parsed),
      }),
    );
    return row;
  } catch (error) {
    return refuseRace(error);
  }
}

/**
 * Changes this coven's overrides of a compendium entry it holds. A key the
 * patch leaves out keeps its value, `null` hands the column back to the
 * compendium's, and a value, a list even when empty, is the coven's own.
 *
 * @throws {Forbidden} the caller may not update this coven's ingredients.
 * @throws {NotFound} this coven holds no live cupboard entry for this id.
 * @throws {ValidationError} the patch breaks `CupboardEntryInput`, or the
 * label is already used in this coven, beside `label`.
 */
export async function annotateCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
  patch: CupboardEntryValues,
): Promise<CupboardEntryRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['update'] });
  const parsed = parseInput(CupboardEntryInput, patch);
  const row = await readHeld(membership, ingredientId);
  await refuseLabelTaken(membership, parsed.label, row.id);

  const values = setColumns(parsed);
  if (Object.keys(values).length === 0) return row;
  try {
    const [updated] = await withAudit(session, (write) =>
      write.updateByIdInWorkspace(membership, workspaceCompendiumEntries, row.id, values),
    );
    if (!updated) throw new NotFound(NO_ROW);
    return updated;
  } catch (error) {
    return refuseRace(error);
  }
}

/**
 * Takes a compendium entry out of this coven's cupboard, stamping who removed
 * it. Refused while the coven holds a jar of any of its forms, so no stock is
 * left that nothing lists. Its spell layers are untouched.
 *
 * @throws {Forbidden} the caller may not delete this coven's ingredients.
 * @throws {NotFound} this coven holds no live cupboard entry for this id.
 * @throws {ValidationError} the coven holds jars of it, beside `ingredientId`.
 */
export async function removeCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['delete'] });
  await withAudit(session, async (write) => {
    // A first jar is created under this lock, so the count below is not
    // stale by the time the row goes.
    await write.lockCovenStock(membership);
    const row = await readHeld(membership, ingredientId);
    const jars = await findStockOfIngredients(membership, [ingredientId]);
    if (jars.length > 0) {
      throw new ValidationError([
        {
          path: ['ingredientId'],
          message: `This coven holds ${jars.length} ${jars.length === 1 ? 'jar' : 'jars'} of this entry — empty its jars first`,
        },
      ]);
    }
    const [removed] = await write.softDeleteByIdInWorkspace(
      membership,
      workspaceCompendiumEntries,
      row.id,
    );
    if (!removed) throw new NotFound(NO_ROW);
  });
}

/** This coven's live cupboard entry for the id. */
async function readHeld(membership: Membership, ingredientId: string): Promise<CupboardEntryRow> {
  if (!RowId.safeParse(ingredientId).success) throw new NotFound(NO_ROW);
  const row = await findCupboardEntry(membership, ingredientId);
  if (!row) throw new NotFound(NO_ROW);
  return row;
}
