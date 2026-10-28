import 'server-only';
import {
  type FacetCount,
  findGrimoireCategoryCounts,
  findGrimoireCount,
  findGrimoirePage,
  findManyByIds,
  findManyInSpells,
  findManyOfSpellIngredientsIncludingSoftDeleted,
  findOneSpell,
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
import { MIN_QUERY_LENGTH } from '@/modules/ingredients/validation/compendium-filter';
import { categories } from '@/modules/vocabulary/schema/categories';
import { assertMembership, type Membership } from '@/modules/coven';
import type { CategoryRow } from '@/modules/vocabulary';
import type { SpellKey, SpellRow, SpellStepView } from '../types';

// The grimoire's reads (M10.9): the paged list and its count (M10.11), one spell, and
// the batches a spell's fields load through. Every read is a reader's of the
// coven, `spell: ['read']`, and every row comes through the finders that keep
// a private spell its author's (claude-docs/db/spell-visibility.md), so a
// spell this reader may not see is `NotFound` by id and absent from a batch.

/**
 * The query with a search shorter than `MIN_QUERY_LENGTH` dropped, counted in
 * composed code points as the compendium counts it: one character matches
 * nearly every spell, so it is no search at all.
 */
function searchable(query: GrimoireQuery): GrimoireQuery {
  const text = query.query?.trim();
  const long = text !== undefined && Array.from(text.normalize('NFC')).length >= MIN_QUERY_LENGTH;
  return { ...query, query: long ? text : undefined };
}

/**
 * One page of the coven's grimoire in `order`: its shared spells and the
 * caller's own private ones, narrowed by the query's status, search and
 * categories.
 *
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
 * How many spells `listGrimoire` lists under `query`, and how many of them
 * come before `start`: the count the numbered pager reads (M10.11). A private
 * spell counts for its author alone, as it lists.
 *
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
 * How many spells `listGrimoire` would list in each category under the rest
 * of `query`: the Categories filter's counts (M10.11), each a category's id
 * and its count, a category no readable spell carries absent. A private
 * spell counts for its author alone, as it lists.
 *
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
 * One spell, without its steps, which `Spell.steps` loads.
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

/**
 * Each spell's live steps in recipe order, with the ingredient and form each
 * links (see `stepsInSpells`): `Spell.steps`' batch. Four reads per coven
 * named, whatever the batch size, plus a role lookup each.
 */
export function stepsOfSpells(
  session: Session,
  refs: readonly SpellKey[],
): Promise<(SpellStepView[] | Forbidden)[]> {
  return perCoven(session, refs, stepsInSpells);
}

/**
 * The categories each spell's author assigned it, what it intends, sorted by
 * name: `Spell.categories`' batch. Two reads per coven named. A category
 * deleted since drops out.
 */
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

/**
 * The categories each spell is made of, sorted by name:
 * `Spell.derivedCategories`' batch (DESIGN.md §5, "Two kinds of spell
 * category"). A linked step contributes its ingredient's own pairs and the
 * pairs of the form it lays, never another form's (MB.215); a one-off row and
 * an instruction contribute none. An ingredient deleted since still
 * contributes, read through the finder that keeps it. Four reads per coven
 * named, whatever the batch size.
 */
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

/**
 * Answers a batch one coven at a time, as `stockOf` does: each coven named is
 * checked once, its spells read together, and a ref naming a coven the caller
 * may not read gets a `Forbidden` in its slot while the rest of the batch
 * stands. A spell the caller may not read, or one not in the coven its ref
 * names, answers whatever `read` answers for a spell with no rows.
 */
async function perCoven<T>(
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
        try {
          const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
          return [workspaceId, await read(membership, spellIds)] as [
            string,
            (spellId: string) => T,
          ];
        } catch (error) {
          if (error instanceof Forbidden) return [workspaceId, error] as [string, Forbidden];
          throw error;
        }
      }),
    ),
  );
  return refs.map((ref) => {
    const answer = answers.get(ref.workspaceId)!;
    return answer instanceof Forbidden ? answer : answer(ref.id);
  });
}

/** Reads the live categories among `ids` once, and names any subset of them sorted by name. */
async function categoriesById(
  ids: readonly string[],
): Promise<(ids: readonly string[]) => CategoryRow[]> {
  const rows = await findManyByIds(categories, [...new Set(ids)]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return (wanted) =>
    [...new Set(wanted)]
      // A soft-deleted category is absent from `byId`, so its link names nothing.
      .flatMap((id) => byId.get(id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name));
}
