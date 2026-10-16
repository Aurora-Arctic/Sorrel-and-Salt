import type { Route } from 'next';
import type { ShellViewer, ShellWorkspace } from './types';

// Where the brand and the Your Coven link go (MB.7). A member goes straight
// into the first coven the switcher lists, rather than to the `/coven`
// landing, which would only redirect them there and leave the browser a stop
// with nothing on it (MB.257). Someone in no coven goes to the landing (M2.8),
// which offers the create page to someone who may make one and explains the
// invitation to anyone else. The list is the one `viewerOf` sorts, so the
// link and the switcher agree on which coven is first.

/** The viewer's first coven, or the landing for someone in none: a curator's or an admin's Your Coven link, and anyone else's brand. */
export function covenHome(workspaces: readonly Pick<ShellWorkspace, 'slug'>[]): Route {
  const [first] = workspaces;
  return first ? (`/coven/${first.slug}` as Route) : '/coven';
}

/** Where the brand goes: a curator's or an admin's home is `/admin` (M11.20), anyone else's is their coven. */
export function shellHome(
  { canCurate }: Pick<ShellViewer, 'canCurate'>,
  workspaces: readonly Pick<ShellWorkspace, 'slug'>[],
): Route {
  return canCurate ? '/admin' : covenHome(workspaces);
}
