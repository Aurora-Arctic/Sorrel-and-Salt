import type { Route } from 'next';

export type InvitationAcceptanceProps =
  /** No session: nothing of the invitation is read until one holds it. `card` for the short card link. */
  | { status: 'signed-out'; signInHref: string; card?: boolean }
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
      siteRole: 'user' | 'curator' | 'admin';
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
