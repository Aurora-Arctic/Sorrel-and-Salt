import 'server-only';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { assertCurator, assertSiteAdmin } from '@/modules/identity';
import type { HelpReach } from '../types';

/** The widest audience `session` may read: a keeper reads all three, a curator public and staff, anyone else, signed out too, public. */
export function reachOf(session: Session | null): HelpReach {
  if (!session) return 'public';
  if (passes(() => assertSiteAdmin(session))) return 'keeper';
  return passes(() => assertCurator(session)) ? 'staff' : 'public';
}

/** Whether `assertion` holds: a refusal is a no, and any other error is still thrown. */
function passes(assertion: () => void): boolean {
  try {
    assertion();
    return true;
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
    return false;
  }
}
