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
  siteRole: 'curator' | 'admin';
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
  url: string;
}

export type PasswordChange = 'reset' | 'change' | 'set';

export interface PasswordChangedProps extends BaseEmailProps {
  url: string;
  how: PasswordChange;
}

export interface PasswordLockedProps extends BaseEmailProps {
  url: string;
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

export type SupportReceivedProps = SupportStatusProps;
export type SupportResolvedProps = SupportStatusProps;
export interface SupportClosingSoonProps extends SupportStatusProps {
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
  until: Date | null;
  message: string | null;
}

export interface AccessPausedProps extends BaseEmailProps {
  url: string;
  until: Date | null;
  message: string | null;
}

export interface CovenAccessPausedProps extends BaseEmailProps {
  url: string;
  covenName: string;
  until: Date | null;
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
