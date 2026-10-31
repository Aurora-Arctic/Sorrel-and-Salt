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

/** A change of address asked for, or finished, told to the address the account is leaving. */
export interface EmailChangeNoticeProps extends BaseEmailProps {
  stage: 'requested' | 'completed';
  /** The domain of the new address, never the address: this mail goes to a mailbox the new address's owner may not control. */
  newDomain: string;
  /** When the change was asked for, or finished. */
  at: Date;
}

/** Told to a support request's sender that a reply is waiting. `url` is their support page; the reply itself is never in the mail. */
export type SupportReplyNoticeProps = BaseEmailProps;
