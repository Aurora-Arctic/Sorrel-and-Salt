import 'server-only';
import {
  type CupboardEntryRow,
  type IngredientRow,
  findCupboardEntriesOf,
  findCupboardEntry,
} from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
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
