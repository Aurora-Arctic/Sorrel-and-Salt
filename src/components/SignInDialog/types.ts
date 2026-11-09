import type { ProviderId } from '../../lib/types';
import type { SignInMode } from '../SignInPanel/types';

export interface SignInDialogProps {
  /** Where signing in returns to: the page the link is on, already run through safeReturnPath. */
  next?: string;
  configured: readonly ProviderId[];
  label: string;
  /** The link's classes; the bar's solid button by default. */
  className?: string;
  /** The mode the dialog opens on; signing in when absent. */
  mode?: SignInMode;
  /** The sentence under the title in each mode; none when absent. */
  ledes?: Partial<Record<SignInMode, string>>;
  /** Passed to SignInPanel: `next` tells a new, unverified account to check its inbox. */
  signUpLandsOnNext?: boolean;
}
