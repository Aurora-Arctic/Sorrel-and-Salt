import 'server-only';
import { cache } from 'react';
import { readCategories } from '@/app/compendium-reads';
import type { GrimoireSpell } from '@/components/GrimoireList/types';
import type { CardCategory } from '@/components/IngredientCard/types';
import { readNumberedPage } from '@/lib/numbered-page';
import { CARD_PAGE_SIZE } from '@/lib/pagination';
import { requireSession } from '@/lib/request-session';
import { assignedCategoriesOf, countGrimoire, listGrimoire } from '@/modules/grimoire';
import type { SpellStatus } from '@/modules/grimoire';
import { displayNamesOf } from '@/modules/identity';

// The read a grimoire tab makes (M10.11), twin of the Ingredients page's `reads.ts`. The
// spells are the coven's, so the read goes through the services for the signed-in
// session, which assert membership and keep a private spell its author's, and nothing is
// held in the data cache (CLAUDE.md rule 6). React's `cache` keeps a second call in one
// request to one read, so it is keyed by primitives: the coven's id, the filter as the
// parameter table's variables written as JSON, the tab's status and the cursors.

type Query = Parameters<typeof listGrimoire>[3];

/**
 * One page of `CARD_PAGE_SIZE` spells of one status, with its count, each spell with the
 * categories its author assigned it and the name of whoever last edited it: one batch each
 * for the page, whatever its length. Newest
 * edit first, or best match first while a search is in force (the service's rule).
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
    const [answers, known, editors] = await Promise.all([
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
    ]);
    const byId = new Map(known.map((category) => [category.id, category]));
    const spells = page.edges.map(({ node }, i): GrimoireSpell => {
      const answer = answers[i];
      if (answer instanceof Error) throw answer;
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
      };
    });
    return { ...page, spells };
  },
);
