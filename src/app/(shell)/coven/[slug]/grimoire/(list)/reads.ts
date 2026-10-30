import 'server-only';
import type { Route } from 'next';
import { cache } from 'react';
import { readCategories } from '@/app/compendium-reads';
import type { GrimoireSpell } from '@/components/GrimoireList/types';
import type { CardCategory } from '@/components/IngredientCard/types';
import type { WorkingStep } from '@/components/RecordWorking/types';
import { Forbidden, NotFound } from '@/lib/errors';
import { readNumberedPage } from '@/lib/numbered-page';
import { CARD_PAGE_SIZE } from '@/lib/pagination';
import { requireSession } from '@/lib/request-session';
import {
  assignedCategoriesOf,
  countGrimoire,
  countGrimoireCategories,
  countGrimoireFacets,
  listGrimoire,
  readSpell,
  stepsOfSpells,
  workingCountsOf,
} from '@/modules/grimoire';
import type { SpellStatus } from '@/modules/grimoire';
import { memberRoster } from '@/modules/coven';
import { displayNamesOf } from '@/modules/identity';
import { readRecipeOf } from '../recipe-read';
import { workingStepsOf } from '../[id]/recipe-steps';
import { readStepSuppliesOf } from '../[id]/recipe-supply';
import type { SpellDialogSpell } from '@/components/SpellBuilder/types';

// The grimoire tab's read, twin of the Ingredients page's `reads.ts`. Read through the services as
// the signed-in session, which assert membership and keep a private spell its author's; nothing is
// data-cached (rule 6). `cache` is keyed by primitives, the filter as JSON.

type Query = Parameters<typeof listGrimoire>[3];

/**
 * One page of `CARD_PAGE_SIZE` spells of one status with its count, each with its assigned
 * categories and last editor: one batch each. Newest edit first, or best match while searching.
 */
export const readGrimoire = cache(
  async (
    workspaceId: string,
    variables: string,
    status: SpellStatus,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const session = await requireSession();
    // Written by the page from its parameter table, and checked again by the service.
    const query: Query = { order: 'UPDATED_DESC', ...JSON.parse(variables), status };
    const page = await readNumberedPage(
      { after, before },
      (request) => listGrimoire(session, workspaceId, request, query),
      (start) => countGrimoire(session, workspaceId, query, start),
      CARD_PAGE_SIZE,
    );
    const [answers, known, editors, made] = await Promise.all([
      assignedCategoriesOf(
        session,
        page.edges.map(({ node }) => ({ id: node.id, workspaceId: node.workspaceId })),
      ),
      readCategories(),
      // A server component reads through the service, not GraphQL's user loader, so the
      // page's editors are one `displayNamesOf` call; null for one the viewer cannot name.
      displayNamesOf(
        session,
        page.edges.map(({ node }) => node.updatedBy),
      ),
      // How often each was made: the count loader's one query for the page.
      workingCountsOf(
        session,
        page.edges.map(({ node }) => ({ id: node.id, workspaceId: node.workspaceId })),
      ),
    ]);
    const byId = new Map(known.map((category) => [category.id, category]));
    const spells = page.edges.map(({ node }, i): GrimoireSpell => {
      const answer = answers[i];
      if (answer instanceof Error) throw answer;
      const count = made[i];
      if (count instanceof Error) throw count;
      return {
        id: node.id,
        title: node.title,
        intent: node.intent,
        status: node.status,
        visibility: node.visibility,
        categories: answer.flatMap(({ id }): CardCategory[] => {
          const category = byId.get(id);
          return category ? [{ category: { id, name: category.name }, group: category.group }] : [];
        }),
        lastEdit: { by: editors[i] ?? null, at: node.updatedAt.toISOString() },
        workingCount: count,
      };
    });
    return { ...page, spells };
  },
);

/**
 * The spell `?edit=<id>` opens the builder on, read as the signed-in member, with its fields and
 * assigned categories; its steps the dialog reads through /api/graphql. Nothing for a spell the
 * service withholds (another member's private one included); other failures are let through.
 */
export async function readEditedSpell(
  workspaceId: string,
  id: string,
): Promise<SpellDialogSpell | undefined> {
  const session = await requireSession();
  try {
    const spell = await readSpell(session, workspaceId, id);
    const { revision, title, intent, jarDescription, sealWaxColor, moonPhase, dayOfWeek, note } =
      spell;
    const { visibility, status } = spell;
    // The categories its author assigned it, so the builder opens with them picked and a save sends
    // the set as edited, not as if it had none.
    const [assigned] = await assignedCategoriesOf(session, [{ id, workspaceId }]);
    if (assigned instanceof Error) throw assigned;
    return {
      id,
      revision,
      updatedAt: spell.updatedAt.toISOString(),
      title,
      intent,
      jarDescription,
      sealWaxColor,
      moonPhase,
      dayOfWeek,
      note,
      visibility,
      status,
      categoryIds: assigned.map((category) => category.id),
    };
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return undefined;
    throw error;
  }
}

