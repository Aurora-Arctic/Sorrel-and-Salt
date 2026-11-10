import type { ProviderId } from '../lib/types';
import type { Part } from './parts/types';

export interface EmailTheme {
  page: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  /** How Backdrop's grey photographs meet this theme's page; baked into the mail's images. */
  ornament: { blend: 'screen' | 'multiply'; opacity: number };
}

export interface BaseEmailProps {
  url: string;
  /** Where images and fonts are served from: the link's own origin unless a preview says otherwise. */
  origin?: string;
  part: Part;
}

export type MessageInput<Props extends BaseEmailProps> = Omit<Props, 'part'> & { to: string };

export type VerifyEmailPurpose = 'sign-up' | 'change';

export interface VerifyEmailProps extends BaseEmailProps {
  purpose?: VerifyEmailPurpose;
  providers: readonly ProviderId[];
}

export interface AdminInvitationProps extends BaseEmailProps {
  siteRole: 'user' | 'curator' | 'admin';
  inviterName: string;
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
}

export interface CovenInvitationProps extends BaseEmailProps {
  inviterName: string;
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
  covenName: string;
  role: 'viewer' | 'member';
}

export interface AccountExistsProps extends BaseEmailProps {
  url: string;
  providers: readonly ProviderId[];
  hasPassword: boolean;
}

export interface ResetPasswordProps extends BaseEmailProps {
  /** Better Auth's reset link, which checks the token and opens `/reset-password` carrying it. */
  url: string;
}

export type PasswordChange = 'reset' | 'change' | 'set';

export interface PasswordChangedProps extends BaseEmailProps {
  url: string;
  how: PasswordChange;
}

export interface PasswordLockedProps extends BaseEmailProps {
  url: string;
  /** How long the lock lasts, in minutes. */
  minutes: number;
  providers?: readonly ProviderId[];
  hasPasskey?: boolean;
}

export interface EmailChangeNoticeProps extends BaseEmailProps {
  stage: 'requested' | 'completed';
  /** The domain of the new address, never the address: this mail goes to a mailbox the new address's owner may not control. */
  newDomain: string;
  at: Date;
}

/** `url` opens that request on their support page; the reply itself is never in the mail. */
export interface SupportReplyNoticeProps extends BaseEmailProps {
  requestSubject: string;
}

export interface SupportStatusProps extends BaseEmailProps {
  requestSubject: string;
  /** True for a sender with no account: `url` is then the support page, which asks for no sign-in. */
  signedOut?: boolean;
  /** With `signedOut`: `url` is the request’s own page behind a mailed link, not the support form. */
  viewLink?: boolean;
}

/** `url` opens the request, or the support page for a signed-out sender. */
export type SupportReceivedProps = SupportStatusProps;
export type SupportResolvedProps = SupportStatusProps;
export interface SupportClosingSoonProps extends SupportStatusProps {
  /** How long until it closes, in milliseconds, as of the send. */
  timeLeftMs: number;
}

/** Told to a signed-out visitor that a reply is waiting. `url` is the request’s page, where it is read; the reply itself is never in the mail. */
export interface SupportEmailReplyProps extends BaseEmailProps {
  requestSubject: string;
  /** `url` is the request’s own page behind a mailed link, not the support form. */
  viewLink?: boolean;
}

export interface SupportTimedOutProps extends BaseEmailProps {
  url: string;
  /** When the time-out ends, or `null` when it has no end date. */
  until: Date | null;
  /** What the admin wrote to the user, or `null` when they wrote none. */
  message: string | null;
}

/** `url` opens the support page, which a paused account can still reach. */
export interface AccessPausedProps extends BaseEmailProps {
  url: string;
  /** When the pause ends, or `null` when it has no end date. */
  until: Date | null;
  /** What the admin wrote to the user, or `null` when they wrote none. */
  message: string | null;
}

export interface CovenAccessPausedProps extends BaseEmailProps {
  url: string;
  covenName: string;
  /** When the pause ends, or `null` when it has no end date. */
  until: Date | null;
  /** What the steward wrote to the member, or `null` when they wrote none. */
  message: string | null;
}

export interface UpdatedDocument {
  title: string;
  summary: string;
  url: string;
}

export interface DocumentUpdatedProps extends BaseEmailProps {
  documents: UpdatedDocument[];
  /** One of the documents is one an account agrees to, so each is asked to agree again at its next visit. */
  asksAgreement: boolean;
}
