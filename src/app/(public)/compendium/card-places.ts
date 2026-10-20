import 'server-only';
import type { Route } from 'next';
import type { CompendiumCardPlace } from '../../../components/CompendiumCards/types';
import { covenRolesIfSignedIn } from '../../../lib/viewer';
import { rolePermits } from '@/modules/coven';
import { MAKE_IT_OURS_PERMISSION } from '@/modules/ingredients';

// What the compendium cards' three dots and the Quick Look window's offer a signed-in member
// (the owner's call, 2026-10-20): every coven they may write in, with what their role there
// permits, read as the entry page's cupboard reads it (`publicCupboardOf`). Per viewer, so read
// per request through the viewer and never in the cached compendium reads (rule 6). The covens
// are the viewer's own memberships; each choice is only a door, and the service is the guard.
// claude-docs/components/compendium-cards.md.

/** One of the viewer's writable covens, and what the role there permits about a held entry. */
export interface CardCoven {
  workspaceId: string;
  covenSlug: string;
  name: string;
  canAnnotate: boolean;
  canMakeOurs: boolean;
  canRemove: boolean;
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
      },
    ];
  });
}

/**
 * The covens that hold an entry and let the viewer do something about it from the card: the
 * More's places. `entryPath` is the entry's public page, which Annotate leads to with that
 * coven's dialog open. None where no coven holds it, which draws no dots.
 */
export function cardPlacesOf(
  covens: readonly CardCoven[],
  holds: (workspaceId: string) => boolean,
  entryPath: string,
): CompendiumCardPlace[] {
  return covens
    .filter(
      ({ workspaceId, canAnnotate, canMakeOurs, canRemove }) =>
        holds(workspaceId) && (canAnnotate || canMakeOurs || canRemove),
    )
    .map((coven) => ({
      ...coven,
      annotateHref: `${entryPath}?annotate=${encodeURIComponent(coven.covenSlug)}` as Route,
    }));
}
