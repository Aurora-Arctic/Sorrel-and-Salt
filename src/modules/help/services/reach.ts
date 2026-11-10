import 'server-only';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { assertCurator, assertSiteAdmin } from '@/modules/identity';
import type { HelpReach } from '../types';

/** The widest audience `session` may read: a keeper reads all three, a curator public and staff, anyone else, signed out too, public. */
export function reachOf(session: Session | null): HelpReach {
  if (!session) return 'public';
  try {
    assertSiteAdmin(session);
    return 'keeper';
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
  }
  try {
    assertCurator(session);
    return 'staff';
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
  }
  return 'public';
}
