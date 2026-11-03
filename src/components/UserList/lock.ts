import type { PauseControlProps } from './types';

// Whether keeper changes are locked for the viewing admin: paused, and
// the viewer not the primary keeper, whom the pause exempts. One reading, so
// the user list's Change Role and the Invitations tab's New Invitation
// and Revoke lock on the same rule; the service still refuses either way.

/** Whether `state` locks this keeper's grants, revokes and invitations. */
export const changesLocked = ({ paused, canToggle }: PauseControlProps): boolean =>
  paused && !canToggle;
