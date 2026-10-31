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
  /** The admin who sent the invitation. */
  inviterName: string;
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
}

export interface CovenInvitationProps extends BaseEmailProps {
  /** The owner who sent the invitation. */
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
