import 'server-only';
import { cache } from 'react';
import { readCardCategoriesOf, readFormIcons } from '../../../../compendium-reads';
import type { SafetyVariant } from '../../../../../components/SafetyNote/types';
import { Forbidden, NotFound } from '../../../../../lib/errors';
import { readNumberedPage } from '../../../../../lib/numbered-page';
import { CARD_PAGE_SIZE } from '../../../../../lib/pagination';
import { requireSession } from '../../../../../lib/request-session';
import type { CovenIngredientPage } from './types';
import { entryValues } from '@/app/entry-values';
import { covenJarsOf } from '@/app/coven-stock';
import { covensHolding } from '@/app/plus-covens';
import type { CovenMembership } from '@/modules/coven';
import {
  applyCupboardEntry,
  countWorkspaceIngredients,
  getIngredient,
  heldCompendiumEntry,
  ingredientDetailOf,
  isRetired,
  lastEditsOf,
  listWorkspaceIngredients,
  stockOf,
  variantsOf,
  workspaceIngredientFacets,
} from '@/modules/ingredients';

// The Ingredients page's reads, twin of `compendium-reads.ts`: through the services as the signed-in
// session, none data-cached (rule 6). `cache` keys the page read by the coven's `Membership` last;
// `requireCovenMembership` is cached per slug, so a fresh object would only miss.

type Filter = Parameters<typeof listWorkspaceIngredients>[2];

/**
 * One page of `CARD_PAGE_SIZE` entries with its count and all a card draws, each one batch for the
 * page. Each edge keeps its `cupboardEntry` for the label and the Annotated and Retired marks.
 */
export const readCovenIngredients = cache(
  async (
    workspaceId: string,
    variables: string,
    after: string | undefined,
    before: string | undefined,
    // The coven's proof, handed to every child read as `heldBy`: a retired compendium entry the
    // coven's live cupboard row still names reads its forms and categories on it, the entry page's
    // rule. The page holds it; nothing here builds one.
    heldBy: CovenMembership['membership'],
  ): Promise<CovenIngredientPage> => {
    const session = await requireSession();
    // Written by the page from its parameter table, and checked again by the service.
    const filter: Filter = JSON.parse(variables);
    const page = await readNumberedPage(
      { after, before },
      (request) => listWorkspaceIngredients(session, workspaceId, filter, request),
      (start) => countWorkspaceIngredients(session, workspaceId, filter, start),
      CARD_PAGE_SIZE,
    );
    // Each ref names the entry's own tier (null for the compendium), as GraphQL's loaders do.
    const refs = page.edges.map(({ node }) => ({ id: node.id, workspaceId: node.workspaceId }));
    const [forms, categories, jars, lastEdits, formIcons] = await Promise.all([
      variantsOf(session, refs, heldBy),
      readCardCategoriesOf(session, refs, heldBy),
      stockOf(
        session,
        page.edges.map(({ node }) => ({ ingredientId: node.id, workspaceId })),
      ),
      // Who last touched each card, the names resolved in one batch for the page.
      lastEditsOf(
        session,
        workspaceId,
        page.edges.map(({ node }) => node),
      ),
      readFormIcons(),
    ]);
    return {
      ...page,
      variants: forms.map((answer) => {
        if (answer instanceof Error) throw answer;
        return answer.map(({ form, toxic, safetyNotes }): SafetyVariant => {
          const icon = formIcons.get(form.toLocaleLowerCase());
          return { form, toxic, safetyNotes, formChoice: icon ? { group: { icon } } : null };
        });
      }),
      variantIds: forms.map((answer) =>
        answer instanceof Error ? [] : answer.map(({ id }) => id),
      ),
      formOf: new Map(
        forms.flatMap((answer) =>
          answer instanceof Error ? [] : answer.map(({ id, form }): [string, string] => [id, form]),
        ),
      ),
      categories,
      jars: jars.map((answer) => {
        if (answer instanceof Error) throw answer;
        return answer;
      }),
      lastEdits,
    };
  },
);

/** How many entries each filter's choices would list, for the filter as the address holds it. */
export const readCovenFacets = cache(async (workspaceId: string, variables: string) => {
  const session = await requireSession();
  const filter: Filter = JSON.parse(variables);
  return workspaceIngredientFacets(session, workspaceId, filter);
});

/**
 * The coven's own entry `?edit=<id>` names, with its form values, read as the signed-in member.
 * Nothing for an unreachable id or a compendium entry; any other failure is let through.
 */
export async function readEditedEntry(workspaceId: string, id: string) {
  const session = await requireSession();
  let entry: Awaited<ReturnType<typeof getIngredient>>;
  try {
    entry = await getIngredient(session, id, workspaceId);
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return undefined;
    throw error;
  }
  if (entry.workspaceId !== workspaceId) return undefined;
  return { entry, values: await entryValues(entry, session) };
}

/**
 * The entry `?entry=<id>` opens details of, read as the signed-in member: the coven's own, or a
 * held compendium entry under the coven's label, retired included. Nothing for an unreachable id,
 * and other failures are let through. With it, `detail` and the coven's `jars` for Edit Stock.
 */
export async function readViewedEntry(membership: CovenMembership['membership'], id: string) {
  const session = await requireSession();
  let entry: Awaited<ReturnType<typeof getIngredient>>;
  try {
    entry = await getIngredient(session, id, membership.workspaceId);
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return undefined;
    throw error;
  }
  // A retired entry is read in the coven, whose cupboard entry is its proof.
  const detailOf = () =>
    ingredientDetailOf(session, entry, isRetired(entry) ? membership.workspaceId : undefined);
  const jarsOf = () => covenJarsOf(session, membership.workspaceId, id);
  // The same read the cards make, for the one entry.
  const lastEditOf = async () =>
    (await lastEditsOf(session, membership.workspaceId, [entry]))[0] ?? null;
  if (entry.workspaceId === membership.workspaceId) {
    const [detail, jars, lastEdit] = await Promise.all([detailOf(), jarsOf(), lastEditOf()]);
    return { shown: entry, own: true, detail, covens: [], jars, lastEdit };
  }
  const held = await heldCompendiumEntry(membership, id);
  if (!held) return undefined;
  // The viewer's covens that hold it, this one among them, for the details' links.
  const [read, covens, jars, lastEdit] = await Promise.all([
    detailOf(),
    covensHolding(id),
    jarsOf(),
    lastEditOf(),
  ]);
  return {
    shown: applyCupboardEntry(held.entry, held.cupboardEntry),
    own: false,
    detail: { ...read, cupboardEntry: read.cupboardEntry ?? held.cupboardEntry },
    covens,
    jars,
    lastEdit,
  };
}
