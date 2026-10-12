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
  /** Where the images and fonts are served from: the link's own origin unless a preview says otherwise. */
  origin?: string;
  part: Part;
}

/** A template's message function's argument: its props bar `part`, which it renders both of, and the recipient. */
export type MessageInput<Props extends BaseEmailProps> = Omit<Props, 'part'> & { to: string };

/** A sign-up proving the address it arrived with, or an existing account asking for this one. */
export type VerifyEmailPurpose = 'sign-up' | 'change';

export interface VerifyEmailProps extends BaseEmailProps {
  purpose?: VerifyEmailPurpose;
  /** The providers linked to the account, so the reader can tell whether they signed up at all. */
  providers: readonly ProviderId[];
}

export interface AdminInvitationProps extends BaseEmailProps {
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
}
