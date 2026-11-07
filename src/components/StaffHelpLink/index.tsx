import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import './index.scss';

// The staff and keeper help pages, which only a curator reads, linked above the Curator and Keepers pages. Drawn
// before the section body, not in it, so a page's skeleton, which covers the whole body, leaves it in view.
const StaffHelpLink = (): ReactElement => (
  <nav aria-label="Staff help" className="staff-help-link">
    <PendingLink href="/help/staff">Staff Help</PendingLink>
  </nav>
);

export default StaffHelpLink;
