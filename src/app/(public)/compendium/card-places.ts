import 'server-only';
import type { Route } from 'next';
import type { CompendiumCardPlace } from '../../../components/CompendiumCards/types';
import type { StockData } from '../../../components/StockDialog/types';
import { covenRolesIfSignedIn } from '../../../lib/viewer';
import { rolePermits } from '@/modules/coven';
import { MAKE_IT_OURS_PERMISSION } from '@/modules/ingredients';

// What the cards' three dots and Quick Look offer a signed-in member: each coven they may write in and
// their role's permissions there. Per viewer, so never in the cached reads (rule 6).

/** One of the viewer's writable covens, and what the role there permits about a held entry. */
export interface CardCoven {
  workspaceId: string;
  covenSlug: string;
  name: string;
  canAnnotate: boolean;
  canMakeOurs: boolean;
  canRemove: boolean;
  /** The role may update stock: Edit Stock is offered where the coven holds the entry. */
  canStock: boolean;
}

/** A coven the viewer may write in: what the shell already read of it. */
export interface WritableCoven {
  id: string;
  slug: string;
  name: string;
}

/** The given writable covens with what each role permits, in their order; none where no role is found. */
export async function readCardCovens(
  writable: readonly WritableCoven[],
): Promise<readonly CardCoven[]> {
  const roles = await covenRolesIfSignedIn();
  return writable.flatMap(({ id, slug, name }): CardCoven[] => {
    const role = roles?.get(id);
    if (!role) return [];
    return [
      {
        workspaceId: id,
        covenSlug: slug,
        name,
        canAnnotate: rolePermits(role, { ingredient: ['update'] }),
        canMakeOurs: rolePermits(role, MAKE_IT_OURS_PERMISSION),
        canRemove: rolePermits(role, { ingredient: ['delete'] }),
        canStock: rolePermits(role, { inventory: ['update'] }),
      },
    ];
  });
}

/**
 * The covens that hold an entry and let the viewer act on it from the card, for the More's places.
 * `stockOf` answers Edit Stock's read per coven; none where no coven holds it, which draws no dots.
 */
export function cardPlacesOf(
  covens: readonly CardCoven[],
  holds: (workspaceId: string) => boolean,
  entryPath: string,
  stockOf?: (workspaceId: string) => StockData | undefined,
): CompendiumCardPlace[] {
  return covens.flatMap(({ canStock, ...coven }): CompendiumCardPlace[] => {
    if (!holds(coven.workspaceId)) return [];
    const stock = canStock ? stockOf?.(coven.workspaceId) : undefined;
    if (!(coven.canAnnotate || coven.canMakeOurs || coven.canRemove || stock)) return [];
    return [
      {
        ...coven,
        annotateHref: `${entryPath}?annotate=${encodeURIComponent(coven.covenSlug)}` as Route,
        ...(stock && { stock }),
      },
    ];
  });
}
