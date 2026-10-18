import { and, eq, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
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
 * The compendium entry with this id, soft-deleted or not, beside the proof's
 * live cupboard entry naming it, or `undefined` when the proof's coven has no
 * such row. The sixth escape hatch (M12.24): a compendium entry the curators
 * retire stays readable to exactly the covens whose cupboard names it, and
 * reads as gone to every other reader (claude-docs/db/workspace-compendium-entries.md,
 * "When the compendium retires the entry"). It skips the entry's own filter
 * and no other: the cupboard row's tombstone filters, the proof scopes it, and
 * the entry must be the compendium's, so a row naming a coven's own
 * ingredient reads as none. One statement: the cupboard row is a left join
 * read as an inner one, which is what lets the entry's tombstone go unread.
 */
export async function findCupboardEntryIncludingSoftDeleted(
  membership: Membership,
  ingredientId: string,
): Promise<{ entry: IngredientRow; cupboardEntry: CupboardEntryRow } | undefined> {
  const [found] = await selectFrom(
    ingredients,
    and(
      eq(ingredients.id, ingredientId),
      inCompendium(ingredients),
      isNotNull(workspaceCompendiumEntries.id),
    ),
    {
      leftJoin: workspaceCompendiumEntries,
      on: and(
        eq(workspaceCompendiumEntries.ingredientId, ingredients.id),
        scopedTo(membership, workspaceCompendiumEntries),
        notSoftDeleted(workspaceCompendiumEntries),
      ) as SQL,
    },
  );
  return found?.joined ? { entry: found.row, cupboardEntry: found.joined } : undefined;
}

/**
 * The proof's rows that name a live compendium entry. `existsIn` ANDs the
 * entry's own tombstone filter, so the row of an entry the compendium has
 * deleted reads as no row here: `findCupboardEntryIncludingSoftDeleted` reads
 * it. The row's own tombstone
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
