import type { Route } from 'next';
import type { ShellWorkspace } from './types';
import { covenPath } from '@/lib/coven-path';

// A member goes straight into the first coven the switcher lists, not the `/coven` landing that would only redirect there.

/** Passes over a coven whose access is paused, unless every one is: its paused page says so and offers Leave. */
export function firstReachable<Workspace extends Pick<ShellWorkspace, 'paused'>>(
  workspaces: readonly Workspace[],
): Workspace | undefined {
  return workspaces.find(({ paused }) => !paused) ?? workspaces[0];
}

export function covenHome(workspaces: readonly Pick<ShellWorkspace, 'slug' | 'paused'>[]): Route {
  const first = firstReachable(workspaces);
  return first ? covenPath(first.slug) : '/coven';
}
