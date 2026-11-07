import type { createAuthMiddleware } from 'better-auth/api';
import type { AuditSession } from '../db/types';
import type { AgreedVersion } from './types';
import type { users } from '../modules/identity/schema/users';

// Not Better Auth's `sessions` row. Extends `AuditSession` so the acting and the stamped identity are one field (CLAUDE.md rule 3; claude-docs/auth/service-session.md, "The service-level session, and the three errors").
// Apart from `types.ts`, which imports nothing: these read the `users` table and Better Auth.

export type UserRole = (typeof users.$inferSelect)['role'];

/** `canCreateWorkspace` is not here: accepting an invitation flips it mid-session and a snapshot would deny what was just earned. */
export interface Session extends AuditSession {
  role: UserRole;
  /** `assertMembership` refuses such a session every coven. */
  emailUnverified?: true;
}

// `sessionFresh` stays off the service-level session: pages read it and services never do (claude-docs/components/sign-in-methods.md).
export interface SessionState {
  session: Session | null;
  emailVerified: boolean;
  /** The account's recorded terms, disclaimer and code of ethics versions are all the ones in force; `false` with no session. */
  termsAgreed: boolean;
  agreedVersion?: AgreedVersion;
  /** Younger than Better Auth's `freshAge`, so `/unlink-account` would take it. */
  sessionFresh: boolean;
  /** Set while a pause stands on the session's user, with its end, `null` for none; absent otherwise. */
  accessPause?: { until: Date | null };
}

export type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];
