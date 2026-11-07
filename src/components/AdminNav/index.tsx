import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import type { SectionNavItem } from '../SectionNav/types';
import { adminSections, CURATOR_SECTIONS } from './sections';
import { adminTarget } from './target';
import type { AdminNavProps, AdminSection } from './types';

export { default as AdminContents, CuratorContents } from './contents';

// The `/curator` and `/keepers` navs, in the context row and the phone's bottom bar. A page is linked at its first
// tab and current on any of its tabs (claude-docs/components/admin-nav.md).
const SUPPORT_HREF = '/keepers/support';

const items = (sections: readonly AdminSection[], needsStaff?: number): readonly SectionNavItem[] =>
  sections.flatMap(({ pages }, section) =>
    pages.map(({ label, icon, tabs: [first, ...rest] }, at) => ({
      label,
      count: first.href === SUPPORT_HREF ? needsStaff : undefined,
      icon,
      href: first.href,
      matches: rest.map(({ href }) => href),
      apart: section > 0 && at === 0,
      target: adminTarget(first.href),
    })),
  );

/** The `/curator` nav: every curation page, to a curator and a keeper alike. */
export const CuratorNav = (): ReactElement => (
  <SectionNav label="Curator" sections={items(CURATOR_SECTIONS)} />
);

/** The `/keepers` nav. */
const AdminNav = ({ managesPeople, needsStaff }: AdminNavProps): ReactElement => (
  <SectionNav label="Keepers" sections={items(adminSections(managesPeople), needsStaff)} />
);

export default AdminNav;
