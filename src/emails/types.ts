import type { ProviderId } from '../lib/types';
import type { Part } from './parts/types';

export interface EmailTheme {
  page: string;
  text: string;
  muted: string;
  accent: string;
  /** The label on an accent fill: the page surface, as on the site. */
  onAccent: string;
  /** How Backdrop's grey photographs meet this theme's page; baked into the mail's images. */
  ornament: { blend: 'screen' | 'multiply'; opacity: number };
}

/** What every template takes: the one link the mail carries, and which part is rendering. */
export interface BaseEmailProps {
  /** The link the mail's one action follows. */
  url: string;
  /** Where images and fonts are served from: the link's own origin unless a preview says otherwise. */
  origin?: string;
  part: Part;
}

/** A template's message function's argument: its props bar `part`, and the recipient. */
export type MessageInput<Props extends BaseEmailProps> = Omit<Props, 'part'> & { to: string };

/** A sign-up proving the address it arrived with, or an existing account asking for this one. */
export type VerifyEmailPurpose = 'sign-up' | 'change';

export interface VerifyEmailProps extends BaseEmailProps {
  purpose?: VerifyEmailPurpose;
  /** The providers linked to the account, so the reader can tell whether they signed up at all. */
  providers: readonly ProviderId[];
}

export interface AdminInvitationProps extends BaseEmailProps {
  /** The site role the invitation grants. */
  siteRole: 'curator' | 'admin';
  /** The keeper who sent the invitation. */
  inviterName: string;
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
}

export interface CovenInvitationProps extends BaseEmailProps {
  /** The steward who sent the invitation. */
  inviterName: string;
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
  /** The coven the reader is invited into. */
  covenName: string;
  /** What the reader will be able to do there once they accept. */
  role: 'viewer' | 'member';
}

export interface AccountExistsProps extends BaseEmailProps {
  /** The sign-in page, which the mail's one action opens. */
  url: string;
  /** The providers linked to the account, so the reader knows which one to sign in with. */
  providers: readonly ProviderId[];
  /** Whether the account already has a password. */
  hasPassword: boolean;
}

export interface ResetPasswordProps extends BaseEmailProps {
  /** Better Auth's reset link, which checks the token and opens `/reset-password` carrying it. */
  url: string;
}

/** Which way a password was replaced: by a reset link, by a change on the account page, or set for the first time. */
export type PasswordChange = 'reset' | 'change' | 'set';

export interface PasswordChangedProps extends BaseEmailProps {
  /** `/forgot-password`, which the mail's one action opens for a reader who made no change. */
  url: string;
  how: PasswordChange;
}

export interface PasswordLockedProps extends BaseEmailProps {
  /** Better Auth's reset link, which checks the token and opens `/reset-password` carrying it. */
  url: string;
  /** How long the lock lasts, in minutes. */
  minutes: number;
  /** The providers linked to the account, so the mail names only the ways in it has. */
  providers?: readonly ProviderId[];
  /** Whether the account has a passkey. */
  hasPasskey?: boolean;
}

/** A change of address asked for, or finished, told to the address the account is leaving. */
export interface EmailChangeNoticeProps extends BaseEmailProps {
  stage: 'requested' | 'completed';
  /** The domain of the new address, never the address: this mail goes to a mailbox the new address's owner may not control. */
  newDomain: string;
  /** When the change was asked for, or finished. */
  at: Date;
}

/** Told to a support request's sender that a reply is waiting. `url` opens that request on their support page; the reply itself is never in the mail. */
export interface SupportReplyNoticeProps extends BaseEmailProps {
  /** The subject of the request answered, as its sender wrote it; the template cuts it to length. */
  requestSubject: string;
}

/** What the received, resolved and closing-soon mails take: the request they name, and whether its sender has an account. */
export interface SupportStatusProps extends BaseEmailProps {
  /** The subject of the request, as its sender wrote it; the template cuts it to length. */
  requestSubject: string;
  /** True for a sender with no account: `url` is then the support page, which asks for no sign-in. */
  signedOut?: boolean;
  /** With `signedOut`: `url` is the request’s own page behind a mailed link, not the support form. */
  viewLink?: boolean;
}

/** Told a sender that their support request arrived. `url` opens the request, or the support page for a signed-out sender. */
export type SupportReceivedProps = SupportStatusProps;
/** Told a sender that their support request is resolved. */
export type SupportResolvedProps = SupportStatusProps;
/** Told a sender that their resolved support request is about to close. */
export interface SupportClosingSoonProps extends SupportStatusProps {
  /** How long until it closes, in milliseconds, as of the send. */
  timeLeftMs: number;
}

/** Told to a signed-out visitor that a reply is waiting. `url` is the request’s page, where it is read; the reply itself is never in the mail. */
export interface SupportEmailReplyProps extends BaseEmailProps {
  /** The subject of the request answered, as its sender wrote it; the template cuts it to length. */
  requestSubject: string;
  /** `url` is the request’s own page behind a mailed link, not the support form. */
  viewLink?: boolean;
}

/** Told to a user that a keeper timed them out of support. `url` opens the support page, where their past requests and the time-out notice stay. */
export interface SupportTimedOutProps extends BaseEmailProps {
  url: string;
  /** When the time-out ends, or `null` when it has no end date. */
  until: Date | null;
  /** What the admin wrote to the user, or `null` when they wrote none. */
  message: string | null;
}

/** Told to a user that a keeper paused their site access. `url` opens the support page, which a paused account can still reach. */
export interface AccessPausedProps extends BaseEmailProps {
  url: string;
  /** When the pause ends, or `null` when it has no end date. */
  until: Date | null;
  /** What the admin wrote to the user, or `null` when they wrote none. */
  message: string | null;
}

/** Told to a member that a coven steward paused their access to the coven. */
export interface CovenAccessPausedProps extends BaseEmailProps {
  url: string;
  covenName: string;
  /** When the pause ends, or `null` when it has no end date. */
  until: Date | null;
  /** What the steward wrote to the member, or `null` when they wrote none. */
  message: string | null;
}

/** One document an update mail lists. */
export interface UpdatedDocument {
  /** The document's title, as the page shows it. */
  title: string;
  /** What changed, in the keeper's words. */
  summary: string;
  /** The document's page. */
  url: string;
}

/** Told every account which published documents changed. `url` is the first document's page. */
export interface DocumentUpdatedProps extends BaseEmailProps {
  /** Every document changed since the last mailing, in the order the mail lists them. */
  documents: UpdatedDocument[];
  /** One of the documents is one an account agrees to, so each is asked to agree again at its next visit. */
  asksAgreement: boolean;
}
