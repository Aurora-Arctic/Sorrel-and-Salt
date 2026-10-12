import type { ShellViewer } from './types';

// Where the brand and the Your Coven link go (MB.7): the `/coven` landing
// (M2.8), which itself sends a member into their first coven, offers the
// create page to someone who may make one, and explains the invitation to
// anyone else. The choice is the page's, made where the viewer is read, so
// these carry no workspaces and the links stay one address.

/** The landing for anyone who is not an admin, and an admin's Your Coven link. */
export function covenHome(): '/coven' {
  return '/coven';
}

/** Where the brand goes: an admin's home is `/admin`, anyone else's is the coven landing. */
export function shellHome({ isAdmin }: Pick<ShellViewer, 'isAdmin'>): '/admin' | '/coven' {
  return isAdmin ? '/admin' : covenHome();
}
