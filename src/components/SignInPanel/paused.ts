'use client';

import { accessPausedPath, isAccessPaused } from '../../lib/access-paused';
import { reportLeaving } from '../../lib/navigation';

/**
 * Leaves for the paused page when a sign-in was refused for a standing pause, carrying the pause's end; answers whether
 * it left. A full navigation, like every other way out of the panel.
 */
export function leaveIfPaused(failure: unknown): boolean {
  if (!isAccessPaused(failure)) return false;
  reportLeaving();
  window.location.assign(accessPausedPath(failure.until));
  return true;
}
