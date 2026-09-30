import AdminNav from '../../components/AdminNav';
import { requireAdminSession } from '../../lib/request-session';
import type { AdminLayoutProps } from './types';

// Every page under `/admin` calls the guard too: a layout does not re-run on
// client-side navigation (claude-docs/auth.md, "The admin guard").
export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminSession();

  return (
    <div className="admin-layout">
      <AdminNav />
      {children}
    </div>
  );
}
