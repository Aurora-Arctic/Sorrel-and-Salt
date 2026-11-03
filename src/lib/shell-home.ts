import type { Route } from 'next';
import type { ShellWorkspace } from './types';

// Where the Your Coven link goes: a member straight into the first coven the switcher lists, not the `/coven` landing that would only redirect there; someone
// in no coven to the landing. The list is `viewerOf`'s, so the link and the switcher agree on which is first.

/**
 * The first coven the viewer can open, passing over any whose access is paused, or the first when every one is: its
 * paused page says so, offers Leave and lists no dead end.
 */
export function firstReachable<Workspace extends Pick<ShellWorkspace, 'paused'>>(
  workspaces: readonly Workspace[],
): Workspace | undefined {
  return workspaces.find(({ paused }) => !paused) ?? workspaces[0];
}

/** The viewer's first coven they can open, or the landing for someone in none: a curator's or a keeper's Your Coven link. */
export function covenHome(workspaces: readonly Pick<ShellWorkspace, 'slug' | 'paused'>[]): Route {
  const first = firstReachable(workspaces);
  return first ? (`/coven/${first.slug}` as Route) : '/coven';
}
