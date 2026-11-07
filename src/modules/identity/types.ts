import type { userAccessPauses } from './schema/user-access-pauses';
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

export type EditorName = Pick<UserRow, 'id' | 'name'>;

export interface AdminInvitationFilter {
  email?: string;
  expiringSoon?: boolean;
}

export type UserAccessPauseRow = typeof userAccessPauses.$inferSelect;

export interface AccessPauseNotifier {
  /** The origin a mailed link is built on. @throws {Error} where none resolves. */
  origin(): Promise<string>;
}

export type AccessPauseMail = {
  kind: 'access-pause';
  pauseId: string;
  origin: string;
};

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

/** Built per request by the GraphQL context, because it reaches Better Auth and a service may not. */
export interface EmailVerificationSender {
  resend(email: string, next?: string): Promise<void>;
  requestChange(userId: string, next?: string): Promise<void>;
  sessionIsFresh(seconds: number): Promise<boolean>;
  /** Tells account `userId`'s address, the one being left, that a change to its pending address was asked for. Names that address's domain only; never throws on a failed send. */
  notifyChangeRequested(userId: string): Promise<void>;
  /** Runs `task` once the response is sent, so a mail adds nothing to how long the answer takes. */
  defer(task: () => Promise<void>): void;
}

/** Built per request by the GraphQL context, as `EmailVerificationSender` is, because Better Auth's set-password endpoint is reachable only on the server. */
export interface PasswordSetter {
  /** @throws {ValidationError} on `newPassword` when a rule refuses it, the breached-password check cannot answer, or the account already has a password. */
  set(newPassword: string): Promise<void>;
  /** Whether the request's session is younger than Better Auth's `freshAge`; `false` with no session. */
  sessionIsFresh(): Promise<boolean>;
}

export interface AdminRoleChangePauseState {
  paused: boolean;
  /** Only the primary keeper may pause or resume. */
  canToggle: boolean;
}

/** Built per request by the GraphQL context, because a service may not import Better Auth's origin resolution. */
export interface InvitationSender {
  /** The run holds the id and the origin, and its step gives the invitation a fresh token when it sends. Never throws on a failed send. */
  invitation(invitationId: string): Promise<void>;
}

export type WorkspaceInvitationRow = InvitationRow & {
  workspaceId: string;
  role: NonNullable<InvitationRow['role']>;
};

/** Never the token, which no response carries, nor the invited address. */
export interface ReceivedInvitation {
  id: string;
  covenName: string;
  covenSlug: string;
  role: NonNullable<InvitationRow['role']>;
  inviterName: string | null;
  expiresAt: Date;
  note: string | null;
}

export type InvitationRefusal =
  | 'invalid'
  | 'accepted'
  | 'used-by-you'
  | 'used-another-card'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'closed'
  | 'different-address'
  | 'unverified'
  | 'paused';

export type InvitationStanding =
  | { acceptable: true; tier: 'site'; siteRole: InvitableSiteRole }
  /** The name goes to the matching verified account alone. */
  | { acceptable: true; tier: 'workspace'; slug: string; name: string }
  | { acceptable: true; tier: 'card' }
  | { acceptable: false; reason: InvitationRefusal; message: string };

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
      coven: InvitedCoven;
    };

export type CardState = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface LiveCard {
  beta: boolean;
}

export interface MintedCards {
  batchId: string;
  expiresAt: Date;
  tokens: string[];
}

/** Ids and the request's `/api/auth` base, never the token, the address or the link. */
export type SecretLink =
  | { kind: 'verification'; userId: string; authBase: string; next: string | null }
  | { kind: 'reset'; userId: string; authBase: string }
  | { kind: 'lockout'; userId: string; authBase: string; minutes: number }
  | { kind: 'change'; userId: string; authBase: string; next: string | null }
  /** An address invitation's link, coven or admin, on a token its step mints when it sends, so only the newest mailed link works. */
  | { kind: 'invitation'; invitationId: string; origin: string };

/** Ids, a kind and the site origin, never the address or the mail. */
export type AccountNotice =
  | { kind: 'change-requested'; userId: string; origin: string }
  | { kind: 'account-exists'; userId: string; origin: string }
  | { kind: 'password-changed'; userId: string; origin: string; how: 'reset' | 'change' | 'set' }
  | { kind: 'change-completed'; userId: string; origin: string };
