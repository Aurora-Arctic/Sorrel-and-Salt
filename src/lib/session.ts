import type { AuditSession } from '../db/audit';
import type { users } from '../db/schema/users';

// The service-level session: who is acting. Not Better Auth's `sessions` row,
// which is the browser's proof and lives behind `/api/auth`. Extends
// `AuditSession` so the acting identity and the stamped one are one field
// (CLAUDE.md rule 3).
// See claude-docs/auth.md, "The service-level session, and the two refusals".

/** `'user' | 'admin'`, read off the column rather than restated (DESIGN.md §5). */
export type UserRole = (typeof users.$inferSelect)['role'];

/**
 * `role` is here because the schema layer checks it without a query;
 * `canCreateWorkspace` is not, because accepting an invitation flips it
 * mid-session and a snapshot would deny what was just earned. The workspace is
 * in the URL, and membership is the `Membership` proof.
 */
export interface Session extends AuditSession {
  role: UserRole;
}
