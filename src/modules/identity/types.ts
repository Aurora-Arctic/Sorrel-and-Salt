import type { users } from './schema/users';

export type UserRow = typeof users.$inferSelect;

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
  /** Mails the row's own, still-unverified address its link again. */
  resend(email: string): Promise<void>;
  /** Mails `next` a link that, followed from the row's session, makes it the row's address. */
  requestChange(current: string, next: string): Promise<void>;
}
