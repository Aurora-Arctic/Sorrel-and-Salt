import 'server-only';
import {
  type FacetCount,
  findGrimoireCategoryCounts,
  findGrimoireCount,
  findGrimoireFacetCounts,
  findGrimoirePage,
  findManyByIds,
  findManyInSpells,
  findManyOfSpellIngredientsIncludingSoftDeleted,
  findOneSpell,
  type GrimoireFacetCounts,
  type GrimoireQuery,
} from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { summarizeSpellCategories } from '../validation/categories/summarize';
import { spellCategories } from '../schema/spell-categories';
import { spellSteps } from '../schema/spell-steps';
import { stepsInSpells } from './step-views';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { MIN_QUERY_LENGTH } from '@/modules/ingredients/validation/query-length';
import { categories } from '@/modules/vocabulary/schema/categories';
import { assertMembership, tryMembership, type Membership } from '@/modules/coven';
import type { CategoryRow } from '@/modules/vocabulary';
import type { SpellKey, SpellRow, SpellStepView } from '../types';

// A spell the reader may not see is `NotFound` by id and absent from a batch (claude-docs/db/grimoire.md, "Grimoire read details").

/** As the compendium counts it: one character is no search. */
function searchable(query: GrimoireQuery): GrimoireQuery {
  const text = query.query?.trim();
  const long = text !== undefined && Array.from(text.normalize('NFC')).length >= MIN_QUERY_LENGTH;
  return { ...query, query: long ? text : undefined };
}

/**
 * @throws {Forbidden} the caller is not a member of this coven.
 */
export async function listGrimoire(
  session: Session,
  workspaceId: string,
  page: PageRequest,
  query: GrimoireQuery,
): Promise<PageEntry<SpellRow>[]> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  return findGrimoirePage(membership, page, searchable(query));
}

/**
 * @throws {Forbidden} the caller is not a member of this coven.
 */
export async function countGrimoire(
  session: Session,
  workspaceId: string,
  query: GrimoireQuery,
  start: Cursor | undefined,
): Promise<PageCount> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  return findGrimoireCount(membership, searchable(query), start);
}

/**
 * @throws {Forbidden} the caller is not a member of this coven.
 */
export async function countGrimoireCategories(
  session: Session,
  workspaceId: string,
  query: GrimoireQuery,
): Promise<FacetCount[]> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  return findGrimoireCategoryCounts(membership, searchable(query));
}

/**
 * Also the facets' choices (claude-docs/db/grimoire.md, "Grimoire read details").
 *
 * @throws {Forbidden} the caller is not a member of this coven.
 */
export async function countGrimoireFacets(
  session: Session,
  workspaceId: string,
  query: GrimoireQuery,
): Promise<GrimoireFacetCounts> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  return findGrimoireFacetCounts(membership, searchable(query));
}

/**
 * Without its steps, which `Spell.steps` loads.
 *
 * @throws {Forbidden} the caller is not a member of this coven.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function readSpell(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<SpellRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  const spell = await findOneSpell(membership, spellId);
  if (!spell) throw new NotFound('No such spell in this coven');
  return spell;
}

export function stepsOfSpells(
  session: Session,
  refs: readonly SpellKey[],
): Promise<(SpellStepView[] | Forbidden)[]> {
  return perCoven(session, refs, stepsInSpells);
}

export function assignedCategoriesOf(
  session: Session,
  refs: readonly SpellKey[],
): Promise<(CategoryRow[] | Forbidden)[]> {
  return perCoven(session, refs, async (membership, spellIds) => {
    const links = await findManyInSpells(membership, spellCategories, spellIds);
    const named = await categoriesById(links.map((link) => link.categoryId));
    return (spellId) =>
      named(links.filter((link) => link.spellId === spellId).map((link) => link.categoryId));
  });
}

/** DESIGN.md §5, "Two kinds of spell category". */
export function derivedCategoriesOf(
  session: Session,
  refs: readonly SpellKey[],
): Promise<(CategoryRow[] | Forbidden)[]> {
  return perCoven(session, refs, async (membership, spellIds) => {
    const steps = await findManyInSpells(membership, spellSteps, spellIds);
    const linked = [
      ...new Set(steps.flatMap((step) => (step.ingredientId === null ? [] : [step.ingredientId]))),
    ];
    const pairs = await findManyOfSpellIngredientsIncludingSoftDeleted(
      membership,
      ingredientCategories,
      linked,
    );
    const named = await categoriesById(pairs.map((pair) => pair.categoryId));

    return (spellId) =>
      named(
        summarizeSpellCategories(
          steps
            .filter((step) => step.spellId === spellId)
            .map((step) => ({
              ingredientId: step.ingredientId,
              categoryIds: pairs
                .filter(
                  (pair) =>
                    pair.ingredientId === step.ingredientId &&
                    (pair.variantId === null || pair.variantId === step.variantId),
                )
                .map((pair) => pair.categoryId),
            })),
        ),
      );
  });
}

/** A coven the caller may not read gets a `Forbidden` in its slot. */
export async function perCoven<T>(
  session: Session,
  refs: readonly SpellKey[],
  read: (membership: Membership, spellIds: string[]) => Promise<(spellId: string) => T>,
): Promise<(T | Forbidden)[]> {
  const covens = [...new Set(refs.map((ref) => ref.workspaceId))];
  const answers = new Map<string, ((spellId: string) => T) | Forbidden>(
    await Promise.all(
      covens.map(async (workspaceId) => {
        const spellIds = [
          ...new Set(refs.filter((ref) => ref.workspaceId === workspaceId).map((ref) => ref.id)),
        ];
        const membership = await tryMembership(session, workspaceId, { spell: ['read'] });
        if (membership instanceof Forbidden)
          return [workspaceId, membership] as [string, Forbidden];
        return [workspaceId, await read(membership, spellIds)] as [string, (spellId: string) => T];
      }),
    ),
  );
  return refs.map((ref) => {
    const answer = answers.get(ref.workspaceId)!;
    return answer instanceof Forbidden ? answer : answer(ref.id);
  });
}

async function categoriesById(
  ids: readonly string[],
): Promise<(ids: readonly string[]) => CategoryRow[]> {
  const rows = await findManyByIds(categories, [...new Set(ids)]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return (wanted) =>
    [...new Set(wanted)]
      .flatMap((id) => byId.get(id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name));
}
