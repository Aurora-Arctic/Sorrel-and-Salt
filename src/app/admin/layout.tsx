import type { Metadata } from 'next';
import AdminNav from '../../components/AdminNav';
import { requireAdminSession } from '../../lib/request-session';
import type { AdminLayoutProps } from './types';

// Each page under `/admin` gives its own name ('Celestial Bodies') and this template
// finishes it. Next does not apply a layout's template to a page in the same
// segment, so `/admin` itself takes the `default` as its title.
export const metadata: Metadata = {
  title: { template: '%s — Admin — Sorrel & Salt', default: 'Admin — Sorrel & Salt' },
};

// Every page under `/admin` calls the guard too: a layout does not re-run on
// client-side navigation (claude-docs/auth/admin-guard.md, "The admin guard").
export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminSession();

  return (
    <div className="admin-layout">
      <AdminNav />
      {children}
    </div>
  );
}
