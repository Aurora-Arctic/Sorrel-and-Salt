import type { userPrivilegeChanges } from './schema/user-privilege-changes';
import type { users } from './schema/users';
import type {
  InvitableSiteRole,
  InvitationRow,
  InvitedCoven,
  SiteInvitationRow,
} from '../../db/repository';

export type {
  CardArrivalFilter,
  CardBatchFilter,
  CardBatchStatus,
  PrivilegeChangeFilter,
  UserFilter,
} from '../../db/repository';

export type UserRow = typeof users.$inferSelect;

/** What an Updated stamp shows of an editor: the account and its display name, no ledger field. */
export type EditorName = Pick<UserRow, 'id' | 'name'>;

/** What `/admin/invitations` is narrowed by. Each part is optional, and absent means no filter. */
export interface AdminInvitationFilter {
  /** A fragment of the invited address, case-insensitive. */
  email?: string;
  /** Only the invitations lapsing within the next 24 hours. */
  expiringSoon?: boolean;
}

/** One row of the privilege ledger. */
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
  /** Whether the request's session was created less than `seconds` ago. */
  sessionIsFresh(seconds: number): Promise<boolean>;
  /** Tells `current`, the address being left, that a change to `address` was asked for. Names the address's domain only; never throws on a failed send. */
  notifyChangeRequested(current: string, address: string): Promise<void>;
  /** Runs `task` once the response is sent, so a mail adds nothing to how long the answer takes. */
  defer(task: () => Promise<void>): void;
}

/** Whether admin changes are paused, and whether the asking admin may switch that. */
export interface AdminRoleChangePauseState {
  paused: boolean;
  /** Only the primary admin may pause or resume. */
  canToggle: boolean;
}

/**
 * How an invitation's link, admin or coven, reaches the invited address. Built per request by the GraphQL context, as
 * `EmailVerificationSender` is, because a service may not import Better Auth's origin resolution.
 */
export interface InvitationSender {
  /** Mails `to` the link that accepts the site invitation `token` names, with the site role and sender. Never throws on a failed send. */
  siteInvitation(
    to: string,
    token: string,
    invitation: { siteRole: InvitableSiteRole; inviterName: string },
  ): Promise<void>;
  /** Mails `to` the link that accepts the coven invitation `token` names, with the coven, role and inviter. Never throws on a failed send. */
  workspaceInvitation(
    to: string,
    token: string,
    coven: { name: string; role: 'viewer' | 'member'; inviterName: string },
  ): Promise<void>;
}

/** An invitation into a coven: it names the workspace and the role it seats the person at. */
export type WorkspaceInvitationRow = InvitationRow & {
  workspaceId: string;
  role: NonNullable<InvitationRow['role']>;
};

/**
 * A pending coven invitation as its invitee's `/coven` landing shows it: coven, role, sender and expiry.
 * Never the token, which no response carries, nor the invited address.
 */
export interface ReceivedInvitation {
  id: string;
  covenName: string;
  covenSlug: string;
  role: NonNullable<InvitationRow['role']>;
  /** Null once the sender's account is gone. */
  inviterName: string | null;
  expiresAt: Date;
  note: string | null;
}

/** Why an invitation link cannot be accepted by this session, one reason per link. */
export type InvitationRefusal =
  | 'invalid'
  | 'accepted'
  /** A card the signed-in account itself accepted. */
  | 'used-by-you'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'closed'
  | 'different-address'
  | 'unverified'
  | 'paused';

/** Whether this session may accept the invitation a link names, and if not, why, in words. */
export type InvitationStanding =
  /** The site role accepting grants, curator or admin. */
  | { acceptable: true; tier: 'site'; siteRole: InvitableSiteRole }
  /** The coven's name, for the matching verified account alone, and its slug, where accepting lands: `/coven/[slug]`. */
  | { acceptable: true; tier: 'workspace'; slug: string; name: string }
  /** A card: it names no coven, role or batch, and accepting lands on the account's own page. */
  | { acceptable: true; tier: 'card' }
  | { acceptable: false; reason: InvitationRefusal; message: string };

/** The accept service's checks, inside the module: a refusal, or the invitation and the account it admits. */
export type InvitationCheck =
  /** `card` when the link is a card's, found or shaped like one, so the words fit a printed card. */
  | { refusal: InvitationRefusal; card?: boolean }
  | { refusal?: undefined; tier: 'site'; invitation: SiteInvitationRow; user: UserRow }
  | { refusal?: undefined; tier: 'card'; invitation: InvitationRow; user: UserRow }
  | {
      refusal?: undefined;
      tier: 'workspace';
      invitation: WorkspaceInvitationRow;
      user: UserRow;
      /** The live coven, as the invited account may be told it. */
      coven: InvitedCoven;
    };

/** Where a card stands: pending until accepted, revoked or past its date. */
export type CardState = 'pending' | 'accepted' | 'expired' | 'revoked';

/** A mint's answer: the batch, its expiry, and each card's token, which no later read returns. */
export interface MintedCards {
  batchId: string;
  expiresAt: Date;
  tokens: string[];
}
