import type { userPrivilegeChanges } from './schema/user-privilege-changes';
import type { users } from './schema/users';
import type { SiteInvitationRow } from '../../db/repository';

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

/**
 * How an admin invitation's link reaches the invited address (MB.70). Built
 * per request by the GraphQL context, as `EmailVerificationSender` is: the
 * link's origin is Better Auth's to resolve against its allowed hosts, and a
 * service may not import it.
 */
export interface InvitationSender {
  /** Mails `to` the link that accepts the invitation `token` names. Never throws on a failed send. */
  siteInvitation(to: string, token: string): Promise<void>;
}

/** Why an invitation link cannot be accepted by this session, one reason per link (MB.70, M7.7). */
export type InvitationRefusal =
  'invalid' | 'accepted' | 'revoked' | 'expired' | 'different-address' | 'unverified' | 'paused';

/** Whether this session may accept the invitation a link names, and if not, why, in words. */
export type InvitationStanding =
  | { acceptable: true; tier: 'site' }
  | { acceptable: false; reason: InvitationRefusal; message: string };

/** The accept service's checks, inside the module: a refusal, or the invitation and the account it admits. */
export type InvitationCheck =
  | { refusal: InvitationRefusal }
  | { refusal?: undefined; invitation: SiteInvitationRow; user: UserRow };
