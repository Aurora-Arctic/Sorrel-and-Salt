import type { userPrivilegeChanges } from './schema/user-privilege-changes';
import type { users } from './schema/users';

export type { PrivilegeChangeFilter, UserFilter } from '../../db/repository';

export type UserRow = typeof users.$inferSelect;

/** One row of the privilege ledger (MB.194). */
export type PrivilegeChangeRow = typeof userPrivilegeChanges.$inferSelect;

/** What the provider said at this callback — never the stored row, which a later feature may set. */
export interface SignInProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
}

export type PrimaryAdminOutcome =
  | 'promoted'
  | 'already-admin'
  | 'not-primary'
  | 'no-profile'
  | 'provider-does-not-vouch'
  | 'unverified'
  | 'profile-email-differs';

/**
 * How what the email service decides gets delivered. Built per request by the
 * GraphQL context, because it reaches Better Auth and a service may not.
 */
export interface EmailVerificationSender {
  /** Mails the row's own, still-unverified address its link again, landing on the way to `next`. */
  resend(email: string, next?: string): Promise<void>;
  /**
   * Mails `address` a link that, followed from the row's session, makes it the
   * row's address, landing on the way to `next`.
   */
  requestChange(current: string, address: string, next?: string): Promise<void>;
}

/** Whether admin changes are paused (MB.63), and whether the asking admin may switch that. */
export interface AdminRoleChangePauseState {
  paused: boolean;
  /** Only the primary admin may pause or resume. */
  canToggle: boolean;
}
