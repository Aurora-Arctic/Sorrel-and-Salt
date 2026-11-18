import type { ReactNode } from 'react';
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
  lead?: AccountMenuLead;
  /** The avatar alone, the name kept for a screen reader: the bar has no room for the name. */
  compact?: boolean;
}

/** A control the bar has no room for, shown as the panel's first item (claude-docs/components/account-menu.md). */
export interface AccountMenuLead {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}