/**
 * How many spells of one status each category holds under the filter, by category id: one grouped
 * read, a private spell counted for its author alone. An absent category holds none here.
 */
export const readGrimoireCategoryCounts = cache(
  async (workspaceId: string, variables: string, status: SpellStatus) => {
    const session = await requireSession();
    const query: Query = { order: 'UPDATED_DESC', ...JSON.parse(variables), status };
    const counts = await countGrimoireCategories(session, workspaceId, query);
    return new Map(counts.map(({ value, count }) => [value, count]));
  },
);

/**
 * How many spells each Moon Phase, Day of Week, Visibility and Coven Member holds under the
 * filter: one grouped read each, dropping its own picks so another can be added. Makers are named
 * in one `displayNamesOf` batch; one the viewer cannot name is left out.
 */
export const readGrimoireFacetCounts = cache(
  async (workspaceId: string, variables: string, status: SpellStatus) => {
    const session = await requireSession();
    const query: Query = { order: 'UPDATED_DESC', ...JSON.parse(variables), status };
    const counts = await countGrimoireFacets(session, workspaceId, query);
    // A maker picked but holding no spell under the other facets is not in the counts; the
    // chip still needs the name, so the picks are named in the same batch and offered at 0.
    const picked: string[] = query.makerIds ? [...query.makerIds] : [];
    const counted = new Map(counts.makers.map(({ value, count }) => [value, count]));
    const makers = [
      ...counts.makers.map(({ value }) => value),
      ...picked.filter((id) => !counted.has(id)),
    ];
    const names = await displayNamesOf(session, makers);
    return {
      moonPhases: counts.moonPhases,
      daysOfWeek: counts.daysOfWeek,
      visibilities: counts.visibilities,
      makers: makers.flatMap((value, i) => {
        // One the viewer cannot name is offered only when picked, so its chip can be removed.
        const label = names[i] ?? (picked.includes(value) ? 'Unknown Member' : undefined);
        return label ? [{ value, label, count: counted.get(value) ?? 0 }] : [];
      }),
    };
  },
);

/**
 * The spell `?spell=<id>` opens Quick Look on, read as the signed-in member. `undefined` for a
 * spell the service withholds; any other failure is `failed`, which the modal says in a Notice.
 */
/** The spell `?spell=<id>` opens at `lookHref`, the tab's address with it, and its recipe drawn there. */
export async function readLookedSpell(workspaceId: string, lookHref: Route, id: string) {
  const session = await requireSession();
  try {
    const spell = await readSpell(session, workspaceId, id);
    const recipe = await readRecipeOf(session, spell, lookHref);
    // The modal has no side column, so each ingredient step carries its stock verdict itself.
    const supplies = await readStepSuppliesOf(session, workspaceId, recipe.views);
    const steps = recipe.steps.map((step) =>
      step.kind === 'ingredient' ? { ...step, supply: supplies.get(step.id) ?? null } : step,
    );
    return { spell, recipe: { ...recipe, steps } };
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return undefined;
    return { failed: true as const };
  }
}

/**
 * What each complete spell's Record a Working button needs beyond the card: the coven's members
 * (read once, and only on the permission `memberRoster` asserts, which a viewer lacks) and each
 * spell's ingredient steps, one batch for the page. Keyed by spell id; empty for a role that may
 * not record a working. Per request, never cached (rule 6).
 */
export async function readRecordingOf(
  workspace: Parameters<typeof memberRoster>[1],
  spells: readonly { id: string; status: SpellStatus }[],
  canRecord: boolean,
): Promise<{
  members: { userId: string; name: string }[];
  stepsById: Map<string, WorkingStep[]>;
}> {
  const complete = spells.filter(({ status }) => status === 'complete');
  if (!canRecord || complete.length === 0) return { members: [], stepsById: new Map() };
  const session = await requireSession();
  const [roster, views] = await Promise.all([
    memberRoster(session, workspace),
    stepsOfSpells(
      session,
      complete.map(({ id }) => ({ id, workspaceId: workspace.id })),
    ),
  ]);
  const names = await displayNamesOf(
    session,
    roster.map(({ userId }) => userId),
  );
  const stepsById = new Map(
    complete.map(({ id }, i) => {
      const view = views[i];
      // No stock door: a card's jars are drawings, Edit Stock is the recipe page's.
      return [
        id,
        view instanceof Error || !view ? [] : workingStepsOf(view, '/' as Route),
      ] as const;
    }),
  );
  return {
    members: roster.map(({ userId }, i) => ({ userId, name: names[i] ?? 'A former member' })),
    stepsById,
  };
}
