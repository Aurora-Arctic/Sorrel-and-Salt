import type { AuditSession } from '../db/audit';
import type { users } from '../db/schema/users';

// The service-level session: who is acting, as every service takes it. Not
// Better Auth's `sessions` row, which is the browser's proof of identity and
// lives behind `/api/auth` — this is what the server resolved out of it.
//
// It extends `AuditSession` rather than restating `userId`, so the identity a
// call acts under and the identity it is stamped with are one field rather than
// two that can disagree (CLAUDE.md rule 3).
// See claude-docs/auth.md, "The service-level session, and the two refusals".

/** `'user' | 'admin'`, read off the column rather than restated (DESIGN.md §5). */
export type UserRole = (typeof users.$inferSelect)['role'];

/**
 * The acting user, as a service receives it.
 *
 * **`role` is on the session; `canCreateWorkspace` is deliberately not.** The
 * site role is checked again at the schema layer, where there is no query to
 * run. Creation rights flip mid-session when an invitation is accepted, so a
 * snapshot would deny a user something they had just earned — the service that
 * gates on it reads the row.
 *
 * Nothing else belongs here: the workspace is in the URL, and membership is
 * `Membership`, which only `assertMembership` can produce.
 */
export interface Session extends AuditSession {
  role: UserRole;
}
