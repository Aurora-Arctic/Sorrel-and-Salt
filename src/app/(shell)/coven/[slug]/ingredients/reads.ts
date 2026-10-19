import 'server-only';
import { cache } from 'react';
import { readCardCategoriesOf, readFormIcons } from '../../../../compendium-reads';
import type { SafetyVariant } from '../../../../../components/SafetyNote/types';
import { readNumberedPage } from '../../../../../lib/numbered-page';
import { CARD_PAGE_SIZE } from '../../../../../lib/pagination';
import { requireSession } from '../../../../../lib/request-session';
import type { CovenIngredientPage } from './types';
import {
  countWorkspaceIngredients,
  listWorkspaceIngredients,
  stockOf,
  variantsOf,
  workspaceIngredientFacets,
} from '@/modules/ingredients';

// The reads the coven's Ingredients page makes (M9.6), twin of `compendium-reads.ts`.
// The data is the coven's, so each read goes through the services for the signed-in
// session, which asserts membership, and none is held in the data cache (CLAUDE.md
// rule 6). React's `cache` keeps a second call in one request to one read, so each is
// keyed by primitives: the coven's id and the filter as the parameter table's
// variables, written as JSON.

type Filter = Parameters<typeof listWorkspaceIngredients>[2];

/**
 * One page of `CARD_PAGE_SIZE` entries with its count and everything a card draws:
 * forms, category chips, and the coven's jars. Each is one batch for the page,
 * whatever its length, and the jars of the whole page are one `stockOf` call.
 * Each edge keeps its `cupboardEntry`, for the label and the Annotated and Retired
 * marks.
 */
export const readCovenIngredients = cache(
  async (
    workspaceId: string,
    variables: string,
    after: string | undefined,
    before: string | undefined,
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
    const [forms, categories, jars, formIcons] = await Promise.all([
      variantsOf(session, refs),
      readCardCategoriesOf(session, refs),
      stockOf(
        session,
        page.edges.map(({ node }) => ({ ingredientId: node.id, workspaceId })),
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
    };
  },
);

/** How many entries each filter's choices would list, for the filter as the address holds it. */
export const readCovenFacets = cache(async (workspaceId: string, variables: string) => {
  const session = await requireSession();
  const filter: Filter = JSON.parse(variables);
  return workspaceIngredientFacets(session, workspaceId, filter);
});
