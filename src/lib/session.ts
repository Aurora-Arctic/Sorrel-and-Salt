import type { createAuthMiddleware } from 'better-auth/api';
import type { AuditSession } from '../db/types';
import type { users } from '../modules/identity/schema/users';

// The session types. Apart from `types.ts`, which imports nothing, because they
// read the `users` table and Better Auth.

// The service-level session: who is acting. Not Better Auth's `sessions` row,
// which is the browser's proof and lives behind `/api/auth`. Extends
// `AuditSession` so the acting identity and the stamped one are one field
// (CLAUDE.md rule 3).
// See claude-docs/auth/service-session.md, "The service-level session, and the three errors".

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

// `emailVerified` stays off the service-level session: only `requireSession`
// reads it, to keep an unverified account on the email page.
export interface SessionState {
  session: Session | null;
  emailVerified: boolean;
}

/** What a Better Auth hook handler is handed: the request, and the session once there is one. */
export type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];
