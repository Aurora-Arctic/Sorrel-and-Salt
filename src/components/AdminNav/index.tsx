import type { ReactElement } from 'react';
import { SUPPORT_PATH } from '../SupportRequests/href';
import SectionNav from '../SectionNav';
import type { SectionNavItem } from '../SectionNav/types';
import { adminSections, CURATOR_SECTIONS } from './sections';
import type { AdminNavProps, AdminSection } from './types';

export { default as AdminContents, CuratorContents } from './contents';

// The `/curator` and `/keepers` navs, in the context row and the phone's bottom bar. A page is linked at its first
// tab and current on any of its tabs (claude-docs/components/admin-nav.md).
const items = (sections: readonly AdminSection[], needsStaff?: number): readonly SectionNavItem[] =>
  sections.flatMap(({ pages }, section) =>
    pages.map(({ label, icon, tabs: [first, ...rest] }, at) => ({
      label,
      count: first.href === SUPPORT_PATH ? needsStaff : undefined,
      icon,
      href: first.href,
      matches: rest.map(({ href }) => href),
      apart: section > 0 && at === 0,
    })),
  );

export const CuratorNav = (): ReactElement => (
  <SectionNav label="Curator" sections={items(CURATOR_SECTIONS)} />
);

const AdminNav = ({ managesPeople, needsStaff }: AdminNavProps): ReactElement => (
  <SectionNav label="Keepers" sections={items(adminSections(managesPeople), needsStaff)} />
);

export default AdminNav;
