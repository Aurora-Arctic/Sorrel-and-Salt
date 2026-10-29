import 'server-only';
import type { CupboardPlus } from '@/components/IngredientEntry/types';
import { Forbidden } from '@/lib/errors';
import { getSession } from '@/lib/request-session';
import { covenRolesIfSignedIn, viewerIfSignedIn } from '@/lib/viewer';
import { rolePermits } from '@/modules/coven';
import { covensHoldingEntry, type HoldingCoven } from '@/modules/ingredients';

// The plus beside an entry page's pencil, public page and coven's alike: the viewer's covens and which
// hold the entry. Per viewer, so read per request and never cached (rule 6); see
// claude-docs/components/ingredient-entry.md, "Cupboard buttons".

/**
 * The viewer's covens that hold the entry, viewers' included; none signed out. A refusal reads as
 * none, and the write says no.
 */
export async function covensHolding(id: string): Promise<readonly HoldingCoven[]> {
  const session = await getSession();
  if (!session) return [];
  try {
    return await covensHoldingEntry(session, id);
  } catch (error) {
    if (error instanceof Forbidden) return [];
    throw error;
  }
}

/**
 * Every coven the viewer may add in, with those in `holding` marked held; none where no coven may
 * add. `current` is the default where it may add, otherwise the first.
 */
export async function plusCovensOf(
  holding: readonly HoldingCoven[],
  current?: string,
): Promise<CupboardPlus | undefined> {
  const shell = await viewerIfSignedIn();
  const writable = shell?.workspaces.filter(({ canWrite }) => canWrite) ?? [];
  if (writable.length === 0) return undefined;
  const roles = await covenRolesIfSignedIn();
  const covens = writable
    .filter(({ id }) => {
      const role = roles?.get(id);
      return role !== undefined && rolePermits(role, { ingredient: ['create'] });
    })
    .map(({ id, name }) => ({ id, name }));
  if (covens.length === 0) return undefined;
  const held = new Set(holding.map(({ id }) => id));
  return {
    workspaceId: covens.find(({ id }) => id === current)?.id ?? covens[0].id,
    covens,
    heldIn: covens.filter(({ id }) => held.has(id)).map(({ id }) => id),
  };
}
