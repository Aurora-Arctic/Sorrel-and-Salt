import { orMissing } from '@/lib/or-not-found';
import 'server-only';
import { cache } from 'react';
import { readCardCategoriesOf, readFormIcons } from '../../../../compendium-reads';
import type { SafetyVariant } from '@/components/SafetyNote/types';
import { Forbidden } from '@/lib/errors';
import { readNumberedPage } from '@/lib/numbered-page';
import { CARD_PAGE_SIZE } from '@/lib/pagination';
import { requireSession } from '@/lib/request-session';
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
    const refs = page.edges.map(({ node }) => ({ id: node.id, workspaceId: node.workspaceId }));
    const [forms, categories, jars, lastEdits, formIcons] = await Promise.all([
      variantsOf(session, refs, heldBy),
      readCardCategoriesOf(session, refs, heldBy),
      stockOf(
        session,
        page.edges.map(({ node }) => ({ ingredientId: node.id, workspaceId })),
      ),
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

export const readCovenFacets = cache(async (workspaceId: string, variables: string) => {
  const session = await requireSession();
  const filter: Filter = JSON.parse(variables);
  return workspaceIngredientFacets(session, workspaceId, filter);
});

export async function readEditedEntry(workspaceId: string, id: string) {
  const session = await requireSession();
  const entry = await orMissing(() => getIngredient(session, id, workspaceId), Forbidden);
  if (!entry) return undefined;
  if (entry.workspaceId !== workspaceId) return undefined;
  return { entry, values: await entryValues(entry, session) };
}

export async function readViewedEntry(membership: CovenMembership['membership'], id: string) {
  const session = await requireSession();
  const entry = await orMissing(
    () => getIngredient(session, id, membership.workspaceId),
    Forbidden,
  );
  if (!entry) return undefined;
  // A retired entry is read in the coven, whose cupboard entry is its proof.
  const detailOf = () =>
    ingredientDetailOf(session, entry, isRetired(entry) ? membership.workspaceId : undefined);
  const jarsOf = () => covenJarsOf(session, membership.workspaceId, id);
  const lastEditOf = async () =>
    (await lastEditsOf(session, membership.workspaceId, [entry]))[0] ?? null;
  if (entry.workspaceId === membership.workspaceId) {
    const [detail, jars, lastEdit] = await Promise.all([detailOf(), jarsOf(), lastEditOf()]);
    return { shown: entry, own: true, detail, covens: [], jars, lastEdit };
  }
  const held = await heldCompendiumEntry(membership, id);
  if (!held) return undefined;
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
