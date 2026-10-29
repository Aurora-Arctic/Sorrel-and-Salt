import type { Route } from 'next';
import type { ShellWorkspace } from './types';

// Where the Your Coven link goes. A member goes straight
// into the first coven the switcher lists, rather than to the `/coven`
// landing, which would only redirect them there and leave the browser a stop
// with nothing on it. Someone in no coven goes to the landing,
// which offers the create page to someone who may make one and explains the
// invitation to anyone else. The list is the one `viewerOf` sorts, so the
// link and the switcher agree on which coven is first.

/** The viewer's first coven, or the landing for someone in none: a curator's or an admin's Your Coven link. */
export function covenHome(workspaces: readonly Pick<ShellWorkspace, 'slug'>[]): Route {
  const [first] = workspaces;
  return first ? (`/coven/${first.slug}` as Route) : '/coven';
}
