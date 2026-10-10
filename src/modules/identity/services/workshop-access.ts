import 'server-only';
import type { Session } from '../../../lib/session';
import { assertSiteAdmin } from './site-admin';

// Who may open the staging component workshop: claude-docs/workshop.md,
// "On staging". Admin only — a role that can view it without admin's other
// powers is v2.

/**
 * Throws `Forbidden` unless the session may open the workshop: the site-role
 * check itself, in the workshop's words, so the role is read in one place.
 */
export function assertWorkshopAccess(session: Session): void {
  assertSiteAdmin(session, 'The workshop is open to admins only');
}
