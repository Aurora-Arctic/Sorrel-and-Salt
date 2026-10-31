import type { SiteLink } from '../AppShell/types';

export interface AccountMenuProps {
  /** The name the site shows for the viewer: the button's text, and its initials. */
  name: string;
  /**
   * Their address is verified. Until it is, the panel offers Sign Out alone:
   * the account page is not reachable yet (claude-docs/auth/admin-bootstrap.md,
   * "The email page").
   */
  verified: boolean;
  /**
   * The bar's site links, offered here too at a phone's width, where the bar
   * has no room for them (an admin's Your Coven and Admin). Hidden above it.
   */
  links?: readonly SiteLink[];
  /**
   * How many coven invitations wait for their address. Above 0, and verified, the
   * avatar wears a dot, a count beside Your Account links to the Invitations section with a tip below it, and the button says how many to a screen reader. Defaults to 0.
   */
  pendingInvitations?: number;
  /** Open support requests assigned to the viewer, staff only. Above 0 the avatar wears a dot and the Admin row shows the count, linking to those requests. Defaults to 0. */
  assignedSupport?: number;
  /** The viewer's own support requests waiting on them. Above 0 the avatar wears a dot and the Support row shows the count, linking to the list. Defaults to 0. */
  waitingSupport?: number;
}
