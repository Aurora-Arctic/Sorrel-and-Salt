import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import type { SectionNavItem } from '../SectionNav/types';
import { adminSections } from './sections';
import { adminTarget } from './target';
import type { AdminNavProps } from './types';

export { default as AdminContents } from './contents';

// The `/admin` layout's nav, in the context row beside the word Admin and, on
// a phone, the bottom bar: every admin page, in the sections the `/admin`
// index's table of contents shows too. It renders only inside the guarded
// layout, so only a curator or an admin ever sees it, and People only an admin
// (claude-docs/components/admin-nav.md).
// A page is linked at its first tab and is current on any of its tabs, so
// Categories is current on its Groups tab's address; the first page of each
// section after the first starts a group, which the row sets apart by a
// hairline.
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
