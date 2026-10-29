import { and, eq, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import { workspaces } from '../../modules/coven/schema/workspaces';
import type { Membership } from '@/modules/coven';
import type { Curator } from '@/modules/identity';
import { inCompendium, notSoftDeleted, scopedTo } from './predicates';
import { findPageInTiers } from './finders';
import { existsIn, selectFrom, selectOne } from './select';
import type { PageEntry, PageRequest } from '../../lib/types';
import type { CupboardEntryRow, IngredientRow } from './types';

// The reads over a coven's cupboard entries: the rows of
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
 * The compendium entry with this id, retired or not, beside the proof's live cupboard
 * entry naming it. A retired entry stays readable to exactly the covens whose cupboard
 * names it (claude-docs/db/workspace-compendium-entries.md); it skips only the entry's filter. (claude-docs/db/write-path.md, "Repository comments in full")
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
 * names. Unscoped, since the compendium is public. Exact
 * rather than fuzzy: a near spelling is `findSimilarIngredients`'.
 */
export function findCompendiumMatchesByName(name: string): Promise<IngredientRow[]> {
  return selectFrom(ingredients, and(compendiumNamed(name), notSoftDeleted(ingredients)));
}

/**
 * One page of the same exact matches, by name and then id: the Add flow's
 * question, which the schema serves as a connection like any list.
 * Never more rows than the entries one typed name can equal.
 */
export function findCompendiumMatchPage(
  name: string,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, object>[]> {
  return findPageInTiers(
    [],
    ingredients,
    [ingredients.name],
    page,
    and(compendiumNamed(name), notSoftDeleted(ingredients)),
  );
}

/** A compendium entry whose label or formal name is `name`, exactly but for case; the finders add the soft-delete filter. */
function compendiumNamed(name: string): SQL | undefined {
  // `lower` has no builder.
  const folded = sql`lower(${name})`;
  return and(
    inCompendium(ingredients),
    or(
      eq(sql`lower(${ingredients.name})`, folded),
      eq(sql`lower(${ingredients.canonicalName})`, folded),
    ),
  );
}

/**
 * The proof's live cupboard entry labelled `label`, case folded, or
 * `undefined`: the row a label the coven is about to take would collide with.
 * It does not join the compendium entry: the label index does not,
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
 * covers for own rows alone.
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

/**
 * How many covens hold this compendium entry in their cupboard: the distinct
 * live covens with a live cupboard row naming it. Unscoped, so it
 * takes a curator's proof rather than a coven's, and it answers a number and
 * never a coven's name or id: the curator's delete confirm shows how many the
 * deletion touches, not who. Zero for an id that is not a live compendium
 * entry, which the service has told apart already.
 */
export async function countCovensUsing(_curator: Curator, ingredientId: string): Promise<number> {
  const [row] = await selectFrom(
    workspaceCompendiumEntries,
    and(
      notSoftDeleted(workspaceCompendiumEntries),
      eq(workspaceCompendiumEntries.ingredientId, ingredientId),
      existsIn(workspaces, eq(workspaces.id, workspaceCompendiumEntries.workspaceId)),
      existsIn(
        ingredients,
        and(eq(ingredients.id, workspaceCompendiumEntries.ingredientId), inCompendium(ingredients)),
      ),
    ),
    {
      aggregate: {
        count: sql<number>`count(distinct ${workspaceCompendiumEntries.workspaceId})::int`,
      },
      // No search, so no join or threshold to read under.
      over: {},
    },
  );
  return row.count;
}
