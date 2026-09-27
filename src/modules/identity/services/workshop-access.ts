import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';

// Who may open the staging component workshop: claude-docs/workshop.md,
// "On staging". Admin only — a role that can view it without admin's other
// powers is v2.

/** Throws `Forbidden` unless the session may open the workshop. */
export function assertWorkshopAccess(session: Session): void {
  if (session.role !== 'admin') throw new Forbidden('The workshop is open to admins only');
}
