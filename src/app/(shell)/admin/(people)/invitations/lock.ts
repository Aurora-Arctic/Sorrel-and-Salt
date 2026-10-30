import 'server-only';
import { changesLocked } from '../../../../../components/UserList/lock';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../../../../lib/primary-admin';
import type { Session } from '../../../../../lib/session';
import { readPauseState } from '../pause-state';

/**
 * Why this admin may neither invite nor revoke (changes paused, not the primary admin), or
 * `undefined` when they may.
 */
export async function invitationsLock(session: Session): Promise<string | undefined> {
  return changesLocked(await readPauseState(session)) ? ADMIN_CHANGES_PAUSED_REFUSAL : undefined;
}
