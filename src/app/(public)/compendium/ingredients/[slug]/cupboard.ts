import 'server-only';
import type { Route } from 'next';
import { cupboardFormValues } from '../../../../../components/CupboardEntryForm/entry-values';
import type {
  CupboardPlace,
  PublicCupboardProps,
} from '../../../../../components/IngredientEntry/types';
import { getSession } from '../../../../../lib/request-session';
import { single } from '../../../../../lib/search-params';
import { covenRolesIfSignedIn, viewerIfSignedIn } from '../../../../../lib/viewer';
import { rolePermits } from '@/modules/coven';
import {
  getCupboardEntry,
  MAKE_IT_OURS_PERMISSION,
  type HoldingCoven,
  type IngredientRow,
} from '@/modules/ingredients';

// The cupboard choices the public entry page offers a signed-in person (M9.12): every coven
// they may write in, whether it holds the entry, and what their role there permits, read as
// the coven's own page reads them. Per viewer, so read per request through the services and
// never from the page's cached, sessionless read (CLAUDE.md rule 6). The covens come from the
// viewer's own memberships, never the address: `?annotate=<covenSlug>` only picks among them,
// and a slug naming none of them, or one that may not annotate there, is ignored before any
// read is made. claude-docs/components/ingredient-entry.md, "On the public page".

export async function publicCupboardOf(
  entry: Pick<
    IngredientRow,
    | 'id'
    | 'name'
    | 'description'
    | 'safetyNotes'
    | 'elements'
    | 'celestialBodies'
    | 'zodiacSigns'
    | 'colors'
  >,
  own: Route,
  searchParams: Record<string, string | string[] | undefined>,
  holding: readonly HoldingCoven[],
): Promise<PublicCupboardProps | undefined> {
  const shell = await viewerIfSignedIn();
  const writable = shell?.workspaces.filter(({ canWrite }) => canWrite) ?? [];
  if (writable.length === 0) return undefined;
  const roles = await covenRolesIfSignedIn();
  const held = new Set(holding.map(({ id }) => id));
  const covens: CupboardPlace[] = writable.flatMap(({ id, slug, name }) => {
    const role = roles?.get(id);
    if (!role) return [];
    return [
      {
        workspaceId: id,
        covenSlug: slug,
        name,
        held: held.has(id),
        canAdd: rolePermits(role, { ingredient: ['create'] }),
        canAnnotate: rolePermits(role, { ingredient: ['update'] }),
        canRemove: rolePermits(role, { ingredient: ['delete'] }),
        canMakeOurs: rolePermits(role, MAKE_IT_OURS_PERMISSION),
        annotateHref: `${own}?annotate=${encodeURIComponent(slug)}` as Route,
      },
    ];
  });
  const offers = covens.some(
    (p) => (p.canAdd && !p.held) || (p.held && (p.canAnnotate || p.canRemove || p.canMakeOurs)),
  );
  if (!offers) return undefined;

  // Only a holding coven of the viewer's that may annotate opens the dialog.
  const asked = single(searchParams.annotate);
  const annotating = covens.find(
    ({ covenSlug, held: holds, canAnnotate }) => covenSlug === asked && holds && canAnnotate,
  );
  const session = annotating ? await getSession() : null;
  const row =
    annotating && session
      ? await getCupboardEntry(session, annotating.workspaceId, entry.id)
      : null;

  return {
    covens,
    defaultWorkspaceId: writable[0].id,
    annotate: {
      closeHref: own,
      opened:
        annotating && row
          ? {
              workspaceId: annotating.workspaceId,
              overrides: cupboardFormValues(entry, row).overrides,
            }
          : undefined,
    },
  };
}
