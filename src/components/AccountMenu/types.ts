import type { SiteLink } from '../AppShell/types';

export interface AccountMenuProps {
  name: string;
  /**
   * Their address is verified. Until it is, the panel offers Sign Out alone:
   * the account page is not reachable yet (claude-docs/auth/admin-bootstrap.md,
   * "The email page").
   */
  verified: boolean;
  links?: readonly SiteLink[];
  pendingInvitations?: number;
  assignedSupport?: number;
  waitingSupport?: number;
}
