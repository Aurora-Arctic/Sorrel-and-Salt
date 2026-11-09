import type { Route } from 'next';
import type { ProviderId } from '../../lib/types';

export type InvitationAcceptanceProps =
  /**
   * No session: nothing of the invitation is read until one holds it. `next` is the link itself; `card` for the short card
   * link; `lead` the choice drawn first and solid, the other following it outlined.
   */
  | {
      status: 'signed-out';
      next: string;
      configured: readonly ProviderId[];
      card?: boolean;
      lead: SignedOutLead;
      /** A verification link was refused on its way back here; never the reason, which the page does not repeat. */
      linkFailed?: boolean;
    }
  /** Signed in with an address not yet verified: the message went to `email`, and its link comes back here. */
  | {
      status: 'unverified';
      emailHref: string;
      /** A verification link was refused on its way back here; never the reason, which the page does not repeat. */
      linkFailed?: boolean;
    }
  | {
      status: 'refused';
      message: string;
      emailHref?: string;
      startCovenHref?: Route;
      token?: string;
    }
  | {
      status: 'acceptable';
      token: string;
      tier: 'site';
      siteRole: 'curator' | 'admin';
      landing: Route;
    }
  | {
      status: 'acceptable';
      token: string;
      tier: 'workspace';
      landing: Route;
      covenName?: string;
    }
  | {
      status: 'acceptable';
      token: string;
      tier: 'card';
      landing: Route;
    };

/** The signed-out choice an invitation leads with. */
export type SignedOutLead = 'sign-up' | 'sign-in';
