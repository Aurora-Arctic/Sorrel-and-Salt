import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import type { SectionNavItem } from '../SectionNav/types';
import { adminSections } from './sections';
import { adminTarget } from './target';
import type { AdminNavProps } from './types';

export { default as AdminContents } from './contents';

// The `/admin` layout's nav, in the context row and, on a phone, the bottom bar: every admin page in the
// sections the index shows, People only for an admin. A page is linked at its first tab and current on any
// of its tabs; each section after the first starts a hairline-set group (claude-docs/components/admin-nav.md).
const items = (managesPeople: boolean): readonly SectionNavItem[] =>
  adminSections(managesPeople).flatMap(({ pages }, section) =>
    pages.map(({ label, icon, tabs: [first, ...rest] }, at) => ({
      label,
      icon,
      href: first.href,
      matches: rest.map(({ href }) => href),
      apart: section > 0 && at === 0,
      target: adminTarget(first.href),
    })),
  );

const AdminNav = ({ managesPeople }: AdminNavProps): ReactElement => (
  <SectionNav label="Admin" sections={items(managesPeople)} />
);

export default AdminNav;
