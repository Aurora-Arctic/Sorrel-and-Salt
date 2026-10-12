import type { ReactElement } from 'react';
import NavLinks from './nav-links';
import { ADMIN_SECTIONS } from './sections';
import './index.scss';

export { default as AdminContents } from './contents';

// The `/admin` layout's nav: every admin page, in the sections the `/admin`
// index's table of contents shows too. It renders only inside the guarded
// layout, so only an admin ever sees it (claude-docs/components/admin-nav.md).
// The list stays here, on the server; only the links, which mark the page you
// are on, are a client part.

// A size container, so the phone's disclosure takes over from the row by the
// nav's own width rather than the screen's (index.scss).
const AdminNav = (): ReactElement => (
  <nav aria-label="Admin" className="admin-nav">
    <NavLinks sections={ADMIN_SECTIONS} />
  </nav>
);

export default AdminNav;
