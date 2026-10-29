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

// The reads the coven's Ingredients page makes, twin of `compendium-reads.ts`. The data is the
// coven's, so each read goes through the services for the signed-in session, which asserts
// membership, and none is data-cached (rule 6). React's `cache` keeps a second call in one request
// to one read, so each is keyed by primitives (the coven's id and the filter written as JSON) and,
// for the page read, the coven's `Membership` last. That is an object, so `cache` keys it by
// identity: `requireCovenMembership` is cached per slug per request, so the page passes the same
// object each time. A fresh object would only miss, never read wrongly.

type Filter = Parameters<typeof listWorkspaceIngredients>[2];

/**
 * One page of `CARD_PAGE_SIZE` entries with its count and everything a card draws: forms, category
 * chips, the coven's jars and each card's last edit. Each is one batch for the page, and the jars
 * of the whole page are one `stockOf` call. Each edge keeps its `cupboardEntry`, for the label and
 * the Annotated and Retired marks.
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
 * The coven's own entry `?edit=<id>` names, with its values for the edit form, read as the
 * signed-in member. Nothing for an id the coven cannot reach, or for a compendium entry it names,
 * which a coven does not edit: the list then opens no dialog. Any other failure of the read is let
 * through rather than called no entry.
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
 * The entry `?entry=<id>` opens the details of over the list, read as the signed-in member, any
 * role: the coven's own entry, or a compendium entry its cupboard holds, under the coven's label,
 * a retired one included. Nothing for an id the coven cannot reach, or a compendium entry the
 * cupboard does not hold, so the list opens no modal. Any other failure of the read is let through
 * rather than called no entry. With it, `detail`: the sections the details show, read as the
 * entry's page reads them, the held entry's cupboard entry laid in; and `jars`, the coven's jars of
 * it, for the details' Edit Stock.
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
