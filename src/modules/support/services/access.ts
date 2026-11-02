import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { SupportReader, SupportViewer } from '../../../db/repository';
import { assertCurator, assertSiteAdmin } from '../../identity';

// Who is asking, in the forms the support finders take. An unverified account reaches the email page and nothing else, so every
// door refuses it first, as `assertCurator` does for the staff doors.

const UNVERIFIED =
  'Verify your email address before using this site. Open the email page from your account to finish.';

/** @throws {Forbidden} the session's email address is unverified. */
export function requireVerified(session: Session): void {
  if (session.emailUnverified) throw new Forbidden(UNVERIFIED);
}

/**
 * A curator or an admin, as the list finder narrows it.
 *
 * @throws {Forbidden} the address is unverified, or the role is neither `curator` nor `admin`.
 */
export function readerOf(session: Session, reason: string): SupportReader {
  if (session.role === 'admin') return { role: 'admin', proof: assertSiteAdmin(session, reason) };
  return { role: 'curator', proof: assertCurator(session, reason) };
}

/** The viewer a reply batch is read for. */
export function viewerOf(session: Session): SupportViewer {
  return { userId: session.userId, role: session.role };
}
