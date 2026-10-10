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

/** A sign-up proving the address it arrived with, or an existing account asking for this one. */
export type VerifyEmailPurpose = 'sign-up' | 'change';

export interface VerifyEmailProps {
  url: string;
  purpose?: VerifyEmailPurpose;
  /** The providers linked to the account, so the reader can tell whether they signed up at all. */
  providers: readonly ProviderId[];
  /** Where the images and fonts are served from: the link's own origin unless a preview says otherwise. */
  origin?: string;
  part: Part;
}

export interface AdminInvitationProps {
  /** The `/invite/[token]` link, carrying the token no response or row holds. */
  url: string;
  /** Where the images and fonts are served from: the link's own origin unless a preview says otherwise. */
  origin?: string;
  part: Part;
}
