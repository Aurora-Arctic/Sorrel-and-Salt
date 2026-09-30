import type { ReactElement } from 'react';
import './index.scss';

// The `/admin` layout's nav: one entry per admin-curated resource. It renders
// only inside the guarded layout, so only an admin ever sees it
// (claude-docs/components/admin-nav.md).

const RESOURCES = [
  { href: '/admin/compendium', label: 'Compendium' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/forms', label: 'Forms' },
  { href: '/admin/planets', label: 'Planets' },
  { href: '/admin/zodiac-signs', label: 'Zodiac signs' },
] as const;

const AdminNav = (): ReactElement => (
  <nav className="admin-nav" aria-label="Admin">
    <ul className="admin-nav__list">
      {RESOURCES.map(({ href, label }) => (
        <li key={href}>
          {/* A plain anchor rather than <Link>: typed routes refuse a route
              that is not built yet, and none of these is. */}
          <a href={href}>{label}</a>
        </li>
      ))}
    </ul>
  </nav>
);

export default AdminNav;
