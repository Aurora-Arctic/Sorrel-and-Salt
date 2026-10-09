import Link from 'next/link';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import './index.scss';

// The `/admin` layout's nav: one entry per admin-curated resource, and the
// user list. It renders only inside the guarded layout, so only an admin ever
// sees it (claude-docs/components/admin-nav.md).

// Each href is checked against the built routes (typedRoutes).
const RESOURCES: readonly { href: Route; label: string }[] = [
  { href: '/admin/compendium', label: 'Compendium' },
  { href: '/admin/categories', label: 'Categories' },
  // Each group vocabulary beside the one it organises (M5.6b).
  { href: '/admin/category-groups', label: 'Category groups' },
  { href: '/admin/forms', label: 'Forms' },
  { href: '/admin/form-groups', label: 'Form groups' },
  { href: '/admin/planets', label: 'Planets' },
  { href: '/admin/zodiac-signs', label: 'Zodiac signs' },
  { href: '/admin/deities', label: 'Deities' },
  { href: '/admin/deity-traditions', label: 'Deity traditions' },
  { href: '/admin/users', label: 'Users' },
];

const AdminNav = (): ReactElement => (
  <nav className="admin-nav" aria-label="Admin">
    <ul className="admin-nav__list">
      {RESOURCES.map(({ href, label }) => (
        <li key={href}>
          {/* Every route is built, so typed routes accept each (M5.6b). */}
          <Link href={href}>{label}</Link>
        </li>
      ))}
    </ul>
  </nav>
);

export default AdminNav;
