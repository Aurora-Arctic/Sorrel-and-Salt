import type { ReactElement } from 'react';
import NavLinks from './nav-links';
import type { AdminResource } from './types';

// The `/admin` layout's nav: one entry per admin-curated resource, the user
// list and the privilege ledger. It renders only inside the guarded layout, so only an admin ever
// sees it (claude-docs/components/admin-nav.md). The list stays here, on the
// server; only the links, which mark the page you are on, are a client part.

// Each href is checked against the built routes (typedRoutes).
const RESOURCES: readonly AdminResource[] = [
  { href: '/admin/compendium', label: 'Compendium' },
  { href: '/admin/categories', label: 'Categories' },
  // Each group vocabulary beside the one it organises (M5.6b).
  { href: '/admin/category-groups', label: 'Category Groups' },
  { href: '/admin/forms', label: 'Forms' },
  { href: '/admin/form-groups', label: 'Form Groups' },
  { href: '/admin/planets', label: 'Planets' },
  { href: '/admin/zodiac-signs', label: 'Zodiac Signs' },
  { href: '/admin/deities', label: 'Deities' },
  { href: '/admin/deity-traditions', label: 'Deity Traditions' },
  { href: '/admin/users', label: 'Users' },
  // Who holds which privilege, and who changed it (MB.200).
  { href: '/admin/privilege-changes', label: 'Privilege Changes' },
];

const AdminNav = (): ReactElement => (
  <nav aria-label="Admin">
    <NavLinks resources={RESOURCES} />
  </nav>
);

export default AdminNav;
