import type { ReactElement } from 'react';
import SectionNav from '../SectionNav';
import type { SectionNavItem } from '../SectionNav/types';
import { ADMIN_SECTIONS } from './sections';
import './index.scss';

export { default as AdminContents } from './contents';

// The `/admin` layout's nav, in the context row beside the word Admin and, on
// a phone, the bottom bar: every admin page, in the sections the `/admin`
// index's table of contents shows too. It renders only inside the guarded
// layout, so only an admin ever sees it (claude-docs/components/admin-nav.md).
// A page is linked at its first tab and is current on any of its tabs, so
// Categories is current on its Groups tab's address; the first page of each
// section after the first starts a group, which the row sets apart by a
// hairline.
const items: readonly SectionNavItem[] = ADMIN_SECTIONS.flatMap(({ pages }, section) =>
  pages.map(({ label, icon, tabs: [first, ...rest] }, at) => ({
    label,
    icon,
    href: first.href,
    matches: rest.map(({ href }) => href),
    apart: section > 0 && at === 0,
  })),
);

const AdminNav = (): ReactElement => <SectionNav label="Admin" sections={items} />;

export default AdminNav;
