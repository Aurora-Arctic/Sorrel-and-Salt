import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import type { Membership } from '@/modules/coven';
import { inCompendium, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type { CupboardEntryRow, IngredientRow } from './types';

// The reads over a coven's cupboard entries (M12.14): the rows of
// `workspace_compendium_entries`, each naming one compendium entry the coven
// holds, with its own overrides. That the entry is the compendium's is a read
// filter here rather than a constraint, so every read joins `ingredients`
// under `workspace_id IS NULL`: a row naming a coven's own ingredient is never
// returned (claude-docs/db/workspace-compendium-entries.md, "Reading it").

/** The proof's live cupboard entry for this compendium entry, or `undefined`. */
export function findCupboardEntry(
  membership: Membership,
  ingredientId: string,
): Promise<CupboardEntryRow | undefined> {
  return selectOne(
    workspaceCompendiumEntries,
    and(
      inCupboard(membership),
      notSoftDeleted(workspaceCompendiumEntries),
      eq(workspaceCompendiumEntries.ingredientId, ingredientId),
    ),
  );
}

/**
 * The proof's live cupboard entries for these compendium entries, at most one
 * each, in no particular order: `Ingredient.cupboardEntry`'s batch.
 */
export function findCupboardEntriesOf(
  membership: Membership,
  ingredientIds: readonly string[],
): Promise<CupboardEntryRow[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    workspaceCompendiumEntries,
    and(
      inCupboard(membership),
      notSoftDeleted(workspaceCompendiumEntries),
      inArray(workspaceCompendiumEntries.ingredientId, [...ingredientIds]),
    ),
  );
}

/**
 * The proof's rows that name a live compendium entry. `existsIn` ANDs the
 * entry's own tombstone filter, so the row of an entry the compendium has
 * deleted reads as no row until M12.24's hatch. The row's own tombstone
 * filter stays in each finder, where the soft-delete guard reads it.
 */
function inCupboard(membership: Membership): SQL | undefined {
  return and(
    scopedTo(membership, workspaceCompendiumEntries),
    existsIn(
      ingredients,
      and(eq(ingredients.id, workspaceCompendiumEntries.ingredientId), inCompendium(ingredients)),
    ),
  );
}

/**
 * The live compendium entries whose label or formal name is `name`, exactly
 * but for case, in no particular order: the entries a coven's typed name already
 * names (M12.20, M12.22). Unscoped, since the compendium is public. Exact
 * rather than fuzzy: a near spelling is `findSimilarIngredients`'.
 */
export function findCompendiumMatchesByName(name: string): Promise<IngredientRow[]> {
  // `lower` has no builder.
  const folded = sql`lower(${name})`;
  return selectFrom(
    ingredients,
    and(
      inCompendium(ingredients),
      notSoftDeleted(ingredients),
      or(
        eq(sql`lower(${ingredients.name})`, folded),
        eq(sql`lower(${ingredients.canonicalName})`, folded),
      ),
    ),
  );
}

/**
 * The proof's live cupboard entry labelled `label`, case folded, or
 * `undefined`: the row a label the coven is about to take would collide with
 * (M12.15). It does not join the compendium entry: the label index does not,
 * so a row naming an entry the compendium has since deleted still holds its
 * label.
 */
export function findCupboardEntryByLabel(
  membership: Membership,
  label: string,
): Promise<CupboardEntryRow | undefined> {
  return selectOne(
    workspaceCompendiumEntries,
    and(
      scopedTo(membership, workspaceCompendiumEntries),
      notSoftDeleted(workspaceCompendiumEntries),
      // `lower` has no builder.
      eq(sql`lower(${workspaceCompendiumEntries.label})`, sql`lower(${label})`),
    ),
  );
}

/**
 * The proof's live own ingredient named `name`, case folded, or `undefined`:
 * the other side of the label rule, which `ingredients_workspace_label_unique`
 * covers for own rows alone (M12.15).
 */
export function findWorkspaceIngredientByName(
  membership: Membership,
  name: string,
): Promise<IngredientRow | undefined> {
  return selectOne(
    ingredients,
    and(
      scopedTo(membership, ingredients),
      notSoftDeleted(ingredients),
      eq(sql`lower(${ingredients.name})`, sql`lower(${name})`),
    ),
  );
}
