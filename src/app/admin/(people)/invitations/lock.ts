import 'server-only';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../../../lib/primary-admin';
import type { Session } from '../../../../lib/session';
import { readPauseState } from '../pause-state';

/**
 * Why this admin may neither invite nor revoke, while admin changes are
 * paused and they are not the primary admin (MB.63), or `undefined` when they
 * may: what the Invitations tab and its Invite Admin both lock on.
 */
export async function invitationsLock(session: Session): Promise<string | undefined> {
  const { paused, canToggle } = await readPauseState(session);
  return paused && !canToggle ? ADMIN_CHANGES_PAUSED_REFUSAL : undefined;
}
