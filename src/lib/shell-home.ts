import { NEW_COVEN_PATH } from './coven-path';
import type { ShellViewer, ShellWorkspace } from './types';

// Where the brand and the Your Coven link go (MB.7). There is no `/coven`
// landing page yet, so each picks the nearest page that exists. M2.8 adds
// `/coven` and replaces both functions with that one address.

type WhoAsks = Pick<ShellViewer, 'isAdmin' | 'canCreate'>;

/**
 * Where the viewer's own coven is: the first they belong to; failing that the
 * create page, for someone allowed to make one; failing that the account page,
 * the one page everyone signed in has.
 */
export function covenHome(
  workspaces: readonly Pick<ShellWorkspace, 'slug'>[],
  canCreate: boolean,
): '/account' | `/coven/${string}` {
  const [first] = workspaces;
  if (first) return `/coven/${first.slug}`;
  return canCreate ? NEW_COVEN_PATH : '/account';
}

/** Where the brand goes: an admin's home is `/admin`, anyone else's is their coven's. */
export function shellHome(
  { isAdmin, canCreate }: WhoAsks,
  workspaces: readonly Pick<ShellWorkspace, 'slug'>[],
): '/admin' | '/account' | `/coven/${string}` {
  return isAdmin ? '/admin' : covenHome(workspaces, canCreate);
}
