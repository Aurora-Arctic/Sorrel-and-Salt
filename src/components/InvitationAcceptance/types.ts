import type { Route } from 'next';

/** What `/invite/[token]` and `/i/[token]` know of the link for this visitor, read on the server. */
export type InvitationAcceptanceProps =
  /** No session: nothing of the invitation is read until one holds it. `card` for the short card link. */
  | { status: 'signed-out'; signInHref: string; card?: boolean }
  /** The service's reason, in its words; `emailHref` for a matching address not yet verified. `token` is the link's, sent to record the refused open. */
  | { status: 'refused'; message: string; emailHref?: string; token?: string }
  /** This session may accept: what the invitation grants, and where accepting lands. */
  | {
      status: 'acceptable';
      token: string;
      tier: 'site';
      /** The site role accepting grants. */
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
  /** A card admits any verified account: it names no address, coven or batch. */
  | {
      status: 'acceptable';
      token: string;
      tier: 'card';
      landing: Route;
    };
