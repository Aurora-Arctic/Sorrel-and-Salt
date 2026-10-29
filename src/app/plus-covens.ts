import 'server-only';
import type { CupboardPlus } from '@/components/IngredientEntry/types';
import { Forbidden } from '@/lib/errors';
import { getSession } from '@/lib/request-session';
import { covenRolesIfSignedIn, viewerIfSignedIn } from '@/lib/viewer';
import { rolePermits } from '@/modules/coven';
import { covensHoldingEntry, type HoldingCoven } from '@/modules/ingredients';

// The plus beside an entry page's pencil, on the public page and a coven's alike: the viewer's
// covens, and which of them hold the entry. Per viewer, so read per request through the services and
// never cached (CLAUDE.md rule 6); the held covens are the one `covensHoldingEntry` read, which
// filters to the viewer's memberships in SQL. claude-docs/components/ingredient-entry.md, "The plus".

/**
 * The viewer's covens that hold the entry, viewers' included: none signed out. The one held read a
 * page makes, feeding the shelf mark, the cupboard choices and the plus. A refusal reads as none,
 * and the write says no.
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
 * The plus's covens: every coven the viewer may add in, with those of them in `holding` held. None
 * where no coven may add (a viewer everywhere, a curator in no coven), so the page draws neither the
 * plus nor its check. `current` is the coven the page is in, the default where it may add;
 * otherwise the first.
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
