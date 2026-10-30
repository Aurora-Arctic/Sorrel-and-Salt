import 'server-only';
import type { Route } from 'next';
import { cupboardFormValues } from '../../../../../components/CupboardEntryForm/entry-values';
import type { CupboardOverrides } from '../../../../../components/CupboardEntryForm/types';
import type {
  CupboardPlace,
  PublicCupboardProps,
} from '../../../../../components/IngredientEntry/types';
import { readEntryStock, stockKey } from '../../../../entry-stock';
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

// The cupboard choices for a signed-in person: each coven they may write in, whether it holds the
// entry, and their role's permissions. Per viewer, so never in the cached read (rule 6). A
// `?annotate=` slug naming no membership is ignored (claude-docs/components/ingredient-entry.md).

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
  // Edit Stock: a holding coven whose role may update stock, with the stock read for it in one
  // batch, per viewer (rule 6).
  const stockers = writable.filter(({ id }) => {
    const role = roles?.get(id);
    return held.has(id) && role !== undefined && rolePermits(role, { inventory: ['update'] });
  });
  const stock = await readEntryStock(
    stockers.map(({ id }) => ({ ingredientId: entry.id, workspaceId: id })),
  );
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
        stock: stock.get(stockKey(id, entry.id)),
      },
    ];
  });
  const offers = covens.some(
    (p) =>
      (p.canAdd && !p.held) ||
      (p.held && (p.canAnnotate || p.canRemove || p.canMakeOurs || p.stock)),
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

  let opened:
    { workspaceId: string; overrides: CupboardOverrides; revision: number | null } | undefined;
  if (annotating && row) {
    const { overrides, revision } = cupboardFormValues(entry, row);
    opened = { workspaceId: annotating.workspaceId, overrides, revision };
  }
  return {
    covens,
    defaultWorkspaceId: writable[0].id,
    annotate: { closeHref: own, opened },
  };
}
