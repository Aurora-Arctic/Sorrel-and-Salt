import type { AuditSession } from '../db/audit';
import type { users } from '../db/schema/users';

// M1.26 — the service-level session: who is acting, as every service takes it.
//
// This is not Better Auth's `sessions` row. That row is the browser's proof of
// identity and lives behind `/api/auth`; this is the value the server has
// already resolved from it and hands to a service. Keeping the two apart is
// part of why MB.30 turned the organization plugin down: routing service calls
// through Better Auth's own server API would have made every fixture user a
// `sessions` row and a signed cookie, and `asUser(A)` would have stopped being
// a service-level value at all
// (claude-docs/design-decisions/mb.30-organization-plugin.md). M2.7 adds the
// helper that produces one from a request; M1.26 defines the shape and
// `tests/support/as-user.ts` produces one from a fixture user, so authorization
// tests can be written before the reader exists.
//
// It extends `AuditSession` rather than restating `userId`, which is what
// makes `withAudit(session, fn)` take a service session directly: the identity
// a call acts under and the identity it is stamped with are one field, not two
// that can disagree (CLAUDE.md rule 3).

/** `'user' | 'admin'`, read off the column rather than restated (DESIGN.md §5). */
export type UserRole = (typeof users.$inferSelect)['role'];

/**
 * The acting user, as a service receives it.
 *
 * **`role` is on the session; `canCreateWorkspace` is deliberately not.**
 * The site role is what M5.7's Pothos auth scope checks at the schema layer,
 * where there is no query to run — it is a second, independent check on top of
 * the service's own, so it has to be readable off the context. Creation rights
 * are the opposite case: accepting an invitation flips the flag mid-session
 * (M7.5), and a session snapshot taken before that would deny a user something
 * they had just earned. The service that gates on it reads the row.
 *
 * Nothing else belongs here either. A workspace is not on the session by
 * design — it lives in the URL, because session-held workspace context is how
 * two tabs come to disagree about where a write landed (DESIGN.md §9) — and
 * membership is not a session field but M6.3's `Membership` proof, which only
 * `assertMembership` can produce.
 */
export interface Session extends AuditSession {
  role: UserRole;
}
