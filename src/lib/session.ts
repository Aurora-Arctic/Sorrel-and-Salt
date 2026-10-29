import type { createAuthMiddleware } from 'better-auth/api';
import type { AuditSession } from '../db/types';
import type { users } from '../modules/identity/schema/users';

// The session types. Apart from `types.ts`, which imports nothing, because they
// read the `users` table and Better Auth.

// The service-level session: who is acting, not Better Auth's `sessions` row, which is the browser's proof. Extends `AuditSession` so the acting and the
// stamped identity are one field (CLAUDE.md rule 3; claude-docs/auth/service-session.md, "The service-level session, and the three errors").

/** `'user' | 'curator' | 'admin'`, read off the column rather than restated (DESIGN.md §5). */
export type UserRole = (typeof users.$inferSelect)['role'];

/**
 * `role` is here as the schema layer checks it without a query; `canCreateWorkspace` is not, as accepting an invitation flips it mid-session and a snapshot
 * would deny what was just earned. The workspace is in the URL, and membership is the `Membership` proof.
 */
export interface Session extends AuditSession {
  role: UserRole;
}

// `emailVerified` and `sessionFresh` stay off the service-level session:
// pages read them and services never do. `requireSession` keeps an unverified
// account on the email page; the account page withholds Remove while Better
// Auth would refuse it as stale (claude-docs/components/sign-in-methods.md).
export interface SessionState {
  session: Session | null;
  emailVerified: boolean;
  /** Younger than Better Auth's `freshAge`, so `/unlink-account` would take it. */
  sessionFresh: boolean;
}

/** What a Better Auth hook handler is handed: the request, and the session once there is one. */
export type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];
