import type { Route } from 'next';
import type { ShellWorkspace } from './types';

// Where the Your Coven link goes: a member straight into the first coven the switcher lists, not the `/coven` landing that would only redirect there; someone
// in no coven to the landing. The list is `viewerOf`'s, so the link and the switcher agree on which is first.

/** The viewer's first coven, or the landing for someone in none: a curator's or an admin's Your Coven link. */
export function covenHome(workspaces: readonly Pick<ShellWorkspace, 'slug'>[]): Route {
  const [first] = workspaces;
  return first ? (`/coven/${first.slug}` as Route) : '/coven';
}
